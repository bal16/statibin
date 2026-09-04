import { strings } from "../strings";
import { QRCodeSVG } from "qrcode.react";
import { QR_LIMIT } from "../lib/fragment";
import { copyToClipboard } from "../lib/clipboard";
import { useCallback, useState } from "react";

export function ShareCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    if (await copyToClipboard(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [link]);

  return (
    <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          className="w-full rounded border border-gray-300 p-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          onClick={onCopy}
          className="rounded-md bg-gray-800 px-3 py-2 text-xs text-white dark:bg-gray-200 dark:text-gray-900"
        >
          {copied ? strings.copied : strings.copy}
        </button>
      </div>
      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
        {strings.lostLinkWarning}
      </p>
      {link.length <= QR_LIMIT ? (
        <span className="inline-block rounded bg-white p-2">
          <QRCodeSVG value={link} size={160} />
        </span>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{strings.qrTooLarge}</p>
      )}
    </div>
  );
}
