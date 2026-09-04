import { describe, expect, test } from "bun:test";
import {
  decodeRandom,
  decodeWithPassword,
  encodeRandom,
  encodeWithPassword,
  parseFragment,
} from "./fragment";

const SAMPLE = "# Hello\n\nSome **markdown**: halo dunia 🎉";

describe("fragment pipeline", () => {
  test("random mode round-trips text + timestamp", async () => {
    const before = Date.now();
    const frag = await encodeRandom(SAMPLE);
    expect(frag.startsWith("#v1.r.")).toBe(true);

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
    expect(frag.startsWith("#v1.p.")).toBe(true);

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

  test("every encryption uses a fresh key/IV (no reuse)", async () => {
    const a = await encodeRandom(SAMPLE);
    const b = await encodeRandom(SAMPLE);
    expect(a).not.toBe(b);
  });

  test("empty text round-trips", async () => {
    const decoded = await decodeRandom(await encodeRandom(""));
    expect(decoded.text).toBe("");
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

  test("rejects unknown mode as incomplete", () => {
    expect(parseFragment("#v1.x.a.b.c")).toEqual({ ok: false, reason: "incomplete" });
  });
});
