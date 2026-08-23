export const SUPPORTED_LANGUAGES = [
  "en",
  "hi",
  "mr",
  "bn",
  "ta",
  "te",
  "kn",
  "gu",
  "ml",
  "pa",
  "or",
  "ur",
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const RTL_LANGUAGES: readonly LanguageCode[] = ["ur"];
