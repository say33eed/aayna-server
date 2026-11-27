import { Router } from "express";
import { databaseReady, ensureBusinessIndexes } from "../config/database.js";
export const healthRouter = Router();
healthRouter.get("/", async (_req, res) => {
  const database = await databaseReady() ? "connected" : "disconnected";
  res.set("Cache-Control", "no-store").json({ success: true, message: "AAYNA API reachable.", data: { service: "aayna-server", status: "ok", database } });
});

healthRouter.get("/ready", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    if (!(await databaseReady())) throw new Error("Database unavailable");
    await ensureBusinessIndexes();
    res.json({ success: true, status: "ready" });
  } catch {
    res.status(503).json({ success: false, status: "not_ready" });
  }
});
