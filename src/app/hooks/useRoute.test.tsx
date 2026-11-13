import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { getRoute, useRoute, type Route } from "./useRoute";

// Minimal browser surface for react-dom: copy what it reaches for onto
// globalThis. Kept module-scoped (this file only); lib tests never touch
// window/document/navigator so they are unaffected.
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

function Probe({ onRoute }: { onRoute: (r: Route) => void }) {
  const route = useRoute();
  useEffect(() => {
    onRoute(route);
  }, [route, onRoute]);
  return null;
}

// happy-dom's `location.hash` setter does not dispatch `hashchange`
// synchronously: it debounces the event onto a timer. Awaiting one tick inside
// act() lets that event (and the React update it causes) land while act() is
// still collecting work. Without this, the update escapes act() and React logs
// "An update to Probe inside a test was not wrapped in act(...)".
async function setHash(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(async () => {
  // Flush any queued hashchange before unmounting, so it cannot fire while the
  // next test is mounting. (A no-op assignment when the hash is already "".)
  await setHash("");
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  container?.remove();
  container = null;
});

async function mountProbe(seen: Array<Route>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Probe onRoute={(r) => seen.push(r)} />);
  });
}

describe("getRoute", () => {
  test("empty hash means create", async () => {
    await setHash("");
    expect(getRoute()).toEqual({ name: "create" });
  });

  test("non-empty hash means view with the raw hash", async () => {
    await setHash("#v1.r.a.b.c");
    expect(getRoute()).toEqual({ name: "view", hash: "#v1.r.a.b.c" });
  });
});

describe("useRoute", () => {
  test("starts on create and follows hash changes", async () => {
    await setHash("");
    const seen: Array<Route> = [];
    await mountProbe(seen);
    expect(seen.at(-1)).toEqual({ name: "create" });

    await setHash("#v1.p.salt.iv.ct");
    expect(seen.at(-1)).toEqual({ name: "view", hash: "#v1.p.salt.iv.ct" });

    await setHash("");
    expect(seen.at(-1)).toEqual({ name: "create" });
  });

  test("starts directly on view when loaded with a hash", async () => {
    await setHash("#v1.r.k.iv.ct");
    const seen: Array<Route> = [];
    await mountProbe(seen);
    expect(seen.at(-1)).toEqual({ name: "view", hash: "#v1.r.k.iv.ct" });
  });
});
