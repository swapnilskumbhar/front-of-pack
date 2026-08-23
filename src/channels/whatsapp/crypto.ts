const encoder = new TextEncoder();
const decoder = new TextDecoder();

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function encryptIdentifier(
  plaintext: string,
  base64Key: string,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const rawKey = fromBase64(base64Key);
  if (rawKey.byteLength !== 32) throw new Error("DELIVERY_ENCRYPTION_KEY must decode to 32 bytes");
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(rawKey).buffer, "AES-GCM", false, ["encrypt"]);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, encoder.encode(plaintext));
  return { ciphertext: new Uint8Array(ciphertext), nonce };
}

export async function decryptIdentifier(
  ciphertext: ArrayBuffer | ArrayBufferView,
  nonce: ArrayBuffer | ArrayBufferView,
  base64Key: string,
): Promise<string> {
  const rawKey = fromBase64(base64Key);
  if (rawKey.byteLength !== 32) throw new Error("DELIVERY_ENCRYPTION_KEY must decode to 32 bytes");
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(rawKey).buffer, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(toBytes(nonce)).buffer }, key,
    Uint8Array.from(toBytes(ciphertext)).buffer,
  );
  return decoder.decode(plain);
}

function toBytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  return value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
