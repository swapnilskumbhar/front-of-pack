import { AnalysisRepository } from "@/data/analysis-repository";
import { ANALYSIS_SCHEMA_VERSION, type AnalysisRecord } from "@/domain/analysis";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from "@/domain/language";
import {
  buildAnalysisCacheKey,
  digestScanAccessToken,
  generateScanAccessToken,
  getIntakeBindings,
  ImageValidationError,
  INTAKE_VERSION,
  isFresh,
  MAX_IMAGE_BYTES,
  MAX_MULTIPART_BYTES,
  normalizeImage,
  ScanRequestRepository,
  sha256Hex,
  validateImageBytes,
  type AnalysisJob,
  type CreatedAnalysisResponse,
  type SafeAnalysisResponse,
} from "@/intake";
import { BROWSER_PROFILE_COOKIE, resolveBrowserProfile } from "@/profile";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const bindings = await getIntakeBindings();
  if (!bindings) return error("Analysis storage is not configured.", 503);

  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_MULTIPART_BYTES) {
      return error("The upload is too large. Choose an image up to 12 MB.", 413);
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Send one image as multipart form data.", 400);
  }

  const image = form.get("image");
  if (!(image instanceof File)) return error("Choose one image to analyse.", 400);
  if (image.size > MAX_IMAGE_BYTES) return error("The image must be 12 MB or smaller.", 413);

  const language = parseLanguage(form.get("language"));
  if (!language) return error("Choose a supported response language.", 400);

  let rawBytes: Uint8Array;
  let normalized: Awaited<ReturnType<typeof normalizeImage>>;
  try {
    rawBytes = new Uint8Array(await image.arrayBuffer());
    const detectedMime = validateImageBytes(rawBytes);
    if (image.type !== detectedMime) {
      return error("The file type does not match its image contents.", 400);
    }
    normalized = await normalizeImage(rawBytes, bindings.IMAGES);
  } catch (cause) {
    if (cause instanceof ImageValidationError) return error(cause.message, 400);
    return error("The image could not be read.", 400);
  }

  const now = new Date().toISOString();
  let profileId: string;
  try {
    const cookieStore = await cookies();
    const resolved = await resolveBrowserProfile(bindings.DB, cookieStore.get(BROWSER_PROFILE_COOKIE)?.value, now);
    profileId = resolved.profileId;
    cookieStore.set(BROWSER_PROFILE_COOKIE, resolved.token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 365, priority: "high",
    });
  } catch {
    return error("The browser profile could not be loaded.", 503);
  }
  const imageHash = await sha256Hex(normalized.bytes);
  const cacheKey = await buildAnalysisCacheKey({
    normalizedImageHash: `${normalized.normalizationVersion}:${imageHash}`,
    language,
    modelId: INTAKE_VERSION.model,
    promptVersion: INTAKE_VERSION.prompt,
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    rulesVersion: INTAKE_VERSION.rules,
    servicesVersion: INTAKE_VERSION.services,
    engineVersion: INTAKE_VERSION.engine,
  });
  const analyses = new AnalysisRepository(bindings.DB);
  const scans = new ScanRequestRepository(bindings.DB);
  const accessToken = generateScanAccessToken();
  const accessTokenDigest = await digestScanAccessToken(accessToken);
  const suppliedIdempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  const idempotencyKey = suppliedIdempotencyKey
    ? await sha256Hex(`web:${suppliedIdempotencyKey.slice(0, 512)}`)
    : crypto.randomUUID();

  const cached = await analyses.findByCacheKey(cacheKey);
  if (cached) {
    if (!await insertScan(scans, cached.id, idempotencyKey, accessTokenDigest, profileId, language, now)) {
      return error("The scan could not be recorded. Try again.", 503);
    }
    if (cached.status === "complete" && isFresh(cached.expiresAt)) {
      return Response.json(withAccessToken(cached, accessToken), { status: 200 });
    }
    if (cached.status === "queued") {
      try {
        await bindings.ANALYSIS_QUEUE.send(job(cached.id, cached.attemptNumber));
      } catch {
        return error("The analysis could not be queued. Try again.", 503);
      }
      return Response.json(withAccessToken(cached, accessToken), { status: 202 });
    }
    if (cached.status === "processing") {
      return Response.json(withAccessToken(cached, accessToken), { status: 202 });
    }
    if (cached.status === "failed") {
      return retryFailedAnalysis(cached, analyses, bindings, normalized, imageHash, accessToken, now);
    }
    return error("This analysis is no longer fresh. Start an explicit retry.", 409);
  }

  const analysisId = crypto.randomUUID();
  const mediaObjectKey = `analyses/${analysisId}/${crypto.randomUUID()}`;
  try {
    await bindings.MEDIA.put(mediaObjectKey, normalized.bytes, {
      httpMetadata: { contentType: normalized.mime },
      customMetadata: {
        analysisId,
        imageHash,
        normalization: "complete",
        normalizationVersion: normalized.normalizationVersion,
        normalizedWidth: String(normalized.width),
        normalizedHeight: String(normalized.height),
      },
    });
  } catch {
    return error("The image could not be stored. Try again.", 503);
  }

  let inserted: boolean;
  try {
    inserted = await analyses.insertQueued({
      id: analysisId,
      cacheKey,
      imageHash,
      mediaObjectKey,
      language,
      queueEnqueuedAt: now,
      modelId: INTAKE_VERSION.model,
      promptVersion: INTAKE_VERSION.prompt,
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      rulesVersion: INTAKE_VERSION.rules,
      servicesVersion: INTAKE_VERSION.services,
      engineVersion: INTAKE_VERSION.engine,
      createdAt: now,
    });
  } catch {
    await deleteOwnUpload(bindings.MEDIA, mediaObjectKey);
    return error("The upload could not be recorded. Try again.", 503);
  }

  if (!inserted) {
    await deleteOwnUpload(bindings.MEDIA, mediaObjectKey);
    const winner = await analyses.findByCacheKey(cacheKey);
    if (!winner) return error("The upload could not be recorded. Try again.", 503);
    if (!await insertScan(scans, winner.id, idempotencyKey, accessTokenDigest, profileId, language, now)) {
      return error("The scan could not be recorded. Try again.", 503);
    }
    if (winner.status === "complete" && isFresh(winner.expiresAt)) {
      return Response.json(withAccessToken(winner, accessToken), { status: 200 });
    }
    if (winner.status === "queued") {
      try {
        await bindings.ANALYSIS_QUEUE.send(job(winner.id, winner.attemptNumber));
      } catch {
        return error("The analysis could not be queued. Try again.", 503);
      }
      return Response.json(withAccessToken(winner, accessToken), { status: 202 });
    }
    if (winner.status === "processing") return Response.json(withAccessToken(winner, accessToken), { status: 202 });
    if (winner.status === "failed") {
      return retryFailedAnalysis(winner, analyses, bindings, normalized, imageHash, accessToken, now);
    }
    return error("This analysis is no longer fresh. Start an explicit retry.", 409);
  }

  if (!await insertScan(scans, analysisId, idempotencyKey, accessTokenDigest, profileId, language, now)) {
    return error("The scan could not be recorded. Try again.", 503);
  }
  try {
    await bindings.ANALYSIS_QUEUE.send(job(analysisId, 1));
  } catch {
    return error("The image was saved, but analysis could not be queued. Try again.", 503);
  }

  const created = await analyses.findById(analysisId);
  if (!created) return error("The upload could not be read after creation.", 503);
  return Response.json(withAccessToken(created, accessToken), { status: 202 });
}

function parseLanguage(value: FormDataEntryValue | null): LanguageCode | null {
  if (value === null || value === "") return DEFAULT_LANGUAGE;
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
    ? value as LanguageCode
    : null;
}

function job(analysisId: string, attemptNumber: number): AnalysisJob {
  return { version: 1, analysis_id: analysisId, attempt_number: attemptNumber, trigger: "web" };
}

function toSafeResponse(record: AnalysisRecord): SafeAnalysisResponse {
  return {
    id: record.id,
    status: record.status,
    result: record.result,
    errorCode: record.errorCode,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  };
}

function withAccessToken(record: AnalysisRecord, accessToken: string): CreatedAnalysisResponse {
  return { ...toSafeResponse(record), accessToken };
}

async function retryFailedAnalysis(
  record: AnalysisRecord,
  analyses: AnalysisRepository,
  bindings: NonNullable<Awaited<ReturnType<typeof getIntakeBindings>>>,
  normalized: Awaited<ReturnType<typeof normalizeImage>>,
  imageHash: string,
  accessToken: string,
  now: string,
): Promise<Response> {
  const mediaObjectKey = `analyses/${record.id}/${crypto.randomUUID()}`;
  try {
    await bindings.MEDIA.put(mediaObjectKey, normalized.bytes, {
      httpMetadata: { contentType: normalized.mime },
      customMetadata: {
        analysisId: record.id,
        imageHash,
        normalization: "complete",
        normalizationVersion: normalized.normalizationVersion,
        normalizedWidth: String(normalized.width),
        normalizedHeight: String(normalized.height),
        retryAttempt: String(record.attemptNumber + 1),
      },
    });
  } catch {
    return error("The image could not be stored for retry. Try again.", 503);
  }

  let retried: boolean;
  try {
    retried = await analyses.retry(
      record.id,
      record.attemptNumber,
      now,
      mediaObjectKey,
    );
  } catch {
    await deleteOwnUpload(bindings.MEDIA, mediaObjectKey);
    return error("The analysis could not be retried. Try again.", 503);
  }
  if (!retried) {
    await deleteOwnUpload(bindings.MEDIA, mediaObjectKey);
    return error("The analysis state changed. Please submit again.", 409);
  }

  const attemptNumber = record.attemptNumber + 1;
  try {
    await bindings.ANALYSIS_QUEUE.send(job(record.id, attemptNumber));
  } catch {
    return error("The retry was saved but could not be queued. Submit again.", 503);
  }
  const updated = await analyses.findById(record.id);
  return updated
    ? Response.json(withAccessToken(updated, accessToken), { status: 202 })
    : error("The retried analysis could not be loaded.", 503);
}

async function insertScan(
  scans: ScanRequestRepository,
  analysisId: string,
  idempotencyKey: string,
  accessTokenDigest: string,
  profileId: string,
  language: LanguageCode,
  createdAt: string,
): Promise<boolean> {
  try {
    return await scans.insertWeb({
      id: crypto.randomUUID(),
      analysisId,
      idempotencyKey,
      accessTokenDigest,
      profileId,
      language,
      createdAt,
    });
  } catch {
    return false;
  }
}

async function deleteOwnUpload(media: { delete(key: string): Promise<void> }, key: string): Promise<void> {
  try {
    await media.delete(key);
  } catch {
    // The lifecycle policy remains the orphan cleanup backstop.
  }
}

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
