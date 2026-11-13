import { strings } from "../../../shared/constants/strings";
import { HARD_LIMIT, WARN_START } from "../lib/fragment";

export function PayloadMeter({ textLength, urlLength }: { textLength: number; urlLength: number }) {
  const tone =
    urlLength >= HARD_LIMIT ? "text-danger" : urlLength >= WARN_START ? "text-warn" : "text-muted";

  return (
    <div className="space-y-1 font-mono text-xs">
      <div className="text-muted">Text: {textLength.toLocaleString()} chars</div>
      <div className={tone}>
        URL: {urlLength.toLocaleString()} / {HARD_LIMIT.toLocaleString()} chars
        {urlLength >= HARD_LIMIT
          ? ` — ${strings.exceedsMaximum}`
          : urlLength >= WARN_START
            ? ` — ${strings.approachingSafeLimit}`
            : ""}
      </div>
    </div>
  );
}
