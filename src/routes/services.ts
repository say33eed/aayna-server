import { Router } from "express";
import { createHash } from "node:crypto";
import { getDatabase } from "../config/database.js";
export const servicesRouter = Router();
let pending: Promise<{ body: string; tag: string }> | undefined;
function load() {
  if (pending) return pending;
  pending = (async () => {
    const db = await getDatabase();
    const rows = await db.collection("services").find({ status: "active" }, { projection: { serviceName: 1, category: 1, description: 1, price: 1, duration: 1, image: 1 }, maxTimeMS: 5000 }).sort({ _id: 1 }).toArray();
    const body = JSON.stringify({ success: true, message: "Services loaded.", data: rows.map(row => ({ ...row, _id: String(row._id) })) });
    return { body, tag: '"' + createHash("sha256").update(body).digest("hex") + '"' };
  })().finally(() => { pending = undefined; });
  return pending;
}
servicesRouter.get("/", async (_req, res) => {
  try {
    const { body, tag } = await load();
    res.set({ ETag: tag, "Cache-Control": "private, no-cache" });
    if (_req.fresh) { res.status(304).end(); return; }
    res.type("application/json").send(body);
  } catch {
    res.set("Cache-Control", "no-store").status(503).json({ success: false, message: "Services are temporarily unavailable." });
  }
});
