import { strings } from "../strings";
import { QRCodeSVG } from "qrcode.react";
import { QR_LIMIT } from "../lib/fragment";
import { copyToClipboard } from "../lib/clipboard";
import { useCallback, useEffect, useRef, useState } from "react";

export function ShareCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Modal behavior: Escape closes, focus moves in on open and back on close,
  // background scroll locks while open.
  useEffect(() => {
    if (!qrOpen) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [qrOpen]);

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
        <div>
          <button
            ref={triggerRef}
            onClick={() => setQrOpen(true)}
            className="rounded-md border border-gray-300 px-3 py-2 text-xs dark:border-gray-600"
          >
            {strings.showQrCode}
          </button>
          {qrOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={strings.showQrCode}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <button
                aria-label={strings.close}
                onClick={() => setQrOpen(false)}
                className="absolute inset-0 cursor-default bg-black/60"
              />
              <div className="relative space-y-3 rounded-lg bg-white p-4 text-center">
                <QRCodeSVG value={link} size={192} />
                <button
                  ref={closeRef}
                  onClick={() => setQrOpen(false)}
                  className="w-full rounded-md bg-gray-800 px-3 py-2 text-xs text-white"
                >
                  {strings.close}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{strings.qrTooLarge}</p>
      )}
    </div>
  );
}
