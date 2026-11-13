// Anti-freeze policy for the live preview, kept as a pure function so it can
// be tested without React.
//
// Rendering megabytes of Markdown on every keystroke locks the tab. Above the
// cutoff the preview stays gated until the user opts in for the current text;
// any edit re-gates automatically because the snapshot no longer matches.

import { LARGE_PREVIEW_CUTOFF } from "./fragment";

export function isPreviewGated(text: string, allowedText: string): boolean {
  return text.length > LARGE_PREVIEW_CUTOFF && allowedText !== text;
}
