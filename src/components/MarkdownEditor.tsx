// Isolated Markdown editor (PRD §7).
// Everything else in the app may ONLY interact via value/onChange —
// never reach into the textarea internals. Migrating to CodeMirror 6
// or Milkdown later means replacing the INSIDE of this file only.

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className="h-64 w-full resize-y rounded-md border border-gray-300 bg-white p-3 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none md:h-96"
    />
  );
}
