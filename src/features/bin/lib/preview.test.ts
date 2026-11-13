import { describe, expect, test } from "bun:test";
import { LARGE_PREVIEW_CUTOFF } from "./fragment";
import { isPreviewGated } from "./preview";

const large = "a".repeat(LARGE_PREVIEW_CUTOFF + 1);

describe("isPreviewGated", () => {
  test("never gates text at or below the cutoff", () => {
    expect(isPreviewGated("small", "")).toBe(false);
    expect(isPreviewGated("a".repeat(LARGE_PREVIEW_CUTOFF), "")).toBe(false);
  });

  test("gates text above the cutoff until it is explicitly allowed", () => {
    expect(isPreviewGated(large, "")).toBe(true);
  });

  test("opens once the allowed snapshot matches the current text", () => {
    expect(isPreviewGated(large, large)).toBe(false);
  });

  test("re-gates after the text changes", () => {
    expect(isPreviewGated(`${large}b`, large)).toBe(true);
  });
});
