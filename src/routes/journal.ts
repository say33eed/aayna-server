import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDatabase } from "../config/database.js";
import { requireAuth, requireRole } from "../middleware/authorize.js";

export const journalRouter = Router();
export const adminJournalRouter = Router();
adminJournalRouter.use(requireAuth, requireRole("admin"));
const categories = ["Hair Care", "Skin Care", "Nail Care", "Wellness"] as const;
const image = z.string().url().max(2048).refine(v => { try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } });
const articleSchema = z.object({ title: z.string().trim().min(5).max(120), excerpt: z.string().trim().min(15).max(240), body: z.string().trim().min(80).max(12000), category: z.enum(categories), image, published: z.boolean(), featured: z.boolean() }).strict();
const serialize = (row: Record<string, unknown>) => ({ ...row, _id: String(row._id) });
const slugify = (title: string) => title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 75);

journalRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 12));
    const rows = await (await getDatabase()).collection("journalArticles").find({ published: true }).sort({ featured: -1, publishedAt: -1, createdAt: -1 }).limit(limit).toArray();
    res.set("Cache-Control", "public, max-age=60").json({ success: true, data: rows.map(serialize) });
  } catch (e) { next(e); }
});
journalRouter.get("/:slug", async (req, res, next) => {
  try {
    const row = await (await getDatabase()).collection("journalArticles").findOne({ slug: req.params.slug, published: true });
    if (!row) { res.status(404).json({ success: false, message: "Article not found." }); return; }
    res.json({ success: true, data: serialize(row) });
  } catch (e) { next(e); }
});
adminJournalRouter.get("/", async (_req, res, next) => {
  try { const rows = await (await getDatabase()).collection("journalArticles").find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(200).toArray(); res.set("Cache-Control", "no-store").json({ success: true, data: rows.map(serialize) }); }
  catch (e) { next(e); }
});
adminJournalRouter.post("/", async (req, res, next) => {
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Check the article fields and image URL." }); return; }
  try {
    const db = await getDatabase(); const now = new Date(); const slug = `${slugify(parsed.data.title) || "self-care"}-${new ObjectId().toHexString().slice(-8)}`;
    const row = { ...parsed.data, slug, createdAt: now, updatedAt: now, publishedAt: parsed.data.published ? now : null };
    const result = await db.collection("journalArticles").insertOne(row);
    res.status(201).json({ success: true, data: { ...row, _id: String(result.insertedId) } });
  } catch (e) { next(e); }
});
adminJournalRouter.patch("/:id", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) { res.status(400).json({ success: false, message: "Invalid article ID." }); return; }
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Check the article fields and image URL." }); return; }
  try {
    const db = await getDatabase(); const id = new ObjectId(req.params.id);
    const old = await db.collection("journalArticles").findOne({ _id: id });
    if (!old) { res.status(404).json({ success: false, message: "Article not found." }); return; }
    await db.collection("journalArticles").updateOne({ _id: id }, { $set: { ...parsed.data, updatedAt: new Date(), publishedAt: parsed.data.published ? (old.publishedAt || new Date()) : null } });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
});
adminJournalRouter.delete("/:id", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) { res.status(400).json({ success: false, message: "Invalid article ID." }); return; }
  try { const result = await (await getDatabase()).collection("journalArticles").deleteOne({ _id: new ObjectId(req.params.id) }); if (!result.deletedCount) { res.status(404).json({ success: false, message: "Article not found." }); return; } res.json({ success: true }); }
  catch (e) { next(e); }
});
