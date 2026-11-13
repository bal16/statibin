import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { encodeRandom, encodeWithPassword } from "../lib/fragment";
import { useBinReader, type BinReader } from "./useBinReader";

// Minimal browser surface for react-dom; kept module-scoped to this file.
const win = new Window({ url: "https://statibin.test/" });
const globals = globalThis as Record<string, unknown>;
for (const key of [
  "window",
  "document",
  "navigator",
  "location",
  "Event",
  "CustomEvent",
  "HTMLElement",
  "SVGElement",
  "Element",
  "Node",
  "Text",
  "Comment",
  "DocumentFragment",
  "NodeList",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "MutationObserver",
]) {
  globals[key] = (win as unknown as Record<string, unknown>)[key];
}
globals["IS_REACT_ACT_ENVIRONMENT"] = true;

let current: BinReader;

function Probe({ hash }: { hash: string }) {
  const reader = useBinReader(hash);
  useEffect(() => {
    current = reader;
  }, [reader]);
  return null;
}

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  container?.remove();
  container = null;
});

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function mount(hash: string) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Probe hash={hash} />);
  });
}

async function settle() {
  for (let i = 0; i < 50 && current.status === "loading"; i++) await flush();
}

describe("useBinReader", () => {
  test("decodes a random-mode link and exposes the text + timestamp", async () => {
    const frag = await encodeRandom("Hello **world**");
    await mount(frag);
    await settle();

    expect(current.status).toBe("ready");
    expect(current.text).toBe("Hello **world**");
    expect(current.createdAt).toBeInstanceOf(Date);
    expect(current.error).toBe("");
  });

  test("locks password-mode links until unlock succeeds", async () => {
    const frag = await encodeWithPassword("classified", "s3cret");
    await mount(frag);

    expect(current.status).toBe("locked");
    expect(current.text).toBe("");

    await act(async () => {
      await current.unlock("s3cret");
    });
    expect(current.status).toBe("ready");
    expect(current.text).toBe("classified");
  });

  test("reports a newer fragment format as a fatal error", async () => {
    await mount("#v1.r.a.b.c");
    await flush();

    expect(current.status).toBe("error");
    expect(current.error).toBe("This link uses a newer format. Please update the app.");
  });

  test("reports a link that cannot be decrypted as a fatal error", async () => {
    const bytes = (length: number) => new Uint8Array(length);
    const { bytesToBase64Url } = await import("../lib/codec");
    await mount(
      `#v2.r.${bytesToBase64Url(bytes(32))}.${bytesToBase64Url(bytes(12))}.${bytesToBase64Url(bytes(16))}`,
    );
    await settle();

    expect(current.status).toBe("error");
    expect(current.error).toBe("This link looks incomplete or corrupted.");
  });

  test("reports a wrong password while unlocking", async () => {
    const frag = await encodeWithPassword("classified", "s3cret");
    await mount(frag);

    await act(async () => {
      await current.unlock("wrong");
    });

    expect(current.status).toBe("error");
    expect(current.error).toBe("Wrong password or corrupted link.");
  });

  test("reports an incomplete link as a fatal error", async () => {
    await mount("#v2.r.a.b");
    await flush();

    expect(current.status).toBe("error");
    expect(current.error).toBe("This link looks incomplete or corrupted.");
  });
});
