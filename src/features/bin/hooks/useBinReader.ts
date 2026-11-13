// Owns the read pipeline (parse → decrypt → expose) for one fragment hash.
// The page only renders the states; async decoding never mixes with UI code.

import { useCallback, useEffect, useMemo, useState } from "react";
import { strings } from "../../../shared/constants/strings";
import { decodeRandom, decodeWithPassword, KDF_FAILED, parseFragment } from "../lib/fragment";

export type ReaderStatus = "loading" | "locked" | "ready" | "error";

export interface BinReader {
  status: ReaderStatus;
  /** Plain text of the paste; empty until the reader reaches `ready`. */
  text: string;
  createdAt: Date | null;
  /** Human-readable failure for the `error` status. */
  error: string;
  unlock: (password: string) => Promise<void>;
}

export function useBinReader(hash: string): BinReader {
  const parsed = useMemo(() => parseFragment(hash), [hash]);
  const needsPassword = parsed.ok && parsed.mode === "p";
  const [text, setText] = useState<string | null>(parsed.ok && !needsPassword ? null : "");
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [decodeError, setDecodeError] = useState("");

  useEffect(() => {
    if (!parsed.ok || parsed.mode !== "r") return;
    decodeRandom(hash)
      .then((decoded) => {
        setText(decoded.text);
        setCreatedAt(decoded.createdAt);
      })
      .catch(() => setDecodeError(strings.errIncompleteLink));
  }, [hash, parsed]);

  const unlock = useCallback(
    async (password: string) => {
      try {
        const decoded = await decodeWithPassword(hash, password);
        setText(decoded.text);
        setCreatedAt(decoded.createdAt);
        setDecodeError("");
      } catch (cause) {
        setDecodeError(
          cause instanceof Error && cause.message === KDF_FAILED
            ? strings.errPasswordCheckFailed
            : strings.errWrongPasswordOrCorrupted,
        );
      }
    },
    [hash],
  );

  // Parse failures are derivable from the hash, so they do not need state.
  const error = parsed.ok
    ? decodeError
    : parsed.reason === "newer-format"
      ? strings.errNewerFormat
      : strings.errIncompleteLink;

  const status: ReaderStatus = error
    ? "error"
    : needsPassword && text === ""
      ? "locked"
      : text === null
        ? "loading"
        : "ready";

  return { status, text: text ?? "", createdAt, error, unlock };
}
