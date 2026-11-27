import { docsRouter } from "./docs.js";
import express from "express";
import { journalRouter, adminJournalRouter } from "./routes/journal.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { servicesRouter } from "./routes/services.js";
import { adminServicesRouter } from "./routes/admin-services.js";
import { adminOverviewRouter } from "./routes/admin-overview.js";
import { adminTransactionsRouter } from "./routes/admin-transactions.js";
import { adminUsersRouter } from "./routes/admin-users.js";
import { profileRouter } from "./routes/profile.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { healthRouter } from "./routes/health.js";
import { paymentsRouter, stripeWebhook } from "./routes/payments.js";
import { requireAuth, requireRole, issueApiToken } from "./middleware/authorize.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";

import { rateLimit } from "./middleware/rate-limit.js";

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
// Webhooks bypass application throttling so Stripe retries remain reliable.
app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), stripeWebhook);
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
// The proxy may aggregate clients behind one address; use a generous shared ceiling.
app.use("/api", rateLimit("api", 1200, 60));
app.post("/api/auth/sign-in/email", rateLimit("email-login", 120, 60));
app.post("/api/auth/sign-up/email", rateLimit("email-signup", 60, 60));
// Better Auth must receive the unparsed request before express.json().
app.all("/api/auth/*", toNodeHandler(auth));
app.post("/api/admin/services/image", requireAuth, requireRole("admin"), rateLimit("admin-upload", 60, 3600, true), express.json({ limit: "8mb" }));
app.post("/api/profile/image", requireAuth, rateLimit("profile-upload", 10, 3600, true), express.json({ limit: "5mb" }));
app.use(express.json({ limit: "100kb" }));

app.use(docsRouter);
app.use("/health", healthRouter);

// Optional short-lived JWT for API clients; existing browser sessions continue working.
app.post("/api/session/token", requireAuth, (req, res) => {
  const user = req.authenticatedUser!;
  if (user.viaBearer) { res.status(401).json({ success: false, message: "An authenticated browser session is required to issue a token." }); return; }
  res.set("Cache-Control", "no-store").json({ success: true, data: { token: issueApiToken(user.id, user.sessionId), expiresIn: 900 } });
});

app.use("/api/journal", journalRouter);
app.use("/api/admin/journal", adminJournalRouter);
app.use("/api/services", servicesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/admin/overview", adminOverviewRouter);
app.use("/api/admin/users", adminUsersRouter);
app.use("/api/profile", profileRouter);
app.use("/api/admin/transactions", adminTransactionsRouter);
app.use("/api/admin/services", adminServicesRouter);
app.use("/api/payments", paymentsRouter);
app.use(notFound);
app.use(errorHandler);
