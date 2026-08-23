export async function decryptIdentifier(
  ciphertext: ArrayBuffer | ArrayBufferView | readonly number[],
  nonce: ArrayBuffer | ArrayBufferView | readonly number[],
  base64Key: string,
): Promise<string> {
  const binary = atob(base64Key);
  const raw = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (raw.byteLength !== 32) throw new Error("invalid_delivery_encryption_key");
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(raw).buffer,
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const iv = Uint8Array.from(toBytes(nonce)).buffer;
  const encrypted = Uint8Array.from(toBytes(ciphertext)).buffer;
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(plain);
}

function toBytes(value: ArrayBuffer | ArrayBufferView | readonly number[]): Uint8Array {
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Object.prototype.toString.call(value) === "[object ArrayBuffer]") {
    return new Uint8Array(value as ArrayBuffer);
  }
  if (Array.isArray(value)) return Uint8Array.from(value);
  throw new TypeError("encrypted identifier is not binary data");
}
