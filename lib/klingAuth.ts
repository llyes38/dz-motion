/**
 * Kling API authentication: JWT HS256 (Access Key + Secret Key).
 * Usage: server-side only (API routes). Never expose keys to the client.
 *
 * Env: KLING_ACCESS_KEY, KLING_SECRET_KEY
 * Doc: payload iss = Access Key, exp = now + 300s, signed with Secret Key.
 */

import { createHmac } from "crypto";

function base64UrlEncode(data: Uint8Array | string): string {
  const raw =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const b64 = Buffer.from(raw).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build a JWT for Kling API (HS256).
 * - header: { alg: "HS256", typ: "JWT" }
 * - payload: { iss, nbf, exp } (nbf = Not Before, requis par Kling)
 * - signed with KLING_SECRET_KEY
 */
function buildKlingJwt(): string | null {
  const access = process.env.KLING_ACCESS_KEY?.trim();
  const secret = process.env.KLING_SECRET_KEY?.trim();
  if (!access || !secret) return null;

  const header = { alg: "HS256" as const, typ: "JWT" as const };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: access, nbf: now, exp: now + 300 };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", secret).update(message).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${message}.${sigB64}`;
}

/**
 * Returns the Authorization header for Kling API requests.
 * Use in API routes only. Returns null if KLING_ACCESS_KEY or KLING_SECRET_KEY is missing.
 */
export function getKlingAuthHeader(): { Authorization: string } | null {
  const token = buildKlingJwt();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}
