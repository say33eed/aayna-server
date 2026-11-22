import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { requireAuth, requireRole } from "../middleware/authorize.js";
import { getDatabase } from "../config/database.js";
import { env } from "../config/env.js";

export const paymentsRouter = Router();
const currency = "bdt";
const stripe = () => {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key?.startsWith("sk_test_")) throw new Error("Stripe test secret key is not configured.");
  return new Stripe(key);
};

// BDT has two decimal places. Prices are entered in taka, Stripe receives poisha.
function toMinorUnits(price: unknown): number | null {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  const minor = Math.round(price * 100);
  return Number.isSafeInteger(minor) && Math.abs(minor / 100 - price) < 0.000001 ? minor : null;
}

paymentsRouter.post("/checkout/:appointmentId", requireAuth, requireRole("customer"), async (req, res) => {
  const id = req.params.appointmentId;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: "Invalid appointment." }); return;
  }
  try {
    const db = await getDatabase();
    const appointment = await db.collection("appointments").findOne({
      _id: new ObjectId(id), customerId: req.authenticatedUser!.id,
      status: "confirmed", paymentStatus: "unpaid",
    });
    if (!appointment) {
      res.status(409).json({ success: false, message: "Only your confirmed, unpaid appointments can be paid." }); return;
    }
    const unitAmount = toMinorUnits(appointment.servicePrice);
    if (!unitAmount) {
      res.status(422).json({ success: false, message: "Invalid appointment price." }); return;
    }
    const service = typeof appointment.serviceId === "string" && ObjectId.isValid(appointment.serviceId)
      ? await db.collection("services").findOne({ _id: new ObjectId(appointment.serviceId) }, { projection: { serviceName: 1, name: 1, title: 1 } }) : null;
    const serviceName = String(service?.serviceName ?? service?.name ?? service?.title ?? "Aayna salon appointment").slice(0, 120);
    const clientOrigin = env.clientOrigins[0];
    const session = await stripe().checkout.sessions.create({
      mode: "payment", 
      client_reference_id: id,
      metadata: { appointmentId: id, customerId: req.authenticatedUser!.id },
      line_items: [{ price_data: { currency, unit_amount: unitAmount, product_data: { name: serviceName } }, quantity: 1 }],
      success_url: `${clientOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientOrigin}/payment/cancel`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    res.set("Cache-Control", "no-store").json({ success: true, data: { url: session.url } });
  } catch (error) {
    const message = error instanceof Error && /Stripe test secret key/.test(error.message)
      ? "Stripe test mode is not configured." : "Unable to start Stripe Checkout. Check that BDT is enabled in your sandbox.";
    res.status(503).json({ success: false, message });
  }
});

// This route is mounted with express.raw() BEFORE express.json().
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.header("stripe-signature");
  if (!secret || !signature || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ success: false, message: "Missing webhook configuration or signature." }); return;
  }
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(req.body, signature, secret); }
  catch { res.status(400).json({ success: false, message: "Invalid webhook signature." }); return; }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    res.status(200).json({ received: true }); return;
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid" || session.mode !== "payment" || session.currency?.toLowerCase() !== currency) {
    res.status(200).json({ received: true }); return;
  }
  const appointmentId = session.metadata?.appointmentId;
  const customerId = session.metadata?.customerId;
  if (!appointmentId || !ObjectId.isValid(appointmentId) || !customerId || session.client_reference_id !== appointmentId || !session.amount_total) {
    res.status(400).json({ success: false, message: "Invalid payment metadata." }); return;
  }
  try {
    const db = await getDatabase();
    const appointments = db.collection("appointments");
    const appointment = await appointments.findOne({ _id: new ObjectId(appointmentId), customerId });
    if (!appointment || appointment.status !== "confirmed" || toMinorUnits(appointment.servicePrice) !== session.amount_total) {
      res.status(409).json({ success: false, message: "Payment does not match a confirmed appointment." }); return;
    }
    const transactions = db.collection("transactions");
    await transactions.createIndex({ stripeSessionId: 1 }, { unique: true });
    await transactions.updateOne({ stripeSessionId: session.id }, { $setOnInsert: {
      appointmentId, customerId, amount: appointment.servicePrice, currency,
      stripeSessionId: session.id, status: "paid", createdAt: new Date(),
    } }, { upsert: true });
    await appointments.updateOne({ _id: new ObjectId(appointmentId), customerId, status: "confirmed", paymentStatus: "unpaid" }, {
      $set: { paymentStatus: "paid", paidAt: new Date(), updatedAt: new Date() },
    });
    res.status(200).json({ received: true });
  } catch {
    // Non-2xx response lets Stripe retry delivery after a temporary database failure.
    res.status(503).json({ success: false, message: "Webhook processing failed." });
  }
}

// Only the appointment owner can retrieve a receipt for a webhook-verified transaction.
paymentsRouter.get("/receipt/:sessionId", requireAuth, requireRole("customer"), async (req, res) => {
  const sessionId = req.params.sessionId;
  if (typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId) || sessionId.length > 255) {
    res.status(400).json({ success: false, message: "Invalid payment reference." }); return;
  }
  try {
    const db = await getDatabase();
    const customerId = req.authenticatedUser!.id;
    const transaction = await db.collection("transactions").findOne({ stripeSessionId: sessionId, customerId, status: "paid" });
    if (!transaction || typeof transaction.appointmentId !== "string" || !ObjectId.isValid(transaction.appointmentId)) {
      res.status(404).json({ success: false, message: "Verified receipt not available yet." }); return;
    }
    const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(transaction.appointmentId), customerId, paymentStatus: "paid" });
    if (!appointment) { res.status(404).json({ success: false, message: "Verified receipt not available yet." }); return; }
    const service = typeof appointment.serviceId === "string" && ObjectId.isValid(appointment.serviceId)
      ? await db.collection("services").findOne({ _id: new ObjectId(appointment.serviceId) }, { projection: { serviceName: 1, name: 1, title: 1 } }) : null;
    res.set("Cache-Control", "private, no-store").json({ success: true, data: {
      reference: sessionId, appointmentId: String(appointment._id),
      serviceName: String(service?.serviceName ?? service?.name ?? service?.title ?? "Salon appointment"),
      appointmentDate: appointment.appointmentDate, timeSlot: appointment.timeSlot,
      amount: transaction.amount, currency: transaction.currency,
      paidAt: transaction.createdAt instanceof Date ? transaction.createdAt.toISOString() : String(transaction.createdAt ?? ""),
      paymentStatus: "paid",
    } });
  } catch { res.status(503).json({ success: false, message: "Unable to load your receipt right now." }); }
});
