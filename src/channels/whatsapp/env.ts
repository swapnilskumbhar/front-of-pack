import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    WHATSAPP_VERIFY_TOKEN?: string;
    WHATSAPP_APP_SECRET?: string;
  }
}

export async function getWhatsAppSecrets(): Promise<{
  verifyToken?: string;
  appSecret?: string;
}> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return {
      verifyToken: env.WHATSAPP_VERIFY_TOKEN,
      appSecret: env.WHATSAPP_APP_SECRET,
    };
  } catch {
    // `next build` and misconfigured local runtimes have no Worker context.
    // Returning no secrets keeps both webhook methods fail-closed.
    return {};
  }
}
