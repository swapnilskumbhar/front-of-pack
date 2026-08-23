import { NextRequest, NextResponse } from "next/server";
import { ProfileRepository } from "@/data/profile-repository";
import { getIntakeBindings } from "@/intake";
import {
  BROWSER_PROFILE_COOKIE,
  BROWSER_PROFILE_MAX_AGE_SECONDS,
  parsePreferredLanguage,
  resolveBrowserProfile,
} from "@/profile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const resolved = await getResolved(request);
  if (resolved instanceof Response) return resolved;
  const response = NextResponse.json({ preferredLanguage: resolved.preferredLanguage });
  setDeviceCookie(response, resolved.token);
  return response;
}

export async function PUT(request: NextRequest): Promise<Response> {
  const bindings = await getIntakeBindings();
  if (!bindings) return NextResponse.json({ error: "Profile storage is not configured." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a JSON profile." }, { status: 400 }); }
  const language = parsePreferredLanguage(
    typeof body === "object" && body !== null && "preferredLanguage" in body ? body.preferredLanguage : null,
  );
  if (!language) return NextResponse.json({ error: "Choose a supported response language." }, { status: 400 });
  try {
    const resolved = await resolveBrowserProfile(bindings.DB, request.cookies.get(BROWSER_PROFILE_COOKIE)?.value);
    const saved = await new ProfileRepository(bindings.DB).upsertLanguage(resolved.profileId, language, new Date().toISOString());
    if (!saved) return NextResponse.json({ error: "The language preference could not be saved." }, { status: 503 });
    const response = NextResponse.json({ preferredLanguage: language });
    setDeviceCookie(response, resolved.token);
    return response;
  } catch {
    return NextResponse.json({ error: "The profile could not be loaded." }, { status: 503 });
  }
}

async function getResolved(request: NextRequest) {
  const bindings = await getIntakeBindings();
  if (!bindings) return NextResponse.json({ error: "Profile storage is not configured." }, { status: 503 });
  try { return await resolveBrowserProfile(bindings.DB, request.cookies.get(BROWSER_PROFILE_COOKIE)?.value); }
  catch { return NextResponse.json({ error: "The profile could not be loaded." }, { status: 503 }); }
}

function setDeviceCookie(response: NextResponse, token: string): void {
  response.cookies.set(BROWSER_PROFILE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BROWSER_PROFILE_MAX_AGE_SECONDS,
    priority: "high",
  });
}
