import { useCallback, useState } from "react";
import { strings } from "../shared/constants/strings";
import { useBinReader } from "../features/bin/hooks/useBinReader";
import { RenderedMarkdown } from "../features/bin/components/RenderedMarkdown";

export function ReadPage({ hash, onFork }: { hash: string; onFork: (text: string) => void }) {
  const { status, text, createdAt, error, unlock } = useBinReader(hash);
  const [password, setPassword] = useState("");

  const onUnlock = useCallback(async () => {
    await unlock(password);
  }, [unlock, password]);

  if (status === "error") {
    return (
      <main className="enter mx-auto max-w-xl space-y-2 px-4 py-16">
        <h1 className="text-2xl font-medium tracking-tight">{strings.errTitle}</h1>
        <p className="text-muted">{error}</p>
      </main>
    );
  }

  if (status === "locked") {
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

  if (status === "loading") {
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
