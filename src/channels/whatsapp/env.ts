import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    WHATSAPP_VERIFY_TOKEN?: string;
    WHATSAPP_APP_SECRET?: string;
    PROFILE_HMAC_SECRET?: string;
    DELIVERY_ENCRYPTION_KEY?: string;
  }
}

export async function getWhatsAppSecrets(): Promise<{
  verifyToken?: string;
  appSecret?: string;
  env?: CloudflareEnv;
}> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return {
      verifyToken: env.WHATSAPP_VERIFY_TOKEN,
      appSecret: env.WHATSAPP_APP_SECRET,
      env,
    };
  } catch {
    // `next build` and misconfigured local runtimes have no Worker context.
    // Returning no secrets keeps both webhook methods fail-closed.
    return {};
  }
}
