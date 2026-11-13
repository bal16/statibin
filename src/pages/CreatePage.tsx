import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strings } from "../shared/constants/strings";
import { HARD_LIMIT } from "../features/bin/lib/fragment";
import { MarkdownEditor } from "../features/bin/components/MarkdownEditor";
import { RenderedMarkdown } from "../features/bin/components/RenderedMarkdown";
import { PayloadMeter } from "../features/bin/components/PayloadMeter";
import { ShareCard } from "../features/bin/components/ShareCard";
import { estimateLength } from "../features/bin/lib/utils";
import { useBinGenerator } from "../features/bin/hooks/useBinGenerator";
import { isPreviewGated } from "../features/bin/lib/preview";

export function CreatePage({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  // Snapshot of the text the user explicitly allowed to render above the
  // preview cutoff. Compared by reference: any edit re-gates the preview.
  const [previewOverride, setPreviewOverride] = useState("");
  // Mobile-only tab (PRD §5.1): below md show one panel at a time.
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const shareRef = useRef<HTMLDivElement>(null);
  const { generate, link, busy, error } = useBinGenerator();

  const estLen = estimateLength(text, withPassword);
  const canGenerate = text.length > 0 && estLen <= HARD_LIMIT && !busy;

  const onGenerate = useCallback(() => {
    void generate({ text, password: withPassword ? password : undefined });
  }, [generate, text, withPassword, password]);

  // The result is announced by scrolling to the share card itself —
  // never by a magic scrollTo number (layout is not a fixed height).
  useEffect(() => {
    if (!link) return;
    shareRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [link]);

  const preview = useMemo(() => <RenderedMarkdown text={text} small />, [text]);
  const previewGated = isPreviewGated(text, previewOverride);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <header className="enter space-y-2">
        <h1 className="text-3xl font-medium tracking-[-0.035em] md:text-4xl">{strings.appTitle}</h1>
        <p className="text-muted">{strings.appTagline}</p>
        <p className="text-sm text-muted">{strings.hardFact}</p>
      </header>

      {/* Mobile tab switch (md:hidden): desktop always shows split-view.
          Same button pair as the rest of the app: solid = active. */}
      <div className="flex gap-2 md:hidden" role="tablist" aria-label="Editor mode">
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`btn flex-1 ${mobileTab === tab ? "btn-solid" : "btn-outline"}`}
          >
            {tab === "edit" ? strings.edit : strings.preview}
          </button>
        ))}
      </div>

      <main className="grid items-start gap-4 md:grid-cols-2">
        <div className={mobileTab === "preview" ? "hidden md:block" : ""}>
          <MarkdownEditor value={text} onChange={setText} placeholder={strings.editorPlaceholder} />
        </div>
        <section
          className={`app-frame h-64 max-h-112 md:h-112 ${
            mobileTab === "edit" ? "hidden md:flex" : "flex"
          } flex-col`}
        >
          <div className="app-frame-bar">
            <span>{strings.previewLabel}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {previewGated ? (
              <p className="text-sm text-muted">
                {strings.previewDisabledLarge}{" "}
                <button
                  onClick={() => setPreviewOverride(text)}
                  className="underline decoration-line underline-offset-2 hover:decoration-ink"
                >
                  {strings.renderAnyway}
                </button>
              </p>
            ) : (
              preview
            )}
          </div>
        </section>
      </main>

      <footer className="space-y-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PayloadMeter textLength={text.length} urlLength={estimateLength(text, withPassword)} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={withPassword}
                onClick={() => setWithPassword((v) => !v)}
                className={`btn ${withPassword ? "btn-solid" : "btn-outline"}`}
              >
                {strings.protectWithPassword}
              </button>
              {withPassword && (
                <input
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={strings.passwordPlaceholder}
                  aria-label={strings.passwordPlaceholder}
                  className="field w-36 sm:w-44"
                />
              )}
              <button onClick={onGenerate} disabled={!canGenerate} className="btn btn-solid px-5">
                {strings.generateLink}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        {link && (
          <div ref={shareRef}>
            <ShareCard link={link} />
          </div>
        )}
      </footer>
    </div>
  );
}
