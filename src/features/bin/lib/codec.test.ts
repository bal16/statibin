import { describe, expect, test } from "bun:test";
import { base64UrlToBytes, bytesToBase64Url } from "./codec";

describe("codec (base64url, no padding)", () => {
  test("round-trips arbitrary byte lengths", () => {
    for (const len of [0, 1, 2, 3, 15, 16, 32, 64, 100]) {
      const bytes = new Uint8Array(len);
      crypto.getRandomValues(bytes);
      expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes);
    }
  });

  test("output alphabet is URL-safe with no padding", () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const out = bytesToBase64Url(bytes);
    expect(out).not.toMatch(/[+/=]/);
    expect(out).not.toContain("."); // '.' is the fragment field separator
    expect(out).toMatch(/^[A-Za-z0-9\-_]*$/);
  });

  test("known vector: 'Hello' -> 'SGVsbG8'", () => {
    expect(bytesToBase64Url(new TextEncoder().encode("Hello"))).toBe("SGVsbG8");
  });

  test("garbage input throws", () => {
    expect(() => base64UrlToBytes("!!!")).toThrow();
  });
});
