import "dotenv/config";

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "5000");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      "PORT must be an integer between 1 and 65535."
    );
  }

  return port;
}

function parseOrigins(value: string): string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (
    origins.length === 0 ||
    origins.some(
      (origin) => !/^https?:\/\/[^/]+$/.test(origin)
    )
  ) {
    throw new Error(
      "CLIENT_ORIGIN must contain valid HTTP(S) origins separated by commas."
    );
  }

  return [...new Set(origins)];
}

const clientOrigins = parseOrigins(
  process.env.CLIENT_ORIGIN ?? "http://localhost:3000"
);

const mongodbUri = process.env.MONGODB_URI?.trim();

export const env = {
  mongodbUri,

  nodeEnv: process.env.NODE_ENV ?? "development",

  port: parsePort(process.env.PORT),

  clientOrigins,

  auth: {
    secret: process.env.BETTER_AUTH_SECRET?.trim(),

    baseURL: process.env.BETTER_AUTH_URL
      ?.trim()
      .replace(/\/+$/, ""),

    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim(),

    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  },
};

export function isAuthConfigured(): boolean {
  return Boolean(
    env.mongodbUri &&
    env.auth.baseURL &&
    env.auth.secret &&
    env.auth.secret.length >= 32
  );
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    env.auth.googleClientId &&
    env.auth.googleClientSecret
  );
}