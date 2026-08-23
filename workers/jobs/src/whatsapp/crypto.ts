export async function decryptIdentifier(ciphertext: ArrayBuffer, nonce: ArrayBuffer, base64Key: string): Promise<string> {
  const binary = atob(base64Key);
  const raw = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (raw.byteLength !== 32) throw new Error("invalid_delivery_encryption_key");
  const key = await crypto.subtle.importKey("raw", raw.buffer, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ciphertext);
  return new TextDecoder().decode(plain);
}
