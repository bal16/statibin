import { describe, expect, test } from "bun:test";
import {
  decodeRandom,
  decodeWithPassword,
  encodeRandom,
  encodeWithPassword,
  parseFragment,
} from "./fragment";
import { bytesToBase64Url } from "./codec";
import { aesGcmEncrypt, newRandomBytes } from "./crypto";

const SAMPLE = "# Hello\n\nSome **markdown**: halo dunia 🎉";

describe("fragment pipeline", () => {
  test("random mode round-trips text + timestamp", async () => {
    const before = Date.now();
    const frag = await encodeRandom(SAMPLE);
    expect(frag.startsWith("#v2.r.")).toBe(true);

    const parsed = parseFragment(frag);
    expect(parsed.ok).toBe(true);

    const decoded = await decodeRandom(frag);
    expect(decoded.mode).toBe("r");
    expect(decoded.text).toBe(SAMPLE);
    expect(decoded.createdAt.getTime()).toBeGreaterThanOrEqual(before - 2000);
    expect(decoded.createdAt.getTime()).toBeLessThanOrEqual(Date.now() + 2000);
  });

  test("password mode round-trips with correct password", async () => {
    const frag = await encodeWithPassword(SAMPLE, "s3cret!");
    expect(frag.startsWith("#v2.p.")).toBe(true);

    const decoded = await decodeWithPassword(frag, "s3cret!");
    expect(decoded.mode).toBe("p");
    expect(decoded.text).toBe(SAMPLE);
  });

  test("password mode rejects wrong password", async () => {
    const frag = await encodeWithPassword(SAMPLE, "s3cret!");
    await expect(decodeWithPassword(frag, "wrong")).rejects.toThrow();
  });

  test("tampered fragment fails to decode", async () => {
    const frag = await encodeRandom(SAMPLE);
    const tampered = frag.slice(0, -2) + (frag.endsWith("A") ? "BB" : "AA");
    await expect(decodeRandom(tampered)).rejects.toThrow();
  });

  test("rejects an authenticated fragment with a corrupted envelope", async () => {
    const key = newRandomBytes(32);
    const iv = newRandomBytes(12);
    // binary envelope with an illegal flag byte (valid: 0 raw, 1 deflated)
    const envelope = new Uint8Array([2, 0, 0, 0, 0]);
    const ciphertext = await aesGcmEncrypt(key, iv, envelope);
    const frag = `#v2.r.${bytesToBase64Url(key)}.${bytesToBase64Url(iv)}.${bytesToBase64Url(ciphertext)}`;

    await expect(decodeRandom(frag)).rejects.toThrow("corrupted");
  });

  test("every encryption uses a fresh key/IV (no reuse)", async () => {
    const a = await encodeRandom(SAMPLE);
    const b = await encodeRandom(SAMPLE);
    expect(a).not.toBe(b);
  });

  test("empty text round-trips", async () => {
    const decoded = await decodeRandom(await encodeRandom(""));
    expect(decoded.text).toBe("");
  });

  test("large compressible paste round-trips end to end", async () => {
    const text = "# Big\n\nRow of **markdown** content halo 🎉\n\n".repeat(5000);
    expect(text.length).toBeGreaterThan(200_000);
    const decoded = await decodeRandom(await encodeRandom(text));
    expect(decoded.text).toBe(text);
  });

  test("large high-entropy paste exceeds the URL hard limit but still round-trips", async () => {
    const random = new Uint8Array(96 * 1024);
    crypto.getRandomValues(random);
    let bin = "";
    for (let i = 0; i < random.length; i += 0x8000) {
      bin += String.fromCharCode(...random.subarray(i, i + 0x8000));
    }
    const text = btoa(bin); // ~128K chars of base64 noise
    const frag = await encodeRandom(text);
    // incompressible at this size: the fragment itself blows past 8K chars,
    // which is exactly what the hard block in the UI must catch
    expect(frag.length).toBeGreaterThan(8000);
    const decoded = await decodeRandom(frag);
    expect(decoded.text).toBe(text);
  });
});

describe("parseFragment", () => {
  test("rejects garbage as incomplete", () => {
    expect(parseFragment("#garbage")).toEqual({ ok: false, reason: "incomplete" });
    expect(parseFragment("")).toEqual({ ok: false, reason: "incomplete" });
  });

  test("rejects unknown version as newer-format", () => {
    expect(parseFragment("#v9.r.a.b.c")).toEqual({ ok: false, reason: "newer-format" });
  });

  test("rejects retired v1 links (no legacy parser kept)", async () => {
    // Clean cutover: the app was undeployed with no v1 links in the wild,
    // so v1 is rejected like any other unknown version. See docs/v1/.
    expect(parseFragment("#v1.r.a.b.c")).toEqual({ ok: false, reason: "newer-format" });
    await expect(decodeRandom("#v1.r.a.b.c")).rejects.toThrow();
  });

  test("rejects unknown mode as incomplete", () => {
    expect(parseFragment("#v2.x.a.b.c")).toEqual({ ok: false, reason: "incomplete" });
  });

  test("rejects invalid base64url fields as incomplete", () => {
    expect(parseFragment("#v2.r.%.a.b")).toEqual({ ok: false, reason: "incomplete" });
  });
});
