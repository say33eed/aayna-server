import { Router } from "express";
import { ObjectId, type Document } from "mongodb";
import { getDatabase } from "../config/database.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

export const adminTransactionsRouter = Router();
adminTransactionsRouter.use(requireAuth, requireRole("admin"));

function serializeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

// Read-only ledger. Payment records are created by verified Stripe webhooks only.
adminTransactionsRouter.get("/", async (req, res) => {
  try {
    const db = await getDatabase();
    const rawPage = Number(req.query.page ?? 1);
    const page = Number.isSafeInteger(rawPage) ? Math.min(100000, Math.max(1, rawPage)) : 1;
    const limit = 20;
    const status = typeof req.query.status === "string" ? req.query.status : "all";
    if (!["all", "paid", "failed"].includes(status)) {
      res.status(400).json({ success: false, message: "Invalid transaction filter." }); return;
    }
    const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const match: Document = status === "all" ? {} : { status };
    if (query) {
      const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(safe, "i");
      const users = await db.collection("user").find({ $or: [{ name: pattern }, { email: pattern }] }, { projection: { _id: 1 } }).limit(100).toArray();
      const services = await db.collection("services").find({ $or: [{ serviceName: pattern }, { name: pattern }] }, { projection: { _id: 1 } }).limit(100).toArray();
      const serviceIds = services.map((service) => String(service._id));
      const relatedAppointments = serviceIds.length ? await db.collection("appointments").find({ serviceId: { $in: serviceIds } }, { projection: { _id: 1 } }).limit(200).toArray() : [];
      match.$or = [
        { stripeSessionId: pattern },
        { customerId: { $in: users.map((user) => String(user._id)) } },
        { appointmentId: { $in: relatedAppointments.map((item) => String(item._id)) } },
      ];
    }
    const transactions = db.collection("transactions");
    const [total, rows] = await Promise.all([
      transactions.countDocuments(match),
      transactions.find(match).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    ]);
    const customerIds = [...new Set(rows.map((item) => item.customerId).filter((id): id is string => typeof id === "string"))];
    const appointmentIds = [...new Set(rows.map((item) => item.appointmentId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const [users, appointments] = await Promise.all([
      db.collection<Document>("user").find({ $or: [{ _id: { $in: customerIds.map((id) => id as unknown as ObjectId) } }, { _id: { $in: customerIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } }] }, { projection: { name: 1, email: 1 } }).toArray(),
      db.collection("appointments").find({ _id: { $in: appointmentIds.map((id) => new ObjectId(id)) } }, { projection: { serviceId: 1, appointmentDate: 1, timeSlot: 1 } }).toArray(),
    ]);
    const userMap = new Map(users.map((item) => [String(item._id), item]));
    const appointmentMap = new Map(appointments.map((item) => [String(item._id), item]));
    const serviceIds = [...new Set(appointments.map((item) => item.serviceId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const services = await db.collection("services").find({ _id: { $in: serviceIds.map((id) => new ObjectId(id)) } }, { projection: { serviceName: 1, name: 1, title: 1 } }).toArray();
    const serviceMap = new Map(services.map((item) => [String(item._id), String(item.serviceName ?? item.name ?? item.title ?? "Service") ]));
    res.set("Cache-Control", "private, no-store").json({ success: true, data: {
      page, limit, total, pages: Math.max(1, Math.ceil(total / limit)),
      rows: rows.map((item) => {
        const customer = userMap.get(String(item.customerId));
        const appointment = appointmentMap.get(String(item.appointmentId));
        return {
          id: String(item._id), customerName: String(customer?.name ?? "Customer"),
          customerEmail: String(customer?.email ?? ""),
          serviceName: appointment ? serviceMap.get(String(appointment.serviceId)) ?? "Service unavailable" : "Service unavailable",
          serviceId: typeof appointment?.serviceId === "string" ? appointment.serviceId : null,
          appointmentId: String(item.appointmentId ?? ""), appointmentDate: String(appointment?.appointmentDate ?? ""),
          appointmentTime: String(appointment?.timeSlot ?? ""),
          amount: typeof item.amount === "number" ? item.amount : 0,
          currency: String(item.currency ?? "bdt").toUpperCase(),
          reference: String(item.stripeSessionId ?? ""),
          status: String(item.status ?? "unknown"), createdAt: serializeDate(item.createdAt),
        };
      }),
    } });
  } catch {
    res.status(503).json({ success: false, message: "Unable to load transactions right now." });
  }
});
