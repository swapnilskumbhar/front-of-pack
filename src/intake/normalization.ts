import type { ImagesBindingLike } from "./contracts.ts";
import { detectImageMime, ImageValidationError, NORMALIZATION_VERSION, type SupportedImageMime } from "./image.ts";

export const MAX_DECODED_DIMENSION = 12_000;
export const MAX_DECODED_PIXELS = 40_000_000;

export interface NormalizedImage {
  bytes: Uint8Array;
  mime: SupportedImageMime;
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

  const mime = detectImageMime(rawBytes);
  if (!mime) throw new ImageValidationError("The image type could not be validated.");
  return {
    bytes: Uint8Array.from(rawBytes),
    mime,
    width,
    height,
    normalizationVersion: NORMALIZATION_VERSION,
  };
}

function toStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  const copy = Uint8Array.from(bytes);
  return new ReadableStream({ start(controller) { controller.enqueue(copy); controller.close(); } });
}
