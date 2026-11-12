import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function RenderedMarkdown({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <div className={`prose ${small ? "prose-sm" : ""} max-w-none wrap-anywhere`}>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
