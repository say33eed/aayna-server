import { Router } from "express";
import { databaseReady } from "../config/database.js";
export const healthRouter = Router();
healthRouter.get("/", async (_req, res) => {
  const database = await databaseReady() ? "connected" : "disconnected";
  res.set("Cache-Control", "no-store").json({ success: true, message: "AAYNA API reachable.", data: { service: "aayna-server", status: "ok", database } });
});
