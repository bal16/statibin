import { encodeText } from "./compress";

// Synchronous estimate of the final URL length so the indicator can
// update live while typing (real encoding is async due to AES/Argon2).
export function estimateLength(text: string, withPassword: boolean): number {
  const { dataB64u } = encodeText(text);
  const envelopeBytes = dataB64u.length + 30; // JSON {"c":…,"t":…,"d":"…"} overhead
  const ctChars = Math.ceil((envelopeBytes + 16) / 3) * 4; // +16 GCM tag
  const prefix = 6; // '#v1.r.' / '#v1.p.'
  const keyOrSalt = withPassword ? 22 : 43; // salt 16B / key 32B as base64url
  return prefix + keyOrSalt + 1 + 16 + 1 + ctChars; // + iv 12B + separators
}
