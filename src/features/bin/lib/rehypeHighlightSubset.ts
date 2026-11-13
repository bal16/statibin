// Syntax highlighting with an explicit language allowlist.
//
// `rehype-highlight` always bundles lowlight's `common` set (~37 languages,
// ~170 kB minified) because it references `common` as a fallback default, so
// restricting its `languages` option does not shrink the bundle. This plugin
// keeps the same lowlight behavior but only registers what we import.

import type { Element, ElementContent, Root, RootContent } from "hast";
import { createLowlight, type LanguageFn } from "lowlight";

const LANGUAGE_CLASS = /^(?:language|lang)-(.+)$/;

export function rehypeHighlightSubset(languages: Readonly<Record<string, LanguageFn>>) {
  const lowlight = createLowlight(languages);

  return function (tree: Root) {
    walk(tree);

    function walk(node: Root | Element) {
      for (const child of node.children) {
        if (child.type !== "element") continue;

        if (child.tagName === "code" && node.type === "element" && node.tagName === "pre") {
          highlight(child);
        }

        walk(child);
      }
    }

    function highlight(node: Element) {
      const className = Array.isArray(node.properties.className)
        ? node.properties.className.map(String)
        : [];

      if (className.includes("no-highlight") || className.includes("nohighlight")) return;

      const language = className.map((name) => LANGUAGE_CLASS.exec(name)?.[1]).find(Boolean);
      if (!language) return;

      let result: Root;
      try {
        result = lowlight.highlight(language, textContent(node), { prefix: "hljs-" });
      } catch {
        // Unknown language: leave the block as plain text, like hljs does.
        return;
      }

      if (!className.includes("hljs")) className.unshift("hljs");
      node.properties.className = className;
      if (result.children.length > 0) node.children = result.children as ElementContent[];
    }
  };
}

function textContent(node: Root | RootContent): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if (!("children" in node) || !Array.isArray(node.children)) return "";
  return node.children.map(textContent).join("");
}
