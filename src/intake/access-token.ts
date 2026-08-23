import type { D1DatabaseLike } from "../data/d1";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateScanAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return base64Url(bytes);
}

export function isScanAccessToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export async function digestScanAccessToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readBearerToken(request: Request): string | null {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") ?? "");
  return match?.[1] ?? null;
}

export async function authorizeWebAnalysis(
  db: D1DatabaseLike,
  analysisId: string,
  rawToken: string,
): Promise<boolean> {
  if (!isScanAccessToken(rawToken)) return false;
  const digest = await digestScanAccessToken(rawToken);
  const row = await db.prepare(`
    SELECT 1 AS authorized
    FROM scan_requests
    WHERE analysis_id = ? AND access_token_digest = ? AND channel = 'web'
    LIMIT 1
  `).bind(analysisId, digest).first<{ authorized: number }>();
  return row?.authorized === 1;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
