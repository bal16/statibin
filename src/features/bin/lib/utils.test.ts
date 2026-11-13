import { describe, expect, test } from "bun:test";
import { HARD_LIMIT } from "./fragment";
import { encodeRandom } from "./fragment";
import { estimateLength } from "./utils";

describe("estimateLength", () => {
  test("empty text hits the fixed fragment overhead exactly", () => {
    // #v2.r.(6) + key 32B (43) + sep (1) + iv 12B (16) + sep (1)
    // + envelope 5B + GCM tag 16B as base64url (28)
    expect(estimateLength("", false)).toBe(95);
    // password mode swaps the 43-char key for a 22-char salt
    expect(estimateLength("", true)).toBe(74);
  });

  test("grows monotonically with input size", () => {
    const a = estimateLength("hello", false);
    const b = estimateLength("hello world, this is longer", false);
    expect(b).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(estimateLength("", false));
  });

  test("never underestimates the real random-mode fragment", async () => {
    // The estimator must stay >= reality or the hard block + QR gating
    // in the UI would let oversized links through.
    for (const text of ["", "x", "hello world", "lorem ipsum dolor\n".repeat(200)]) {
      const actual = await encodeRandom(text);
      const est = estimateLength(text, false);
      expect(est).toBeGreaterThanOrEqual(actual.length);
      // ...but not absurdly over: envelope overhead is ~5 bytes by design
      // plus base64url rounding (≤4 chars per encoding step)
      expect(est - actual.length).toBeLessThanOrEqual(8);
    }
  });

  test("flags huge high-entropy input past the hard limit", () => {
    const random = new Uint8Array(20 * 1024);
    crypto.getRandomValues(random);
    const text = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
    expect(estimateLength(text, false)).toBeGreaterThan(HARD_LIMIT);
  });
});
