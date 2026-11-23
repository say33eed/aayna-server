import { Router } from "express";
import { ObjectId, type Document } from "mongodb";
import { getDatabase } from "../config/database.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireRole("admin"));
const cleanId = (id: unknown) => typeof id === "string" && id.length > 0 && id.length <= 128 ? id : null;
type UserDocument = Document & { _id: string | ObjectId };
const queryForId = (id: string) => ({ _id: { $in: [id, ...(ObjectId.isValid(id) && new ObjectId(id).toHexString() === id.toLowerCase() ? [new ObjectId(id)] : [])] } });
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

adminUsersRouter.get("/", async (req, res) => {
  try {
    const db = await getDatabase();
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 80) : "";
    const status = req.query.status === "blocked" ? "blocked" : req.query.status === "active" ? "active" : "all";
    const page = Math.max(1, Math.min(100000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
    const limit = 20;
    const filter: Record<string, unknown> = { $or: [{ role: "customer" }, { role: { $exists: false } }, { role: null }] };
    if (search) filter.$and = [{ $or: [{ name: { $regex: escapeRegex(search), $options: "i" } }, { email: { $regex: escapeRegex(search), $options: "i" } }] }];
    if (status === "blocked") filter.isBlocked = true;
    if (status === "active") filter.isBlocked = { $ne: true };
    const [total, users] = await Promise.all([
      db.collection("user").countDocuments(filter),
      db.collection("user").find(filter, { projection: { name: 1, email: 1, image: 1, phone: 1, createdAt: 1, isBlocked: 1 } }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    ]);
    const ids = users.map((u) => String(u._id));
    const counts = await db.collection("appointments").aggregate<{ _id: string; count: number }>([
      { $match: { customerId: { $in: ids } } }, { $group: { _id: "$customerId", count: { $sum: 1 } } },
    ]).toArray();
    const countById = new Map(counts.map((r) => [String(r._id), r.count]));
    res.set("Cache-Control", "private, no-store").json({ success: true, data: {
      users: users.map((u) => ({ id: String(u._id), name: String(u.name ?? "Customer"), email: String(u.email ?? ""), image: typeof u.image === "string" ? u.image : null, phone: typeof u.phone === "string" ? u.phone : null, joinedAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt ?? ""), isBlocked: u.isBlocked === true, appointmentCount: countById.get(String(u._id)) ?? 0 })),
      total, page, pages: Math.ceil(total / limit),
    } });
  } catch { res.status(503).json({ success: false, message: "Customer directory is temporarily unavailable." }); }
});

adminUsersRouter.get("/:id", async (req, res) => {
  const id = cleanId(req.params.id);
  if (!id) { res.status(400).json({ success: false, message: "Invalid customer reference." }); return; }
  try {
    const db = await getDatabase();
    const user = await db.collection<UserDocument>("user").findOne(queryForId(id), { projection: { name: 1, email: 1, image: 1, phone: 1, role: 1, createdAt: 1, isBlocked: 1, emailVerified: 1 } });
    if (!user || (user.role != null && user.role !== "customer")) { res.status(404).json({ success: false, message: "Customer not found." }); return; }
    const count = await db.collection("appointments").countDocuments({ customerId: String(user._id) });
    res.set("Cache-Control", "private, no-store").json({ success: true, data: { id: String(user._id), name: String(user.name ?? "Customer"), email: String(user.email ?? ""), image: typeof user.image === "string" ? user.image : null, phone: typeof user.phone === "string" ? user.phone : null, joinedAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt ?? ""), isBlocked: user.isBlocked === true, emailVerified: user.emailVerified === true, appointmentCount: count } });
  } catch { res.status(503).json({ success: false, message: "Customer details are temporarily unavailable." }); }
});

adminUsersRouter.patch("/:id/block", async (req, res) => {
  const id = cleanId(req.params.id);
  if (!id || typeof req.body?.isBlocked !== "boolean") { res.status(400).json({ success: false, message: "A valid customer and blocked status are required." }); return; }
  if (id === req.authenticatedUser?.id) { res.status(403).json({ success: false, message: "You cannot restrict your own account." }); return; }
  try {
    const db = await getDatabase();
    const result = await db.collection<UserDocument>("user").findOneAndUpdate({ ...queryForId(id), $or: [{ role: "customer" }, { role: null }, { role: { $exists: false } }] }, { $set: { isBlocked: req.body.isBlocked, updatedAt: new Date() } }, { returnDocument: "after" });
    if (!result) { res.status(404).json({ success: false, message: "Customer not found." }); return; }
    if (req.body.isBlocked) await db.collection("session").deleteMany({ userId: String(result._id) });
    res.set("Cache-Control", "no-store").json({ success: true, data: { id: String(result._id), isBlocked: result.isBlocked === true } });
  } catch { res.status(503).json({ success: false, message: "Unable to update customer access. Please retry." }); }
});
