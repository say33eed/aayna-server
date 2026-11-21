import "dotenv/config";

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "5000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}

const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (clientOrigins.length === 0 || clientOrigins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin))) {
  throw new Error("CLIENT_ORIGIN must contain valid HTTP(S) origins separated by commas.");
}

const mongodbUri = process.env.MONGODB_URI?.trim();


export const env = {
  mongodbUri,
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  clientOrigins,
};
