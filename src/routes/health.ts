import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AAYNA API is healthy.",
    data: { service: "aayna-server", status: "ok" },
  });
});
