import { useCallback, useMemo, useState } from "react";
import { strings } from "../strings";
import { HARD_LIMIT, LARGE_PREVIEW_CUTOFF } from "../lib/fragment";
import { encodeRandom, encodeWithPassword } from "../lib/fragment";
import { MarkdownEditor } from "../components/MarkdownEditor";
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
  // Snapshot of the text the user explicitly allowed to render above the
  // preview cutoff. Compared by reference: any edit re-gates the preview.
  const [previewOverride, setPreviewOverride] = useState("");
  // Mobile-only tab (PRD §5.1): below md show one panel at a time.
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

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
  // Anti-freeze: rendering megabytes of Markdown on every keystroke locks
  // the tab. Above the cutoff the preview stays gated until the user opts
  // in per current text (any edit re-gates automatically).
  const previewGated = text.length > LARGE_PREVIEW_CUTOFF && previewOverride !== text;

  return (
    <div className="mx-auto space-y-4 p-4 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold">{strings.appTitle}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{strings.appTagline}</p>
      </header>

      {/* Mobile tab switch (md:hidden): desktop always shows split-view. */}
      <div className="flex gap-2 md:hidden" role="tablist" aria-label="Editor mode">
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              mobileTab === tab
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
            }`}
          >
            {tab === "edit" ? strings.edit : strings.preview}
          </button>
        ))}
      </div>

      <main className="grid gap-4 md:grid-cols-2 ">
        <div className={mobileTab === "preview" ? "hidden md:block" : ""}>
          <MarkdownEditor value={text} onChange={setText} placeholder={strings.editorPlaceholder} />
        </div>
        <section
          className={`rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 min-h-64 md:min-h-96 max-h-112 overflow-auto ${
            mobileTab === "edit" ? "hidden md:block" : ""
          }`}
        >
          {previewGated ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {strings.previewDisabledLarge}{" "}
              <button
                onClick={() => setPreviewOverride(text)}
                className="underline text-blue-600 dark:text-blue-400"
              >
                {strings.renderAnyway}
              </button>
            </p>
          ) : (
            preview
          )}
        </section>
      </main>

      <footer className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PayloadMeter textLength={text.length} urlLength={estimateLength(text, withPassword)} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withPassword}
                onChange={(e) => setWithPassword(e.target.checked)}
              />
              {strings.protectWithPassword}
            </label>
            {withPassword && (
              <input
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={strings.passwordPlaceholder}
                className="w-36 rounded-md border border-gray-300 p-2 text-sm sm:w-44 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            )}
            <button
              onClick={onGenerate}
              disabled={!canGenerate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {strings.generateLink}
            </button>
          </div>
        </div>
        {link && <ShareCard link={link} />}
      </footer>
    </div>
  );
}
