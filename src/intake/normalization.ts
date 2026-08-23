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
  _images: ImagesBindingLike | null | undefined,
): Promise<NormalizedImage> {
  void _images; // Kept in the public signature while deployments roll off the Images binding.
  const dimensions = readImageDimensions(rawBytes);
  if (!dimensions) throw new ImageValidationError("The image dimensions could not be validated safely.");
  const { width, height } = dimensions;
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

export function readImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const mime = detectImageMime(bytes);
  if (mime === "image/png" && bytes.length >= 24) {
    return { width: readU32be(bytes, 16), height: readU32be(bytes, 20) };
  }
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 7) return null;
        return { height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] };
      }
      offset += length;
    }
  }
  if (mime === "image/webp" && bytes.length >= 25) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X" && bytes.length >= 30) return { width: 1 + readU24le(bytes, 24), height: 1 + readU24le(bytes, 27) };
    if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: (bytes[26] | bytes[27] << 8) & 0x3fff, height: (bytes[28] | bytes[29] << 8) & 0x3fff };
    }
    if (chunk === "VP8L" && bytes[20] === 0x2f) {
      return { width: 1 + (bytes[21] | (bytes[22] & 0x3f) << 8), height: 1 + ((bytes[22] >> 6) | bytes[23] << 2 | (bytes[24] & 0x0f) << 10) };
    }
  }
  return null;
}

function readU32be(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function readU24le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | bytes[offset + 1] << 8 | bytes[offset + 2] << 16;
}
