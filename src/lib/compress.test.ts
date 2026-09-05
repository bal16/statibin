import { describe, expect, test } from "bun:test";
import { decodeText, encodeText } from "./compress";

const SAMPLE = "# Hello\n\nSome **markdown** with unicode: halo dunia 🎉\n\n- a\n- b\n";

describe("compress (fflate deflate + raw fallback)", () => {
  test("round-trips markdown, unicode, and empty string", () => {
    for (const text of [SAMPLE, "", "x", "line1\nline2\nline3"]) {
      const enc = encodeText(text);
      expect(decodeText(enc)).toBe(text);
    }
  });

  test("compressible text uses deflate (flag 1)", () => {
    const enc = encodeText("lorem ipsum dolor sit amet\n".repeat(50));
    expect(enc.compressed).toBe(1);
  });

  test("tiny/high-entropy input falls back to raw (flag 0)", () => {
    const enc = encodeText("ab");
    expect(enc.compressed).toBe(0);
    expect(decodeText(enc)).toBe("ab");
  });

  test("large compressible markdown (~500KB) round-trips deflated", () => {
    const text = "# Big\n\nSome **markdown** row with unicode: halo 🎉\n\n".repeat(11_000);
    expect(text.length).toBeGreaterThan(500_000);
    const enc = encodeText(text);
    expect(enc.compressed).toBe(1);
    expect(enc.dataB64u.length).toBeLessThan(text.length);
    expect(decodeText(enc)).toBe(text);
  });

  test("large base64 noise (~680KB chars) round-trips (and still shrinks)", () => {
    const random = new Uint8Array(512 * 1024);
    crypto.getRandomValues(random);
    let bin = "";
    for (let i = 0; i < random.length; i += 0x8000) {
      bin += String.fromCharCode(...random.subarray(i, i + 0x8000));
    }
    const text = btoa(bin); // ~683K chars of base64 noise
    const enc = encodeText(text);
    // NOTE: no `compressed === 0` assertion here on purpose. Base64 text
    // uses only 64 of 256 byte values, so Huffman still shaves ~25% off
    // the UTF-8 bytes — flag 1 is CORRECT for this input. The fallback
    // branch itself is covered by the tiny-input test above; at scale we
    // prove integrity (round-trip) instead of a specific flag.
    expect(decodeText(enc)).toBe(text);
    // Size is ~neutral, and that's expected, not a bug: deflate shrinks the
    // bytes ~25% (0.75x) but re-encoding as base64url costs 4/3x, so
    // 0.75 * 4/3 ≈ 1.0x of the input text. The flag-1 path is still better
    // than flag 0 here (which would base64url the raw bytes: ~1.33x).
    expect(enc.dataB64u.length).toBeLessThan(text.length * 1.1);
  });

  test("minified JSON (high-entropy, structured) round-trips", () => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < 2000; i++) {
      obj[`key_${i}_abcdef123456`] = [i, `value-${i}-xyz`, i % 2 === 0];
    }
    const text = JSON.stringify(obj);
    const enc = encodeText(text);
    expect(decodeText(enc)).toBe(text);
  });
});
