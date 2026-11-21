import { Router } from "express";
import { db } from "../config/database.js";
export const healthRouter = Router();
healthRouter.get("/", async (_req, res) => {
  let database = "disconnected";
  try { await db.command({ ping: 1 }, { timeoutMS: 5000 }); database = "connected"; } catch { /* Report actual failure. */ }
  res.set("Cache-Control", "no-store").json({ success: true, message: "AAYNA API reachable.", data: { service: "aayna-server", status: "ok", database } });
});
