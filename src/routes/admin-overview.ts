import { Router } from "express";
import { getDatabase } from "../config/database.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

export const adminOverviewRouter = Router();
adminOverviewRouter.use(requireAuth, requireRole("admin"));
adminOverviewRouter.get("/", async (_req, res) => {
  try {
    const db = await getDatabase();
    const [customers, activeServices, requests, pending, confirmed, successfulPayments, recent] = await Promise.all([
      db.collection("user").countDocuments({ role: "customer" }),
      db.collection("services").countDocuments({ status: "active" }),
      db.collection("appointments").countDocuments({}),
      db.collection("appointments").countDocuments({ status: "pending" }),
      db.collection("appointments").countDocuments({ status: "confirmed" }),
      db.collection("transactions").countDocuments({ status: "paid" }),
      db.collection("appointments").find({}).sort({ createdAt: -1, _id: -1 }).limit(5).toArray(),
    ]);
    const serviceIds = [...new Set(recent.map((a) => a.serviceId).filter((v): v is string => typeof v === "string"))];
    const { ObjectId } = await import("mongodb");
    const services = await db.collection("services").find({ _id: { $in: serviceIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } }, { projection: { serviceName: 1, name: 1, title: 1 } }).toArray();
    const serviceNames = new Map(services.map((s) => [String(s._id), String(s.serviceName ?? s.name ?? s.title ?? "Service")]));
    res.set("Cache-Control", "private, no-store").json({ success: true, data: {
      customers, activeServices, requests, pending, confirmed, successfulPayments,
      recent: recent.map((a) => ({ id: String(a._id), service: serviceNames.get(String(a.serviceId)) ?? "Service unavailable", date: a.appointmentDate ?? "", time: a.timeSlot ?? "", status: a.status ?? "unknown", paymentStatus: a.paymentStatus ?? "unpaid", createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt ?? "") })),
    } });
  } catch { res.status(503).json({ success: false, message: "Admin overview is temporarily unavailable." }); }
});
