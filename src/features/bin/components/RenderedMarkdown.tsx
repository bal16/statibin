import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { rehypeHighlightSubset } from "../lib/rehypeHighlightSubset";

// Only languages we actually want to ship. Each grammar costs ~3-8 kB minified
// and highlight.js ships ~37 of them by default (see rehypeHighlightSubset).
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const languages = {
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
};

export function RenderedMarkdown({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <div className={`prose ${small ? "prose-sm" : ""} max-w-none wrap-anywhere`}>
      <ReactMarkdown
        rehypePlugins={[[rehypeHighlightSubset, languages]]}
        remarkPlugins={[remarkGfm]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
