import { useCallback, useEffect, useMemo, useState } from "react";
import { strings } from "../strings";
import { decodeRandom, decodeWithPassword, parseFragment } from "../lib/fragment";
import { RenderedMarkdown } from "./RenderedMarkdown";

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
    } catch {
      setError(strings.errWrongPasswordOrCorrupted);
    }
  }, [hash, password]);

  if (error) return <p className="p-8 text-center text-red-600 dark:text-red-400">{error}</p>;
  if (needsPassword && text === "") {
    return (
      <div className="mx-auto max-w-md space-y-2 p-8">
        <input
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={strings.passwordPlaceholder}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
        <button
          onClick={onUnlock}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
        >
          {strings.unlock}
        </button>
      </div>
    );
  }
  if (text === null) return <p className="p-8 text-center">…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      {createdAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
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
      <button
        onClick={() => onFork(text)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
      >
        {strings.editAsNewPaste}
      </button>
    </div>
  );
}
