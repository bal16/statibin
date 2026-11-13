// Compression layer: fflate DEFLATE with fallback to raw bytes (PRD §3.1).
// Returns a Base64URL string ready to embed in the encrypted envelope.

import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { base64UrlToBytes, bytesToBase64Url } from "./codec";

export interface EncodedText {
  /** 1 = deflated, 0 = raw (fallback when compression does not help) */
  compressed: 0 | 1;
  dataB64u: string;
}

export function encodeText(text: string): EncodedText {
  const raw = strToU8(text);
  if (raw.length === 0) return { compressed: 0, dataB64u: "" };
  const deflated = deflateSync(raw, { level: 6 });
  if (deflated.length >= raw.length) {
    return { compressed: 0, dataB64u: bytesToBase64Url(raw) };
  }
  return { compressed: 1, dataB64u: bytesToBase64Url(deflated) };
}

export function decodeText(enc: EncodedText): string {
  const bytes = base64UrlToBytes(enc.dataB64u);
  if (enc.compressed === 0) return strFromU8(bytes);
  return strFromU8(inflateSync(bytes));
}
