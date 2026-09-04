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
});
