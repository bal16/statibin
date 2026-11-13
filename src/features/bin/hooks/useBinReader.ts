// Owns the read pipeline (parse → decrypt → expose) for one fragment hash.
// The page only renders the states; async decoding never mixes with UI code.

import { useCallback, useEffect, useMemo, useState } from "react";
import { strings } from "../../../shared/constants/strings";
import { decodeRandom, decodeWithPassword, KDF_FAILED, parseFragment } from "../lib/fragment";

export type ReaderStatus = "loading" | "locked" | "ready" | "error";

type Failure = { kind: "link" | "unlock"; message: string };

export interface BinReader {
  status: ReaderStatus;
  /** Plain text of the paste; empty until the reader reaches `ready`. */
  text: string;
  createdAt: Date | null;
  /** Fatal link-level failure (replaces the whole page). */
  error: string;
  /** Wrong password / KDF failure; the unlock form stays visible. */
  unlockError: string;
  unlock: (password: string) => Promise<void>;
}

function initialText(parsed: ReturnType<typeof parseFragment>): string | null {
  return parsed.ok && parsed.mode !== "p" ? null : "";
}

export function useBinReader(hash: string): BinReader {
  const parsed = useMemo(() => parseFragment(hash), [hash]);
  const needsPassword = parsed.ok && parsed.mode === "p";
  const [loadedHash, setLoadedHash] = useState(hash);
  const [text, setText] = useState<string | null>(initialText(parsed));
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  // Reset when the hash prop changes. Adjusting state during render is the
  // documented React pattern for derived state; an effect would render one
  // frame with the previous paste (or its error) still visible.
  if (loadedHash !== hash) {
    setLoadedHash(hash);
    setText(initialText(parsed));
    setCreatedAt(null);
    setFailure(null);
  }

  useEffect(() => {
    if (!parsed.ok || parsed.mode !== "r") return;
    let cancelled = false;
    decodeRandom(hash)
      .then((decoded) => {
        if (cancelled) return;
        setText(decoded.text);
        setCreatedAt(decoded.createdAt);
      })
      .catch(() => {
        if (!cancelled) setFailure({ kind: "link", message: strings.errIncompleteLink });
      });
    // A hash change (or unmount) must never let an older decode win.
    return () => {
      cancelled = true;
    };
  }, [hash, parsed]);

  const unlock = useCallback(
    async (password: string) => {
      try {
        const decoded = await decodeWithPassword(hash, password);
        setText(decoded.text);
        setCreatedAt(decoded.createdAt);
        setFailure(null);
      } catch (cause) {
        setFailure({
          kind: "unlock",
          message:
            cause instanceof Error && cause.message === KDF_FAILED
              ? strings.errPasswordCheckFailed
              : strings.errWrongPasswordOrCorrupted,
        });
      }
    },
    [hash],
  );

  // Parse failures are derivable from the hash, so they do not need state.
  const error = !parsed.ok
    ? parsed.reason === "newer-format"
      ? strings.errNewerFormat
      : strings.errIncompleteLink
    : failure?.kind === "link"
      ? failure.message
      : "";

  const status: ReaderStatus = error
    ? "error"
    : needsPassword && text === ""
      ? "locked"
      : text === null
        ? "loading"
        : "ready";

  return {
    status,
    text: text ?? "",
    createdAt,
    error,
    unlockError: failure?.kind === "unlock" ? failure.message : "",
    unlock,
  };
}
