import { useCallback, useMemo, useState } from "react";
import { strings } from "../strings";
import { HARD_LIMIT } from "../lib/fragment";
import { encodeRandom, encodeWithPassword } from "../lib/fragment";
import MarkdownEditor from "../components/MarkdownEditor";
import { RenderedMarkdown } from "../components/RenderedMarkdown";
import { PayloadMeter } from "../components/PayloadMeter";
import { ShareCard } from "../components/ShareCard";
import { estimateLength } from "../lib/utils";

export function CreatePage({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const estLen = estimateLength(text, withPassword);
  const canGenerate = text.length > 0 && estLen <= HARD_LIMIT && !busy;

  const onGenerate = useCallback(async () => {
    setBusy(true);
    try {
      const frag = withPassword
        ? await encodeWithPassword(text, password)
        : await encodeRandom(text);
      setLink(window.location.origin + window.location.pathname + frag);
    } finally {
      setBusy(false);
      window.scrollTo({
        top: 999, // big amount for max y cordinate
        behavior: "smooth",
      });
    }
  }, [text, withPassword, password]);

  const preview = useMemo(() => <RenderedMarkdown text={text} small />, [text]);

  return (
    <div className="mx-auto space-y-4 p-4 max-w-6xl">
      <header className="flex flex-col justify-between md:flex md:flex-row">
        <section className="flex-1">
          <h1 className="text-2xl font-bold">{strings.appTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{strings.appTagline}</p>
        </section>
        <section className="min-w-64 space-y-2">
          <label className="flex flex-row-reverse items-center gap-2 text-sm">
            {strings.protectWithPassword}
            <input
              type="checkbox"
              checked={withPassword}
              onChange={(e) => setWithPassword(e.target.checked)}
            />
          </label>
          {withPassword && (
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={strings.passwordPlaceholder}
              className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          )}
        </section>
      </header>

      <main className="grid gap-4 md:grid-cols-2 ">
        <MarkdownEditor value={text} onChange={setText} placeholder={strings.editorPlaceholder} />
        <section className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 max-h-112 overflow-auto">
          {preview}
        </section>
      </main>

      <footer className="space-y-8">
        <div className="flex items-center justify-between">
          <PayloadMeter textLength={text.length} urlLength={estimateLength(text, withPassword)} />
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {strings.generateLink}
          </button>
        </div>
        {link && <ShareCard link={link} />}
      </footer>
    </div>
  );
}
