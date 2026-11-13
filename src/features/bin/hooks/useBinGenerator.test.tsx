import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useBinGenerator, type BinGenerator } from "./useBinGenerator";

// Minimal browser surface for react-dom; kept module-scoped to this file.
const win = new Window({ url: "https://statibin.test/create" });
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

let current: BinGenerator;

function Probe() {
  const generator = useBinGenerator();
  useEffect(() => {
    current = generator;
  }, [generator]);
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

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Probe />);
  });
}

describe("useBinGenerator", () => {
  test("random mode produces an absolute v2.r link", async () => {
    await mount();
    await act(async () => {
      await current.generate({ text: "hello" });
    });

    expect(current.link.startsWith("https://statibin.test/create#v2.r.")).toBe(true);
    expect(current.busy).toBe(false);
  });

  test("a password selects password mode", async () => {
    await mount();
    await act(async () => {
      await current.generate({ text: "hello", password: "pw" });
    });

    expect(current.link.startsWith("https://statibin.test/create#v2.p.")).toBe(true);
    expect(current.busy).toBe(false);
  });
});
