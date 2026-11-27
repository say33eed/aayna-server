import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import { getDatabase } from "../config/database.js";

// Fixed windows shared across instances. Never trust arbitrary forwarded IP headers.
let indexReady: Promise<unknown> | undefined;
export function rateLimit(scope: string, limit: number, seconds: number, perUser = false): RequestHandler {
  return async (req, res, next) => {
    const identity = perUser ? req.authenticatedUser?.id : req.ip;
    if (!identity) { res.status(503).json({ success: false, message: "Request protection unavailable." }); return; }
    try {
      const collection = (await getDatabase()).collection<{ _id: string; count: number; expiresAt: Date }>("api_rate_limits");
      indexReady ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error: unknown) => { indexReady = undefined; throw error; });
      await indexReady;
      const now = Date.now();
      const windowMs = seconds * 1000;
      const end = (Math.floor(now / windowMs) + 1) * windowMs;
      const key = createHash("sha256").update(JSON.stringify([scope, identity, end])).digest("hex");
      const row = await collection.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(end) } }, { upsert: true, returnDocument: "after" });
      if (!row) throw new Error("Rate limit counter unavailable.");
      if (row.count > limit) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((end - Date.now()) / 1000))));
        res.status(429).json({ success: false, message: "Too many requests. Please try again later." }); return;
      }
      next();
    } catch {
      res.status(503).json({ success: false, message: "Request protection temporarily unavailable." });
    }
  };
}
