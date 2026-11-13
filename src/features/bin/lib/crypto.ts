// AES-GCM 256-bit via Web Crypto API (PRD §3.3).
// SECURITY: IV (96-bit) and salt (128-bit) must ALWAYS be fresh from
// crypto.getRandomValues per encryption — NEVER cache or reuse them.
// Requires a secure context (HTTPS on Vercel, or localhost for dev).

export function newRandomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

async function importRawKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  const bytes = new Uint8Array(keyBytes);
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const key = await importRawKey(keyBytes);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(plaintext),
  );
  return new Uint8Array(ct);
}

export async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const key = await importRawKey(keyBytes);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ciphertext),
  );
  return new Uint8Array(pt);
}
