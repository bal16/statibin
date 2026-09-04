// URL fragment envelope + encode/decode pipeline (PRD §3).
//
// Formats:
//   random mode:   #v1.r.<key_b64u>.<iv_b64u>.<ciphertext_b64u>
//   password mode: #v1.p.<salt_b64u>.<iv_b64u>.<ciphertext_b64u>
//
// Ciphertext = AES-GCM over UTF-8 bytes of JSON envelope:
//   { "c": 0|1, "t": <unix epoch seconds>, "d": <base64url payload> }

import { base64UrlToBytes, bytesToBase64Url } from "./codec";
import { decodeText, encodeText } from "./compress";
import { aesGcmDecrypt, aesGcmEncrypt, newRandomBytes } from "./crypto";
import { deriveKey, SALT_BYTES } from "./password";

export const FRAGMENT_VERSION = "v1";
export const SOFT_LIMIT = 4000;
export const WARN_START = 3200;
export const HARD_LIMIT = 8000;
export const QR_LIMIT = 2000;
export const LARGE_PREVIEW_CUTOFF = 200_000; // chars; above this, preview needs opt-in

export type FragmentMode = "r" | "p";

export interface DecodedPaste {
  mode: FragmentMode;
  text: string;
  createdAt: Date;
}

interface Envelope {
  c: 0 | 1;
  t: number;
  d: string;
}

const te = new TextEncoder();
const td = new TextDecoder();

function buildEnvelope(text: string): Uint8Array {
  const { compressed, dataB64u } = encodeText(text);
  const env: Envelope = {
    c: compressed,
    t: Math.floor(Date.now() / 1000),
    d: dataB64u,
  };
  return te.encode(JSON.stringify(env));
}

function openEnvelope(plain: Uint8Array): { text: string; createdAt: Date } {
  const env = JSON.parse(td.decode(plain)) as Envelope;
  if ((env.c !== 0 && env.c !== 1) || typeof env.t !== "number" || typeof env.d !== "string") {
    throw new Error("corrupted");
  }
  return {
    text: decodeText({ compressed: env.c, dataB64u: env.d }),
    createdAt: new Date(env.t * 1000),
  };
}

export async function encodeRandom(text: string): Promise<string> {
  // SECURITY: fresh random key + IV per paste, never reused.
  const key = newRandomBytes(32);
  const iv = newRandomBytes(12);
  const ct = await aesGcmEncrypt(key, iv, buildEnvelope(text));
  return `#${FRAGMENT_VERSION}.r.${bytesToBase64Url(key)}.${bytesToBase64Url(iv)}.${bytesToBase64Url(ct)}`;
}

export async function encodeWithPassword(text: string, password: string): Promise<string> {
  // SECURITY: fresh random salt + IV per paste, never reused.
  const salt = newRandomBytes(SALT_BYTES);
  const iv = newRandomBytes(12);
  const key = await deriveKey(password, salt);
  try {
    const ct = await aesGcmEncrypt(key, iv, buildEnvelope(text));
    return `#${FRAGMENT_VERSION}.p.${bytesToBase64Url(salt)}.${bytesToBase64Url(iv)}.${bytesToBase64Url(ct)}`;
  } finally {
    key.fill(0);
  }
}

export type ParseResult =
  | { ok: true; mode: FragmentMode; keyOrSalt: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array }
  | { ok: false; reason: "incomplete" | "newer-format" };

export function parseFragment(hash: string): ParseResult {
  const frag = hash.startsWith("#") ? hash.slice(1) : hash;
  const parts = frag.split(".");
  if (parts.length !== 5) return { ok: false, reason: "incomplete" };
  const [version, mode, a, b, c] = parts;
  if (version !== FRAGMENT_VERSION) return { ok: false, reason: "newer-format" };
  if (mode !== "r" && mode !== "p") return { ok: false, reason: "incomplete" };
  try {
    return {
      ok: true,
      mode,
      keyOrSalt: base64UrlToBytes(a),
      iv: base64UrlToBytes(b),
      ciphertext: base64UrlToBytes(c),
    };
  } catch {
    return { ok: false, reason: "incomplete" };
  }
}

export async function decodeRandom(hash: string): Promise<DecodedPaste> {
  const parsed = parseFragment(hash);
  if (!parsed.ok || parsed.mode !== "r") throw new Error(parsed.ok ? "corrupted" : parsed.reason);
  const plain = await aesGcmDecrypt(parsed.keyOrSalt, parsed.iv, parsed.ciphertext);
  const { text, createdAt } = openEnvelope(plain);
  return { mode: "r", text, createdAt };
}

export async function decodeWithPassword(hash: string, password: string): Promise<DecodedPaste> {
  const parsed = parseFragment(hash);
  if (!parsed.ok || parsed.mode !== "p") throw new Error(parsed.ok ? "corrupted" : parsed.reason);
  const key = await deriveKey(password, parsed.keyOrSalt);
  try {
    const plain = await aesGcmDecrypt(key, parsed.iv, parsed.ciphertext);
    const { text, createdAt } = openEnvelope(plain);
    return { mode: "p", text, createdAt };
  } finally {
    key.fill(0);
  }
}
