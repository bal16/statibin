import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

export function RenderedMarkdown({ text, small = false }: { text: string; small?: boolean }) {
  return (
    <div className={`prose ${small ? "prose-sm" : ""} max-w-none dark:prose-invert wrap-anywhere`}>
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{text}</ReactMarkdown>
    </div>
  );
}
