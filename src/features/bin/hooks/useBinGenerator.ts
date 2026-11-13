// Owns link generation (random or password mode) and its busy/link/error state.
// The page keeps editor, tabs and preview; it just calls generate().

import { useCallback, useState } from "react";
import { strings } from "../../../shared/constants/strings";
import { encodeRandom, encodeWithPassword } from "../lib/fragment";

export interface GenerateInput {
  text: string;
  /** Presence switches to password mode, even when the string is empty. */
  password?: string;
}

export interface BinGenerator {
  generate: (input: GenerateInput) => Promise<void>;
  /** Absolute share URL of the last successful generation. */
  link: string;
  busy: boolean;
  /** Failure of the last attempt; cleared when a new one starts. */
  error: string;
}

export function useBinGenerator(): BinGenerator {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async ({ text, password }: GenerateInput) => {
    setBusy(true);
    setError("");
    try {
      const fragment =
        password === undefined
          ? await encodeRandom(text)
          : await encodeWithPassword(text, password);
      setLink(`${window.location.origin}${window.location.pathname}${fragment}`);
    } catch {
      // Never let an encode failure escape as an unhandled rejection; the
      // crypto/KDF can fail for reasons the user can act on (empty password,
      // blocked WebAssembly) or retry.
      setError(strings.errGenerateFailed);
    } finally {
      setBusy(false);
    }
  }, []);

  return { generate, link, busy, error };
}
