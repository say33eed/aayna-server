import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getMongoClient } from "./config/database.js";
import { env, isAuthConfigured, isGoogleAuthConfigured } from "./config/env.js";

if (!isAuthConfigured()) {
  throw new Error("Authentication requires MONGODB_URI, BETTER_AUTH_URL and BETTER_AUTH_SECRET (32+ characters).");
}

const socialProviders = isGoogleAuthConfigured()
  ? { google: { clientId: env.auth.googleClientId!, clientSecret: env.auth.googleClientSecret! } }
  : {};

export const auth = betterAuth({
  baseURL: env.auth.baseURL!,
  secret: env.auth.secret!,
  trustedOrigins: env.clientOrigins,
  database: mongodbAdapter(getMongoClient().db("aayna")),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const field = ctx.path === "/sign-up/email" ? "password" :
        ["/change-password", "/reset-password", "/set-password"].includes(ctx.path) ? "newPassword" : null;
      if (!field) return;
      const password = ctx.body?.[field];
      if (typeof password !== "string" || password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
        throw new APIError("BAD_REQUEST", { message: "Use at least 12 characters with uppercase and lowercase letters." });
      }
    }),
  },
  socialProviders,
  // Auth is exposed via the Vercel same-origin proxy. OAuth callbacks and
  // cookies are scoped to the frontend, so cross-site SameSite=None is unnecessary.
  advanced: {
    useSecureCookies: env.nodeEnv === "production",
    defaultCookieAttributes: env.nodeEnv === "production"
      ? { sameSite: "lax", secure: true, httpOnly: true }
      : { sameSite: "lax", secure: false, httpOnly: true },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      isBlocked: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
});
