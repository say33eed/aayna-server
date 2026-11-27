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

function validOrigin(value: string): boolean {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && url.origin === value; } catch { return false; }
}

function parseOrigins(value: string): string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (
    origins.length === 0 ||
    origins.some(
      (origin) => !validOrigin(origin)
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

// Fail closed on unsafe production configuration; never include secret values in errors.
if (env.nodeEnv === "production") {
  if (!isAuthConfigured()) throw new Error("Production authentication configuration is incomplete.");
  if (!env.clientOrigins.every(origin => origin.startsWith("https://"))) throw new Error("Production CLIENT_ORIGIN must use HTTPS.");
  if (!env.auth.baseURL || !validOrigin(env.auth.baseURL) || !env.auth.baseURL.startsWith("https://")) throw new Error("Production BETTER_AUTH_URL must be an HTTPS origin.");
  if (!isGoogleAuthConfigured()) throw new Error("Production Google OAuth configuration is incomplete.");
  if (!process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test_") || !process.env.STRIPE_WEBHOOK_SECRET?.trim().startsWith("whsec_")) throw new Error("Production Stripe test-mode configuration is incomplete.");
  if (!process.env.IMGBB_API_KEY?.trim()) throw new Error("Production image hosting configuration is incomplete.");
}
