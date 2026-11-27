import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) { _next(error); return; }
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status === 413 || status === 400) {
    res.status(status).json({ success: false, message: status === 413 ? "Request body is too large." : "Invalid request body." }); return;
  }
  console.error("Unhandled request error");
  res.status(500).json({ success: false, message: "Internal server error." });
};
