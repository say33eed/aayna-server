import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../config/database.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";
import { ensureServiceCategories, listServiceCategories } from "../lib/service-categories.js";

export const adminServicesRouter = Router();
adminServicesRouter.use(requireAuth, requireRole("admin"));
const imageLink = z.string().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}, "Provide a valid public HTTPS image URL.");
const schema = z.object({
  serviceName: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(3000),
  price: z.number().finite().positive().max(10000000),
  duration: z.number().int().positive().max(1440),
  image: imageLink,
  images: z.array(imageLink).min(1).max(10).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
}).strict();
const serialize = (row: Record<string, unknown>) => ({ ...row, _id: String(row._id) });

adminServicesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await (await getDatabase()).collection("services").find({}).sort({ createdAt: -1, _id: -1 }).limit(500).toArray();
    res.set("Cache-Control", "no-store").json({ success: true, data: rows.map(serialize) });
  } catch (error) { next(error); }
});

adminServicesRouter.get("/categories", async (_req, res, next) => {
  try { res.set("Cache-Control", "no-store").json({ success: true, data: await listServiceCategories() }); }
  catch (error) { next(error); }
});

adminServicesRouter.post("/categories", async (req, res, next) => {
  const parsed = z.string().trim().min(2).max(60).regex(/^[\p{L}\p{N}][\p{L}\p{N} &+/,.'()\-]*$/u).safeParse(req.body?.name);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Enter a category name (2–60 characters, letters and numbers)." }); return; }
  try {
    const name = parsed.data.replace(/\s+/g, " ");
    const db = await getDatabase();
    await ensureServiceCategories();
    const existing = (await listServiceCategories()).find((item) => item.toLocaleLowerCase("en") === name.toLocaleLowerCase("en"));
    if (existing) { res.json({ success: true, data: { name: existing, created: false } }); return; }
    await db.collection("serviceCategories").updateOne({ key: name.toLocaleLowerCase("en") },
      { $setOnInsert: { key: name.toLocaleLowerCase("en"), name, isDefault: false, order: 1000, createdAt: new Date() } }, { upsert: true });
    res.status(201).json({ success: true, data: { name, created: true } });
  } catch (error) { next(error); }
});

adminServicesRouter.post("/image", async (req, res, next) => {
  try {
    const key = process.env.IMGBB_API_KEY?.trim();
    if (!key) { res.status(503).json({ success: false, message: "Image hosting is not configured. Set IMGBB_API_KEY on the server." }); return; }
    const { image, mime } = req.body ?? {};
    if (typeof image !== "string" || typeof mime !== "string" || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      res.status(400).json({ success: false, message: "Upload a valid JPEG, PNG, WebP, or GIF image." }); return;
    }
    const buffer = Buffer.from(image, "base64");
    if (!buffer.length || buffer.length > 5 * 1024 * 1024 || buffer.toString("base64").replace(/=+$/, "") !== image.replace(/=+$/, "")) {
      res.status(400).json({ success: false, message: "Image must be 5 MB or smaller." }); return;
    }
    const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const gif = buffer.subarray(0, 6).toString("ascii").startsWith("GIF8");
    const webp = buffer.subarray(0,4).toString() === "RIFF" && buffer.subarray(8,12).toString() === "WEBP";
    if (!((mime === "image/jpeg" && jpg) || (mime === "image/png" && png) || (mime === "image/gif" && gif) || (mime === "image/webp" && webp))) {
      res.status(400).json({ success: false, message: "File contents do not match the selected image type." }); return;
    }
    const form = new URLSearchParams({ image });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: form, signal: controller.signal });
      const result = await response.json() as { success?: boolean; data?: { url?: string; display_url?: string } };
      const url = result.data?.url || result.data?.display_url;
      if (!response.ok || !result.success || !url || new URL(url).hostname !== "i.ibb.co") throw new Error("Image host rejected upload.");
      res.json({ success: true, data: { url } });
    } finally { clearTimeout(timeout); }
  } catch (error) { next(error); }
});

adminServicesRouter.post("/", async (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Check all service fields, price, duration, and uploaded image.", issues: parsed.error.issues }); return; }
  if (parsed.data.images && (!parsed.data.images.includes(parsed.data.image) || new Set(parsed.data.images).size !== parsed.data.images.length)) { res.status(400).json({ success: false, message: "Cover image must be in the gallery; duplicate images are not allowed." }); return; }
  try {
    const now = new Date();
    const result = await (await getDatabase()).collection("services").insertOne({ ...parsed.data, createdAt: now, updatedAt: now });
    res.status(201).json({ success: true, message: "Service created.", data: { id: String(result.insertedId) } });
  } catch (error) { next(error); }
});

adminServicesRouter.patch("/:id", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) { res.status(400).json({ success: false, message: "Invalid service ID." }); return; }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Check service fields and uploaded image." }); return; }
  if (parsed.data.images && (!parsed.data.images.includes(parsed.data.image) || new Set(parsed.data.images).size !== parsed.data.images.length)) { res.status(400).json({ success: false, message: "Cover image must be in the gallery; duplicate images are not allowed." }); return; }
  try {
    const result = await (await getDatabase()).collection("services").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { ...parsed.data, updatedAt: new Date() } });
    if (!result.matchedCount) { res.status(404).json({ success: false, message: "Service not found." }); return; }
    res.json({ success: true, message: "Service updated." });
  } catch (error) { next(error); }
});

adminServicesRouter.patch("/:id/status", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.id) || !["active", "inactive"].includes(req.body?.status)) { res.status(400).json({ success: false, message: "Invalid status request." }); return; }
  try {
    const result = await (await getDatabase()).collection("services").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: req.body.status, updatedAt: new Date() } });
    if (!result.matchedCount) { res.status(404).json({ success: false, message: "Service not found." }); return; }
    res.json({ success: true, message: "Service visibility updated." });
  } catch (error) { next(error); }
});

adminServicesRouter.delete("/:id", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) { res.status(400).json({ success: false, message: "Invalid service ID." }); return; }
  try {
    const db = await getDatabase();
    const inUse = await db.collection("appointments").findOne({ serviceId: req.params.id });
    if (inUse) { res.status(409).json({ success: false, message: "This service has appointment history. Deactivate it instead to preserve records." }); return; }
    const result = await db.collection("services").deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) { res.status(404).json({ success: false, message: "Service not found." }); return; }
    res.json({ success: true, message: "Service deleted." });
  } catch (error) { next(error); }
});
