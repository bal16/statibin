import { strings } from "../strings";
import { Suspense, lazy } from "react";
const QRCodeSVG = lazy(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })));
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
    <div className="app-frame p-3">
      <div className="flex gap-2">
        <input readOnly value={link} className="field w-full min-w-0 font-mono text-xs" />
        <button onClick={onCopy} className="btn btn-solid shrink-0 px-3 text-xs">
          {copied ? strings.copied : strings.copy}
        </button>
      </div>
      <p className="mt-2 text-sm font-medium text-warn">{strings.lostLinkWarning}</p>
      {link.length <= QR_LIMIT ? (
        <div className="mt-3">
          <button
            ref={triggerRef}
            onClick={() => setQrOpen(true)}
            className="btn btn-outline px-3 text-xs"
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
              <div className="relative w-64 space-y-3 border border-line bg-surface p-4 text-center shadow-2xl">
                {/* The QR stays black-on-white in both schemes: cameras and
                    scanners need the contrast; the white tile also keeps the
                    quiet zone around the modules. */}
                <div className="mx-auto w-fit bg-white p-2">
                  <Suspense fallback={null}>
                    <QRCodeSVG value={link} size={192} />
                  </Suspense>
                </div>
                <button
                  ref={closeRef}
                  onClick={() => setQrOpen(false)}
                  className="btn btn-solid w-full"
                >
                  {strings.close}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">{strings.qrTooLarge}</p>
      )}
    </div>
  );
}
