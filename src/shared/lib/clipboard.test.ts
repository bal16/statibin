import { afterEach, describe, expect, test } from "bun:test";
import { copyToClipboard } from "./clipboard";

// Stubbing globals directly: the impl only touches
// navigator.clipboard.writeText + a tiny document surface, so a full DOM
// (happy-dom) would be overkill here.

const g = globalThis as Record<string, unknown>;
const origNavigator = g["navigator"];
const origDocument = g["document"];

afterEach(() => {
  // Always restore: bun shares globalThis across test files in one run.
  if (origNavigator === undefined) delete g["navigator"];
  else g["navigator"] = origNavigator;
  if (origDocument === undefined) delete g["document"];
  else g["document"] = origDocument;
});

function stubNavigator(writeText: (text: string) => Promise<void>) {
  g["navigator"] = { clipboard: { writeText } };
}

interface FakeTextArea {
  value: string;
  selectCalls: number;
}

function stubDocument(execCommand: () => boolean) {
  const removed: Array<unknown> = [];
  const ta: FakeTextArea = { value: "", selectCalls: 0 };
  const api = {
    __ta: ta,
    __removed: removed,
    __execCalls: 0,
    createElement: () => ({
      get value() {
        return ta.value;
      },
      set value(v: string) {
        ta.value = v;
      },
      select: () => {
        ta.selectCalls += 1;
      },
    }),
    execCommand: () => {
      api.__execCalls += 1;
      return execCommand();
    },
    body: {
      appendChild: () => {},
      removeChild: (el: unknown) => {
        removed.push(el);
      },
    },
  };
  g["document"] = api;
  return api;
}

describe("copyToClipboard", () => {
  test("uses navigator.clipboard when available", async () => {
    const written: Array<string> = [];
    stubNavigator(async (t: string) => {
      written.push(t);
    });
    // no document at all: must not reach the fallback
    delete g["document"];

    expect(await copyToClipboard("hello")).toBe(true);
    expect(written).toEqual(["hello"]);
  });

  test("falls back to textarea + execCommand and cleans up", async () => {
    stubNavigator(async () => {
      throw new Error("denied");
    });
    const doc = stubDocument(() => true);

    expect(await copyToClipboard("secret-text")).toBe(true);
    expect(doc.__ta.value).toBe("secret-text");
    expect(doc.__ta.selectCalls).toBe(1);
    expect(doc.__execCalls).toBe(1);
    expect(doc.__removed).toHaveLength(1);
  });

  test("returns false when clipboard and fallback both fail", async () => {
    stubNavigator(async () => {
      throw new Error("denied");
    });
    stubDocument(() => {
      throw new Error("no execCommand");
    });

    expect(await copyToClipboard("x")).toBe(false);
  });
});
