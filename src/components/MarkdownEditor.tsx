// Isolated Markdown editor (PRD §7).
// Everything else in the app may ONLY interact via value/onChange —
// never reach into the textarea internals. Migrating to CodeMirror 6
// or Milkdown later means replacing the INSIDE of this file only.

import { strings } from "../strings";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  return (
    // The editor is the product (skill: the subject at true size, in one
    // app-frame) — never a bare textarea floating on the ground.
    <div className="app-frame h-64 max-h-112 w-full md:h-112">
      <div className="app-frame-bar">
        <span>{strings.editorLabel}</span>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="min-h-0 w-full flex-1 resize-none bg-bg p-3 font-mono text-sm text-ink placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
