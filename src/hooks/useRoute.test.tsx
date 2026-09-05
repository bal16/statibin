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

function fireHashChange() {
  window.dispatchEvent(new window.Event("hashchange"));
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
  window.location.hash = "";
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
  test("empty hash means create", () => {
    window.location.hash = "";
    expect(getRoute()).toEqual({ name: "create" });
  });

  test("non-empty hash means view with the raw hash", () => {
    window.location.hash = "#v1.r.a.b.c";
    expect(getRoute()).toEqual({ name: "view", hash: "#v1.r.a.b.c" });
  });
});

describe("useRoute", () => {
  test("starts on create and follows hash changes", async () => {
    window.location.hash = "";
    const seen: Array<Route> = [];
    await mountProbe(seen);
    expect(seen.at(-1)).toEqual({ name: "create" });

    window.location.hash = "#v1.p.salt.iv.ct";
    await act(async () => {
      fireHashChange();
    });
    expect(seen.at(-1)).toEqual({ name: "view", hash: "#v1.p.salt.iv.ct" });

    window.location.hash = "";
    await act(async () => {
      fireHashChange();
    });
    expect(seen.at(-1)).toEqual({ name: "create" });
  });

  test("starts directly on view when loaded with a hash", async () => {
    window.location.hash = "#v1.r.k.iv.ct";
    const seen: Array<Route> = [];
    await mountProbe(seen);
    expect(seen.at(-1)).toEqual({ name: "view", hash: "#v1.r.k.iv.ct" });
  });
});
