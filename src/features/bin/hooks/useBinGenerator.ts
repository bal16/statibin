// Owns link generation (random or password mode) and its busy/link state.
// The page keeps editor, tabs and preview; it just calls generate().

import { useCallback, useState } from "react";
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
}

export function useBinGenerator(): BinGenerator {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = useCallback(async ({ text, password }: GenerateInput) => {
    setBusy(true);
    try {
      const fragment =
        password === undefined
          ? await encodeRandom(text)
          : await encodeWithPassword(text, password);
      setLink(`${window.location.origin}${window.location.pathname}${fragment}`);
    } finally {
      setBusy(false);
    }
  }, []);

  return { generate, link, busy };
}
