import { ProfileRepository } from "../data/profile-repository.ts";
import type { D1DatabaseLike } from "../data/d1.ts";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from "../domain/language.ts";

export const BROWSER_PROFILE_COOKIE = "fop_device";
export const BROWSER_PROFILE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function generateBrowserToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

export function isBrowserToken(value: string | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export async function digestBrowserToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parsePreferredLanguage(value: unknown): LanguageCode | null {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? value as LanguageCode
    : null;
}

export async function resolveBrowserProfile(
  db: D1DatabaseLike,
  suppliedToken: string | undefined,
  now = new Date().toISOString(),
): Promise<{ profileId: string; token: string; preferredLanguage: LanguageCode }> {
  const repository = new ProfileRepository(db);
  const token = isBrowserToken(suppliedToken) ? suppliedToken : generateBrowserToken();
  const subjectDigest = await digestBrowserToken(token);
  let profileId = await repository.findProfileIdByIdentity("web_device", subjectDigest);

  if (!profileId) {
    const candidateId = crypto.randomUUID();
    await repository.upsertLanguage(candidateId, DEFAULT_LANGUAGE, now);
    const inserted = await repository.insertIdentity({
      id: crypto.randomUUID(), profileId: candidateId, channel: "web_device", subjectDigest, now,
    });
    profileId = inserted
      ? candidateId
      : await repository.findProfileIdByIdentity("web_device", subjectDigest);
    if (!profileId) throw new Error("Browser profile identity could not be persisted.");
  } else {
    await repository.touchIdentity("web_device", subjectDigest, now);
  }

  const profile = await repository.findById(profileId);
  return { profileId, token, preferredLanguage: profile?.preferredLanguage ?? DEFAULT_LANGUAGE };
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
