import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
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
}));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ success: true, message: "AAYNA API", data: { health: "/health" } });
});
app.use("/health", healthRouter);

app.use(notFound);
app.use(errorHandler);
