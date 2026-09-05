import { encodeText } from "./compress";

// Synchronous estimate of the final URL length so the indicator can
// update live while typing (real encoding is async due to AES/Argon2).
export function estimateLength(text: string, withPassword: boolean): number {
  const { dataB64u } = encodeText(text);
  // v2 binary envelope: payload bytes + 5 header bytes (1 flag + 4 epoch).
  // dataB64u is the payload re-encoded as text; convert back to byte length
  // (ceil because base64url rounds up to whole chars).
  const payloadBytes = Math.ceil((dataB64u.length * 3) / 4);
  const envelopeBytes = payloadBytes + 5;
  const ctChars = Math.ceil((envelopeBytes + 16) / 3) * 4; // +16 GCM tag
  const prefix = 6; // '#v2.r.' / '#v2.p.'
  const keyOrSalt = withPassword ? 22 : 43; // salt 16B / key 32B as base64url
  return prefix + keyOrSalt + 1 + 16 + 1 + ctChars; // + iv 12B + separators
}
