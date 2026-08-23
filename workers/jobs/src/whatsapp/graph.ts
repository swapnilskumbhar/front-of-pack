const MAX_MEDIA_BYTES = 12 * 1024 * 1024;

export interface GraphConfig {
  accessToken: string;
  apiVersion: string;
  phoneNumberId: string;
}

export class GraphSendError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`graph_message_send_${status}`);
    this.name = "GraphSendError";
    this.status = status;
  }
  get retryable(): boolean { return this.status === 429 || this.status >= 500; }
}

export function isAllowedMetaMediaUrl(value: string): boolean {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return host === "lookaside.fbsbx.com" || host === "lookaside.facebook.com" ||
    host.endsWith(".fbcdn.net") || host.endsWith(".facebook.com");
}

export async function downloadWhatsAppMedia(
  mediaId: string, config: GraphConfig, fetcher: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; declaredMime: string | null }> {
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(mediaId)) throw new Error("invalid_media_id");
  if (!/^v\d+\.\d+$/.test(config.apiVersion)) throw new Error("invalid_graph_version");
  const metadataUrl = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(mediaId)}`;
  const metadataResponse = await fetcher(metadataUrl, {
    headers: { authorization: `Bearer ${config.accessToken}` }, redirect: "error",
  });
  if (!metadataResponse.ok) throw new Error(`graph_media_metadata_${metadataResponse.status}`);
  const metadata = await metadataResponse.json() as { url?: unknown; mime_type?: unknown; file_size?: unknown };
  if (typeof metadata.url !== "string" || !isAllowedMetaMediaUrl(metadata.url)) {
    throw new Error("untrusted_media_download_url");
  }
  if (typeof metadata.file_size === "number" && metadata.file_size > MAX_MEDIA_BYTES) {
    throw new Error("media_too_large");
  }
  const mediaResponse = await fetcher(metadata.url, {
    headers: { authorization: `Bearer ${config.accessToken}` }, redirect: "error",
  });
  if (!mediaResponse.ok) throw new Error(`graph_media_download_${mediaResponse.status}`);
  if (mediaResponse.redirected || !isAllowedMetaMediaUrl(mediaResponse.url || metadata.url)) {
    throw new Error("media_redirect_rejected");
  }
  const declaredLength = Number(mediaResponse.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MEDIA_BYTES) throw new Error("media_too_large");
  const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error("media_too_large");
  return {
    bytes,
    declaredMime: typeof metadata.mime_type === "string" ? metadata.mime_type : mediaResponse.headers.get("content-type"),
  };
}

export async function sendWhatsAppText(
  recipient: string, body: string, config: GraphConfig, fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!/^\d{7,15}$/.test(recipient)) throw new Error("invalid_whatsapp_recipient");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(config.phoneNumberId)) throw new Error("invalid_phone_number_id");
  const response = await fetcher(
    `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: "POST", redirect: "error",
      headers: { authorization: `Bearer ${config.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "text", text: { body } }),
    },
  );
  if (!response.ok) throw new GraphSendError(response.status);
}
