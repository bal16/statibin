import { describe, expect, test } from "bun:test";
import type { Element, Root } from "hast";
import javascript from "highlight.js/lib/languages/javascript";
import { rehypeHighlightSubset } from "./rehypeHighlightSubset";

const languages = { javascript };

function doc(code: string, className: string[] = []): Root {
  return {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className },
            children: [{ type: "text", value: code }],
          },
        ],
      },
    ],
  };
}

function codeNode(tree: Root): Element {
  return (tree.children[0] as Element).children[0] as Element;
}

function flatten(node: Element | Root): string {
  return node.children
    .map((child) => ("value" in child ? String(child.value) : flatten(child as Element)))
    .join("");
}

describe("rehypeHighlightSubset", () => {
  test("highlights registered languages and marks the block", () => {
    const tree = doc("const answer = 42;", ["language-js"]);
    rehypeHighlightSubset(languages)(tree);

    const code = codeNode(tree);
    const classes = (code.properties.className as string[]) ?? [];
    expect(classes).toContain("hljs");
    expect(code.children.some((child) => "properties" in child)).toBe(true);
    expect(flatten(code)).toBe("const answer = 42;");
  });

  test("leaves unregistered languages as plain text", () => {
    const tree = doc("SELECT * FROM t;", ["language-sql"]);
    rehypeHighlightSubset(languages)(tree);

    const code = codeNode(tree);
    expect(code.children).toEqual([{ type: "text", value: "SELECT * FROM t;" }]);
    expect((code.properties.className as string[]) ?? []).not.toContain("hljs");
  });

  test("skips blocks marked no-highlight", () => {
    const tree = doc("const answer = 42;", ["language-js", "no-highlight"]);
    rehypeHighlightSubset(languages)(tree);

    const code = codeNode(tree);
    expect(code.children).toEqual([{ type: "text", value: "const answer = 42;" }]);
  });

  test("ignores code blocks without a language class", () => {
    const tree = doc("plain");
    rehypeHighlightSubset(languages)(tree);

    expect(codeNode(tree).children).toEqual([{ type: "text", value: "plain" }]);
  });

  test("ignores inline code outside a pre", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "p",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "code",
              properties: { className: ["language-js"] },
              children: [{ type: "text", value: "const a = 1;" }],
            },
          ],
        },
      ],
    };

    rehypeHighlightSubset(languages)(tree);

    const inline = (tree.children[0] as Element).children[0] as Element;
    expect(inline.children).toEqual([{ type: "text", value: "const a = 1;" }]);
  });

  test("highlights nested elements inside code (e.g. from other plugins)", () => {
    const tree: Root = doc("", ["lang-js"]);
    const code = codeNode(tree);
    code.children = [
      {
        type: "element",
        tagName: "span",
        properties: {},
        children: [{ type: "text", value: "let " }],
      },
      { type: "text", value: "x = 1;" },
    ];

    rehypeHighlightSubset(languages)(tree);

    expect(flatten(codeNode(tree))).toBe("let x = 1;");
  });
});
