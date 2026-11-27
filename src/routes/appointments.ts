import { Router } from "express";
import { ObjectId, MongoServerError } from "mongodb";
import { requireAuth, requireRole } from "../middleware/authorize.js";
import { getDatabase, ensureBusinessIndexes } from "../config/database.js";

import { rateLimit } from "../middleware/rate-limit.js";

export const appointmentsRouter = Router();
export const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: unknown): value is string => typeof value === "string" && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const dhakaNow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
};
const isFutureOrToday = (value: string) => value >= dhakaNow().slice(0, 10);
const isUpcomingSlot = (date: string, time: string) => `${date} ${time}` > dhakaNow();

appointmentsRouter.get("/slots", async (req, res) => {
  const serviceId = req.query.serviceId;
  const date = req.query.date;
  if (typeof serviceId !== "string" || !ObjectId.isValid(serviceId) || !validDate(date)) {
    res.status(400).json({ success: false, message: "Select a valid service and date." }); return;
  }
  if (!isFutureOrToday(date)) { res.status(400).json({ success: false, message: "Choose today or a future date." }); return; }
  try {
    const db = await getDatabase();
    const service = await db.collection("services").findOne({ _id: new ObjectId(serviceId), status: "active" }, { projection: { _id: 1 } });
    if (!service) { res.status(404).json({ success: false, message: "Service is unavailable." }); return; }
    const taken = await db.collection("appointments").find({ serviceId: String(service._id), appointmentDate: date, status: "confirmed" }, { projection: { timeSlot: 1 } }).toArray();
    const occupied = new Set(taken.map((row) => row.timeSlot));
    res.set("Cache-Control", "no-store").json({ success: true, data: TIME_SLOTS.map((time) => ({ time, available: !occupied.has(time) && isUpcomingSlot(date, time) })) });
  } catch { res.status(503).json({ success: false, message: "Unable to load time slots." }); }
});

// Customer overview: scoped on the server to the authenticated account.
appointmentsRouter.get("/my-summary", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const db = await getDatabase();
    const customerId = req.authenticatedUser!.id;
    const rows = await db.collection("appointments").aggregate<{ _id: string; count: number }>([
      { $match: { customerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();
    const counts = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
    for (const row of rows) {
      counts.total += row.count;
      if (row._id === "pending" || row._id === "confirmed" || row._id === "cancelled") {
        counts[row._id] += row.count;
      }
    }
    res.set("Cache-Control", "private, no-store").json({ success: true, data: counts });
  } catch {
    res.status(503).json({ success: false, message: "Unable to load appointment statistics." });
  }
});

// Customer appointment history: the identity is taken from the verified session, never the query.
appointmentsRouter.get("/mine", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const db = await getDatabase();
    const customerId = req.authenticatedUser!.id;
    const records = await db.collection("appointments").find({ customerId })
      .sort({ createdAt: -1, _id: -1 }).limit(200).toArray();
    const ids = [...new Set(records.map((row) => row.serviceId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const services = ids.length ? await db.collection("services").find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { serviceName: 1, name: 1, title: 1, category: 1, image: 1, imageUrl: 1, images: 1 } }).toArray() : [];
    const serviceMap = new Map(services.map((service) => [String(service._id), service]));
    const data = records.map((row) => {
      const service = serviceMap.get(String(row.serviceId));
      const image = typeof service?.imageUrl === "string" ? service.imageUrl : typeof service?.image === "string" ? service.image : Array.isArray(service?.images) && typeof service.images[0] === "string" ? service.images[0] : null;
      return {
        id: String(row._id), serviceId: typeof row.serviceId === "string" ? row.serviceId : "", serviceName: typeof service?.serviceName === "string" ? service.serviceName : typeof service?.name === "string" ? service.name : typeof service?.title === "string" ? service.title : "Service no longer listed",
        serviceCategory: typeof service?.category === "string" ? service.category : "Uncategorized", serviceImage: image,
        appointmentDate: row.appointmentDate, timeSlot: row.timeSlot, servicePrice: row.servicePrice,
        status: row.status, paymentStatus: row.paymentStatus,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ""),
        message: typeof row.message === "string" ? row.message : "",
      };
    });
    res.set("Cache-Control", "private, no-store").json({ success: true, data });
  } catch {
    res.status(503).json({ success: false, message: "Unable to load your appointments." });
  }
});

// Cancellation is an atomic, customer-owned pending -> cancelled transition.
// Unsetting slotKey releases the unique slot reservation for future bookings.
appointmentsRouter.patch("/:id/cancel", requireAuth, requireRole("customer"), async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: "Invalid appointment ID." }); return;
  }
  try {
    const db = await getDatabase();
    const appointments = db.collection("appointments");
    const result = await appointments.updateOne(
      { _id: new ObjectId(id), customerId: req.authenticatedUser!.id, status: "pending", paymentStatus: "unpaid" },
      { $set: { status: "cancelled", updatedAt: new Date() }, $unset: { slotKey: "" } },
    );
    if (result.modifiedCount === 1) {
      res.set("Cache-Control", "no-store").json({ success: true, message: "Appointment cancelled." }); return;
    }
    // Avoid disclosing other customers' appointments.
    const own = await appointments.findOne({ _id: new ObjectId(id), customerId: req.authenticatedUser!.id }, { projection: { status: 1 } });
    res.status(own ? 409 : 404).json({ success: false, message: own ? "Only pending, unpaid appointments can be cancelled." : "Appointment not found." });
  } catch {
    res.status(503).json({ success: false, message: "Unable to cancel appointment right now." });
  }
});

// Admin-only appointment management. Status transitions are atomic and payment state is immutable here.
appointmentsRouter.get("/admin/all", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const db = await getDatabase();
    const records = await db.collection("appointments").find({}).sort({ createdAt: -1, _id: -1 }).limit(500).toArray();
    const serviceIds = [...new Set(records.map(r => r.serviceId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const customerIds = [...new Set(records.map(r => r.customerId).filter((id): id is string => typeof id === "string"))];
    const services = serviceIds.length ? await db.collection("services").find({ _id: { $in: serviceIds.map(id => new ObjectId(id)) } }, { projection: { serviceName: 1, name: 1, title: 1, category: 1 } }).toArray() : [];
    const customerKeys = customerIds.flatMap(id => ObjectId.isValid(id) && String(new ObjectId(id)) === id.toLowerCase() ? [id, new ObjectId(id)] : [id]);
    const customers = customerKeys.length ? await db.collection("user").find({ _id: { $in: customerKeys as ObjectId[] } }, { projection: { name: 1, email: 1 } }).toArray() : [];
    const serviceMap = new Map(services.map(r => [String(r._id), r]));
    const customerMap = new Map(customers.map(r => [String(r._id), r]));
    const data = records.map(r => {
      const service = serviceMap.get(String(r.serviceId)); const customer = customerMap.get(String(r.customerId));
      return { id: String(r._id), serviceId: typeof r.serviceId === "string" ? r.serviceId : "", customerName: typeof customer?.name === "string" ? customer.name : "Customer", customerEmail: typeof customer?.email === "string" ? customer.email : "", serviceName: typeof service?.serviceName === "string" ? service.serviceName : typeof service?.name === "string" ? service.name : typeof service?.title === "string" ? service.title : "Service no longer listed", category: typeof service?.category === "string" ? service.category : "", appointmentDate: r.appointmentDate, timeSlot: r.timeSlot, servicePrice: r.servicePrice, status: r.status, paymentStatus: r.paymentStatus, message: typeof r.message === "string" ? r.message : "", createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? "") };
    });
    res.set("Cache-Control", "private, no-store").json({ success: true, data });
  } catch { res.status(503).json({ success: false, message: "Unable to load appointments." }); }
});

appointmentsRouter.patch("/admin/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const id = req.params.id; const action = req.body?.action;
  if (typeof id !== "string" || !ObjectId.isValid(id) || (action !== "confirm" && action !== "cancel")) {
    res.status(400).json({ success: false, message: "Invalid appointment or action." }); return;
  }
  try {
    const appointments = (await getDatabase()).collection("appointments");
    const key = new ObjectId(id);
    const now = new Date();
    const current = await appointments.findOne({ _id: key }, { projection: { status: 1, paymentStatus: 1, checkoutExpiresAt: 1 } });
    if (!current) { res.status(404).json({ success: false, message: "Appointment not found." }); return; }
    if (action === "confirm") {
      // Index the actual confirmed slot, including legacy records without slotKey.
      // Existing duplicate confirmations must be reconciled before this index can be created.
      await ensureBusinessIndexes();
      await appointments.updateMany({ status: "pending", slotKey: { $exists: true } }, { $unset: { slotKey: "" } });
      const requested = await appointments.findOne({ _id: key, status: "pending" }, { projection: { serviceId: 1, appointmentDate: 1, timeSlot: 1 } });
      if (!requested) { res.status(409).json({ success: false, message: "Only pending appointments can be confirmed." }); return; }
      if (!validDate(requested.appointmentDate) || !TIME_SLOTS.includes(requested.timeSlot) || !isUpcomingSlot(requested.appointmentDate, requested.timeSlot)) { res.status(409).json({ success: false, message: "This appointment time has passed or is invalid." }); return; }
      const slotKey = `${requested.serviceId}:${requested.appointmentDate}:${requested.timeSlot}`;
      try {
        const result = await appointments.updateOne({ _id: key, status: "pending" }, { $set: { status: "confirmed", slotKey, updatedAt: now } });
        res.status(result.modifiedCount ? 200 : 409).json({ success: Boolean(result.modifiedCount), message: result.modifiedCount ? "Appointment confirmed." : "Appointment changed. Please refresh." }); return;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) { res.status(409).json({ success: false, message: "Another appointment is already confirmed for this service, date and time." }); return; }
        throw error;
      }
    }
    if (current.status !== "pending" && current.status !== "confirmed") {
      res.status(409).json({ success: false, message: "This appointment is already cancelled." }); return;
    }
    if (current.paymentStatus === "paid") {
      // Admin cancellation does NOT refund money. Preserve the paid state and flag review.
      // Payment state is still written exclusively by the verified Stripe webhook.
      const result = await appointments.updateOne(
        { _id: key, status: { $in: ["pending", "confirmed"] }, paymentStatus: "paid" },
        { $set: { status: "cancelled", refundStatus: "review_required", updatedAt: now }, $unset: { slotKey: "" } },
      );
      if (!result.modifiedCount) { res.status(409).json({ success: false, message: "Appointment changed; refresh and try again." }); return; }
      res.set("Cache-Control", "no-store").json({ success: true, message: "Paid appointment cancelled. Payment remains paid; refund review is required.", data: { refundReviewRequired: true } }); return;
    }
    if (current.paymentStatus !== "unpaid") {
      res.status(409).json({ success: false, message: "Payment status needs review before cancellation." }); return;
    }
    // A live checkout session may complete before its webhook arrives: never cancel it.
    const filter = { _id: key, status: { $in: ["pending", "confirmed"] }, paymentStatus: "unpaid", $or: [
      { checkoutExpiresAt: { $exists: false } }, { checkoutExpiresAt: { $lte: now } },
    ] };
    const result = await appointments.updateOne(filter, { $set: { status: "cancelled", updatedAt: now }, $unset: { slotKey: "" } });
    if (result.modifiedCount) { res.set("Cache-Control", "no-store").json({ success: true, message: "Appointment cancelled." }); return; }
    res.status(409).json({ success: false, message: "Checkout may still be processing. Wait for Stripe webhook confirmation before cancelling." });
  } catch { res.status(503).json({ success: false, message: "Unable to update appointment." }); }
});

appointmentsRouter.post("/", requireAuth, requireRole("customer"), rateLimit("booking", 20, 3600, true), async (req, res) => {
  try {
    const user = req.authenticatedUser!;
    const { serviceId, appointmentDate, timeSlot, message } = req.body ?? {};
    if (typeof serviceId !== "string" || !ObjectId.isValid(serviceId) || !validDate(appointmentDate) || !isFutureOrToday(appointmentDate) || !TIME_SLOTS.includes(timeSlot) || !isUpcomingSlot(appointmentDate, timeSlot)) {
      res.status(400).json({ success: false, message: "Select a valid service, future date, and time slot." }); return;
    }
    if (message !== undefined && (typeof message !== "string" || message.length > 500)) {
      res.status(400).json({ success: false, message: "Message must be 500 characters or fewer." }); return;
    }
    const db = await getDatabase();
    const service = await db.collection("services").findOne({ _id: new ObjectId(serviceId), status: "active" });
    if (!service) { res.status(404).json({ success: false, message: "This service is no longer available." }); return; }
    if (typeof service.price !== "number" || !Number.isFinite(service.price) || service.price < 0) { res.status(422).json({ success: false, message: "Service price is invalid." }); return; }
    const appointments = db.collection("appointments");
    const canonicalServiceId = String(service._id);
    if (await appointments.findOne({ serviceId: canonicalServiceId, appointmentDate, timeSlot, status: "confirmed" }, { projection: { _id: 1 } })) { res.status(409).json({ success: false, message: "This slot is already confirmed." }); return; }
    const record = {
      serviceId: canonicalServiceId, customerId: user.id, appointmentDate, timeSlot,
      message: typeof message === "string" ? message.trim() : "",
      servicePrice: service.price, paymentStatus: "unpaid", status: "pending",
      createdAt: new Date(),
    };
    const result = await appointments.insertOne(record);
    res.status(201).json({ success: true, message: "Appointment request submitted.", data: { id: String(result.insertedId), status: "pending", paymentStatus: "unpaid" } });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) { res.status(409).json({ success: false, message: "This time slot has just been booked. Choose another." }); return; }
    res.status(503).json({ success: false, message: "Unable to submit appointment right now." });
  }
});
