import type { Request, RequestHandler } from "express";
import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { auth } from "../auth.js";
import { env } from "../config/env.js";
import { getDatabase } from "../config/database.js";

export type UserRole = "customer" | "admin";
export type AuthenticatedUser = { id: string; role: UserRole; isBlocked: boolean; sessionId: string; viaBearer: boolean };
declare global { namespace Express { interface Request { authenticatedUser?: AuthenticatedUser } } }

// A domain-separated signing key avoids reusing the Better Auth secret directly as a JWT key.
const jwtKey = createHash("sha256").update(`aayna:api-jwt:v1:${env.auth.secret}`).digest();
const issuer = "aayna-api";
const audience = "aayna-api-client";

function requestHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(", "));
  }
  return headers;
}

export function issueApiToken(userId: string, sessionId: string): string {
  return jwt.sign({ sid: sessionId }, jwtKey, { algorithm: "HS256", subject: userId, issuer, audience, expiresIn: "15m" });
}

type Identity = { id: string; sessionId: string; viaBearer: boolean };

export function verifyApiJwt(token: string): Identity | null {
  try {
    const payload = jwt.verify(token, jwtKey, { algorithms: ["HS256"], issuer, audience }) as JwtPayload;
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.sid !== "string" || !payload.sid || typeof payload.exp !== "number") return null;
    return { id: payload.sub, sessionId: payload.sid, viaBearer: true };
  } catch { return null; }
}

async function identify(req: Request): Promise<Identity | null> {
  const authorization = req.headers.authorization;
  if (authorization !== undefined) {
    const match = /^Bearer (\S+)$/i.exec(authorization);
    return match ? verifyApiJwt(match[1]!) : null;
  }
  const session = await auth.api.getSession({ headers: requestHeaders(req) });
  return session?.user?.id && session.session?.id
    ? { id: session.user.id, sessionId: session.session.id, viaBearer: false } : null;
}

function idCandidates(id: string): Array<string | ObjectId> {
  const values: Array<string | ObjectId> = [id];
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id.toLowerCase()) values.push(new ObjectId(id));
  return values;
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const identity = await identify(req);
    if (!identity) { res.status(401).json({ success: false, message: "Please sign in." }); return; }
    const db = await getDatabase();
    const { id, sessionId, viaBearer } = identity;
    if (viaBearer) {
      const active = await db.collection("session").findOne({
        _id: { $in: idCandidates(sessionId) as ObjectId[] },
        userId: { $in: idCandidates(id) },
        expiresAt: { $gt: new Date() },
      }, { projection: { _id: 1 } });
      if (!active) { res.status(401).json({ success: false, message: "Session expired. Please sign in." }); return; }
    }
    // Better Auth uses string IDs; support legacy ObjectId records defensively.
    const candidates: Array<string | ObjectId> = [id];
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id.toLowerCase()) candidates.push(new ObjectId(id));
    const record = await db.collection("user").findOne({ _id: { $in: candidates as ObjectId[] } }, { projection: { role: 1, isBlocked: 1 } });
    if (!record) { res.status(401).json({ success: false, message: "Account not found." }); return; }
    if (record.isBlocked === true) { res.status(403).json({ success: false, message: "Account access is restricted." }); return; }
    const role = record.role === "admin" ? "admin" : record.role === "customer" || record.role == null ? "customer" : null;
    if (!role) { res.status(403).json({ success: false, message: "Invalid account role." }); return; }
    req.authenticatedUser = { id, role, isBlocked: false, sessionId, viaBearer };
    next();
  } catch (error) { next(error); }
};

export function requireRole(role: UserRole): RequestHandler {
  return (req, res, next) => {
    if (!req.authenticatedUser) { res.status(401).json({ success: false, message: "Please sign in." }); return; }
    if (req.authenticatedUser.role !== role) { res.status(403).json({ success: false, message: "Access denied." }); return; }
    next();
  };
}
