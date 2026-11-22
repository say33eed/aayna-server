import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { servicesRouter } from "./routes/services.js";
import { adminServicesRouter } from "./routes/admin-services.js";
import { adminOverviewRouter } from "./routes/admin-overview.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { healthRouter } from "./routes/health.js";
import { paymentsRouter, stripeWebhook } from "./routes/payments.js";
import { requireAuth, issueApiToken } from "./middleware/authorize.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Non-browser requests do not include an Origin header.
    if (!origin || env.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed by CORS."));
  },
  credentials: true,
  exposedHeaders: ["ETag"],
}));
// Better Auth must receive the unparsed request before express.json().
app.all("/api/auth/*", toNodeHandler(auth));
app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), stripeWebhook);
app.use("/api/admin/services/image", express.json({ limit: "8mb" }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ success: true, message: "AAYNA API", data: { health: "/health" } });
});
app.use("/health", healthRouter);

// Optional short-lived JWT for API clients; existing browser sessions continue working.
app.post("/api/session/token", requireAuth, (req, res) => {
  res.set("Cache-Control", "no-store").json({ success: true, data: { token: issueApiToken(req.authenticatedUser!.id), expiresIn: 900 } });
});

app.use("/api/services", servicesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/admin/overview", adminOverviewRouter);
app.use("/api/admin/services", adminServicesRouter);
app.use("/api/payments", paymentsRouter);
app.use(notFound);
app.use(errorHandler);
