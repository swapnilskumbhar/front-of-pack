import type { LanguageCode } from "./language";

export const PROFILE_CHANNELS = ["web_device", "whatsapp"] as const;
export type ProfileChannel = (typeof PROFILE_CHANNELS)[number];

export const SCAN_CHANNELS = ["web", "whatsapp"] as const;
export type ScanChannel = (typeof SCAN_CHANNELS)[number];

export interface ProfilePreferences {
  preferredLanguage: LanguageCode | null;
  readAloud: boolean;
  compactResults: boolean;
  consentVersion: string | null;
  onboardingComplete: boolean;
}

export interface Profile extends ProfilePreferences {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** subjectDigest is a keyed digest; raw browser tokens and phone numbers are never stored. */
export interface ProfileIdentity {
  id: string;
  profileId: string;
  channel: ProfileChannel;
  subjectDigest: string;
  createdAt: string;
  lastSeenAt: string;
}
