import type { ImagesBindingLike } from "./contracts.ts";
import { detectImageMime, ImageValidationError, NORMALIZATION_VERSION } from "./image.ts";

export const MAX_DECODED_DIMENSION = 12_000;
export const MAX_DECODED_PIXELS = 40_000_000;
export const MAX_NORMALIZED_DIMENSION = 4_096;
export const MAX_NORMALIZED_BYTES = 8 * 1024 * 1024;

export interface NormalizedImage {
  bytes: Uint8Array;
  mime: "image/webp";
  width: number;
  height: number;
  normalizationVersion: typeof NORMALIZATION_VERSION;
}

export async function normalizeImage(
  rawBytes: Uint8Array,
  images: ImagesBindingLike | null | undefined,
): Promise<NormalizedImage> {
  if (!images) throw new ImageValidationError("Secure image normalization is unavailable.");

  let info;
  try {
    info = await images.info(toStream(rawBytes));
  } catch {
    throw new ImageValidationError("The image could not be decoded safely.");
  }
  const { width, height } = info;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new ImageValidationError("The image has invalid dimensions.");
  }
  if (width > MAX_DECODED_DIMENSION || height > MAX_DECODED_DIMENSION || width * height > MAX_DECODED_PIXELS) {
    throw new ImageValidationError("The decoded image dimensions are too large.");
  }

  const scale = Math.min(1, MAX_NORMALIZED_DIMENSION / Math.max(width, height));
  const outputWidth = Math.max(1, Math.round(width * scale));
  const outputHeight = Math.max(1, Math.round(height * scale));
  try {
    let input = images.input(toStream(rawBytes));
    if (scale < 1) {
      input = input.transform({ width: outputWidth, height: outputHeight, fit: "scale-down" });
    }
    const transformed = await input.output({ format: "image/webp", quality: 85, anim: false });
    const response = transformed.response();
    if (!response.ok || !response.body) throw new Error("Images output failed");
    const bytes = await readBounded(response.body, MAX_NORMALIZED_BYTES);
    if (bytes.byteLength === 0) throw new Error("Images output was empty");
    if (detectImageMime(bytes) !== "image/webp") throw new Error("Images output was not WebP");
    return { bytes, mime: "image/webp", width: outputWidth, height: outputHeight, normalizationVersion: NORMALIZATION_VERSION };
  } catch (cause) {
    if (cause instanceof ImageValidationError) throw cause;
    throw new ImageValidationError("The image could not be normalized safely.");
  }
}

function toStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  const copy = Uint8Array.from(bytes);
  return new ReadableStream({ start(controller) { controller.enqueue(copy); controller.close(); } });
}

async function readBounded(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("normalized image exceeds output limit");
        throw new ImageValidationError("The normalized image is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}
