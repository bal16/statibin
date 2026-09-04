import { strings } from "../strings";
import { HARD_LIMIT, WARN_START } from "../lib/fragment";

export function PayloadMeter({ textLength, urlLength }: { textLength: number; urlLength: number }) {
  const color =
    urlLength >= HARD_LIMIT
      ? "text-red-600 dark:text-red-400"
      : urlLength >= WARN_START
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-500 dark:text-gray-400";

  return (
    <div className="text-xs space-y-1">
      <div className="text-gray-500 dark:text-gray-400">
        Text: {textLength.toLocaleString()} chars
      </div>
      <div className={`${color}`}>
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
