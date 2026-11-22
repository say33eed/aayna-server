import { betterAuth } from "better-auth";
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
    minPasswordLength: 6,
  },
  socialProviders,
  // Frame v015 production fix: allow OAuth state/session cookies to survive
  // the cross-site Vercel -> Render authentication flow.
  // Secure is mandatory when SameSite=None.
  advanced: {
    useSecureCookies: env.nodeEnv === "production",
    defaultCookieAttributes: env.nodeEnv === "production"
      ? { sameSite: "none", secure: true, httpOnly: true }
      : { sameSite: "lax", secure: false, httpOnly: true },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      isBlocked: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
});
