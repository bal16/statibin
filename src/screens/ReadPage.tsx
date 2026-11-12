import { useCallback, useEffect, useMemo, useState } from "react";
import { strings } from "../strings";
import { decodeRandom, decodeWithPassword, KDF_FAILED, parseFragment } from "../lib/fragment";
import { RenderedMarkdown } from "../components/RenderedMarkdown";

export function ReadPage({ hash, onFork }: { hash: string; onFork: (text: string) => void }) {
  const parsed = useMemo(() => parseFragment(hash), [hash]);
  const needsPassword = parsed.ok && parsed.mode === "p";
  const [password, setPassword] = useState("");
  const [text, setText] = useState<string | null>(parsed.ok && !needsPassword ? null : "");
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  /* eslint-disable react/set-state-in-effect -- async decrypt on hash change
     is external work, not derivable during render. */
  useEffect(() => {
    if (!parsed.ok) {
      setError(
        parsed.reason === "newer-format" ? strings.errNewerFormat : strings.errIncompleteLink,
      );
      return;
    }
    if (parsed.mode === "r") {
      decodeRandom(hash)
        .then((d) => {
          setText(d.text);
          setCreatedAt(d.createdAt);
        })
        .catch(() => setError(strings.errIncompleteLink));
    }
  }, [hash, parsed]);
  /* eslint-enable react/set-state-in-effect */

  const onUnlock = useCallback(async () => {
    try {
      const d = await decodeWithPassword(hash, password);
      setText(d.text);
      setCreatedAt(d.createdAt);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error && e.message === KDF_FAILED
          ? strings.errPasswordCheckFailed
          : strings.errWrongPasswordOrCorrupted,
      );
    }
  }, [hash, password]);

  if (error) {
    return (
      <main className="enter mx-auto max-w-xl space-y-2 px-4 py-16">
        <h1 className="text-2xl font-medium tracking-tight">{strings.errTitle}</h1>
        <p className="text-muted">{error}</p>
      </main>
    );
  }

  if (needsPassword && text === "") {
    return (
      <main className="enter mx-auto max-w-md space-y-4 px-4 py-16">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight">{strings.unlockTitle}</h1>
          <p className="text-sm text-muted">{strings.unlockHint}</p>
        </header>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onUnlock();
          }}
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium">{strings.passwordLabel}</span>
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field w-full"
              aria-invalid={!!error}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
          </label>
          <button type="submit" className="btn btn-solid w-full">
            {strings.unlock}
          </button>
        </form>
      </main>
    );
  }

  if (text === null) {
    return (
      <main role="status" className="p-16 text-center text-muted">
        {strings.decrypting}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      {createdAt && (
        <p className="text-xs text-muted">
          {strings.createdOn(
            createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          )}
        </p>
      )}
      <RenderedMarkdown text={text} />
      <button onClick={() => onFork(text)} className="btn btn-outline">
        {strings.editAsNewPaste}
      </button>
    </main>
  );
}
