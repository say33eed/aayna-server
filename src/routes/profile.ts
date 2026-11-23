import { Router } from "express";
import { ObjectId, type Document } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../config/database.js";
import { requireAuth } from "../middleware/authorize.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);
type UserRecord = Document & { _id: string | ObjectId };
const ids = (id: string) => [id, ...(ObjectId.isValid(id) && new ObjectId(id).toHexString() === id.toLowerCase() ? [new ObjectId(id)] : [])];
const imageSchema = z.string().max(2048).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname); }
  catch { return false; }
}, "Use a public HTTPS image URL.");
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(25).refine((value) => !value || /^\+?[0-9 ()-]{7,25}$/.test(value), "Enter a valid phone number."),
  image: imageSchema,
}).strict();
const publicProfile = (user: UserRecord) => ({ id: String(user._id), name: String(user.name ?? ""), email: String(user.email ?? ""), image: typeof user.image === "string" ? user.image : "", phone: typeof user.phone === "string" ? user.phone : "", role: user.role === "admin" ? "admin" : "customer", emailVerified: user.emailVerified === true });

profileRouter.get("/me", async (req, res, next) => {
  try {
    const db = await getDatabase();
    const user = await db.collection<UserRecord>("user").findOne({ _id: { $in: ids(req.authenticatedUser!.id) } });
    if (!user) { res.status(404).json({ success: false, message: "Profile not found." }); return; }
    res.set("Cache-Control", "private, no-store").json({ success: true, data: publicProfile(user) });
  } catch (error) { next(error); }
});

profileRouter.patch("/me", async (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Invalid profile details." }); return; }
  try {
    const db = await getDatabase();
    const updated = await db.collection<UserRecord>("user").findOneAndUpdate(
      { _id: { $in: ids(req.authenticatedUser!.id) } },
      { $set: { name: parsed.data.name, phone: parsed.data.phone, image: parsed.data.image || null, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) { res.status(404).json({ success: false, message: "Profile not found." }); return; }
    res.set("Cache-Control", "private, no-store").json({ success: true, message: "Profile updated.", data: publicProfile(updated) });
  } catch (error) { next(error); }
});

profileRouter.post("/image", async (req, res, next) => {
  try {
    const key = process.env.IMGBB_API_KEY?.trim();
    if (!key) { res.status(503).json({ success: false, message: "Image hosting is not configured. Use an HTTPS image URL instead." }); return; }
    const { image, mime } = req.body ?? {};
    if (typeof image !== "string" || typeof mime !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      res.status(400).json({ success: false, message: "Choose a JPEG, PNG, or WebP image." }); return;
    }
    const buffer = Buffer.from(image, "base64");
    if (!buffer.length || buffer.length > 3 * 1024 * 1024 || buffer.toString("base64").replace(/=+$/, "") !== image.replace(/=+$/, "")) {
      res.status(400).json({ success: false, message: "Image must be 3 MB or smaller." }); return;
    }
    const valid = (mime === "image/jpeg" && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) ||
      (mime === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
      (mime === "image/webp" && buffer.subarray(0,4).toString() === "RIFF" && buffer.subarray(8,12).toString() === "WEBP");
    if (!valid) { res.status(400).json({ success: false, message: "File contents do not match the selected format." }); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: new URLSearchParams({ image }), signal: controller.signal });
      const result = await response.json() as { success?: boolean; data?: { url?: string } };
      const url = result.data?.url;
      if (!response.ok || !result.success || !url || new URL(url).hostname !== "i.ibb.co") throw new Error("Image host rejected upload.");
      res.set("Cache-Control", "no-store").json({ success: true, data: { url } });
    } finally { clearTimeout(timeout); }
  } catch (error) { next(error); }
});
