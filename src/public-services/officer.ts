export const OFFICER_COOKIE = "fop_officer_session";
export const OFFICER_SESSION_SECONDS = 60 * 60 * 4;

const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function createOfficerSession(username: string, secret: string, now = Date.now()): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ sub: username, exp: Math.floor(now / 1000) + OFFICER_SESSION_SECONDS })));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyOfficerSession(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra || !constantTimeEqual(supplied, await signature(payload, secret))) return false;
  try {
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    const data = JSON.parse(json) as { exp?: unknown };
    return typeof data.exp === "number" && data.exp > Math.floor(now / 1000);
  } catch { return false; }
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export interface AggregateRow { status: string; language: string; count: number; }
export function redactAggregateRows(rows: readonly Record<string, unknown>[]): AggregateRow[] {
  return rows.flatMap((row) => typeof row.status === "string" && typeof row.language === "string" && typeof row.count === "number" ? [{ status: row.status, language: row.language, count: row.count }] : []);
}
