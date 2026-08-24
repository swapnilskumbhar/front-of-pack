import type { AnalysisCacheIdentityInputs } from "../domain/cache";
import { ENGINE_VERSION } from "../engine/types.ts";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;
export const NORMALIZATION_VERSION = "validated-original.v2";

export const INTAKE_VERSION = {
  model: "gpt-5.6-terra",
  prompt: "terra-analysis.v12",
  schema: "analysis-result.v1",
  rules: "india-category-rules.v2",
  services: "india-consumer-services.v1",
  engine: ENGINE_VERSION,
  normalization: NORMALIZATION_VERSION,
} as const;

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export function detectImageMime(bytes: Uint8Array): SupportedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageBytes(bytes: Uint8Array): SupportedImageMime {
  if (bytes.byteLength === 0) throw new ImageValidationError("The image is empty.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("The image must be 12 MB or smaller.");
  }
  const mime = detectImageMime(bytes);
  if (!mime) throw new ImageValidationError("Upload a valid JPG, PNG or WebP image.");
  return mime;
}

export async function sha256Hex(value: Uint8Array | string): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digestInput = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildAnalysisCacheKey(input: AnalysisCacheIdentityInputs): Promise<string> {
  return sha256Hex(JSON.stringify([
    input.normalizedImageHash,
    input.language,
    input.modelId,
    input.promptVersion,
    input.schemaVersion,
    input.rulesVersion,
    input.servicesVersion,
    input.engineVersion,
  ]));
}

export function isFresh(expiresAt: string | null, now = new Date()): boolean {
  return expiresAt === null || Date.parse(expiresAt) > now.getTime();
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}
