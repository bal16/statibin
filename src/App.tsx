import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { QRCodeSVG } from "qrcode.react";
import MarkdownEditor from "./components/MarkdownEditor";
import { strings } from "./strings";
import { encodeText } from "./lib/compress";
import {
  HARD_LIMIT,
  QR_LIMIT,
  WARN_START,
  decodeRandom,
  decodeWithPassword,
  encodeRandom,
  encodeWithPassword,
  parseFragment,
} from "./lib/fragment";

type Route = { name: "create" } | { name: "view"; hash: string };

function getRoute(): Route {
  return window.location.hash.length > 1
    ? { name: "view", hash: window.location.hash }
    : { name: "create" };
}

// Synchronous estimate of the final URL length so the indicator can
// update live while typing (real encoding is async due to AES/Argon2).
function estimateLength(text: string, withPassword: boolean): number {
  const { dataB64u } = encodeText(text);
  const envelopeBytes = dataB64u.length + 30; // JSON {"c":…,"t":…,"d":"…"} overhead
  const ctChars = Math.ceil((envelopeBytes + 16) / 3) * 4; // +16 GCM tag
  const prefix = 6; // '#v1.r.' / '#v1.p.'
  const keyOrSalt = withPassword ? 22 : 43; // salt 16B / key 32B as base64url
  return prefix + keyOrSalt + 1 + 16 + 1 + ctChars; // + iv 12B + separators
}

function SizeIndicator({ text, withPassword }: { text: string; withPassword: boolean }) {
  const len = estimateLength(text, withPassword);
  const color =
    len >= HARD_LIMIT
      ? "text-red-600 dark:text-red-400"
      : len >= WARN_START
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-500 dark:text-gray-400";
  return (
    <div className={`text-xs ${color}`}>
      {strings.sizeUnit(len, HARD_LIMIT)}
      {len >= HARD_LIMIT
        ? ` — ${strings.exceedsMaximum}`
        : len >= WARN_START
          ? ` — ${strings.approachingSafeLimit}`
          : ""}
    </div>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function CreateView({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const estLen = estimateLength(text, withPassword);
  const canGenerate = text.length > 0 && estLen <= HARD_LIMIT && !busy;

  const onGenerate = useCallback(async () => {
    setBusy(true);
    setCopied(false);
    try {
      const frag = withPassword
        ? await encodeWithPassword(text, password)
        : await encodeRandom(text);
      setLink(window.location.origin + window.location.pathname + frag);
    } finally {
      setBusy(false);
    }
  }, [text, withPassword, password]);

  const onCopy = useCallback(async () => {
    if (await copyToClipboard(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [link]);

  const preview = useMemo(
    () => (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{text}</ReactMarkdown>
      </div>
    ),
    [text],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">{strings.appTitle}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{strings.appTagline}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <MarkdownEditor value={text} onChange={setText} placeholder={strings.editorPlaceholder} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withPassword}
              onChange={(e) => setWithPassword(e.target.checked)}
            />
            {strings.protectWithPassword}
          </label>
          {withPassword && (
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={strings.passwordPlaceholder}
              className="w-full rounded-md border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          )}
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
          {preview}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <SizeIndicator text={text} withPassword={withPassword} />
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {strings.generateLink}
        </button>
      </div>

      {link && (
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
      )}
    </div>
  );
}

function ViewPaste({ hash, onFork }: { hash: string; onFork: (text: string) => void }) {
  const parsed = useMemo(() => parseFragment(hash), [hash]);
  const needsPassword = parsed.ok && parsed.mode === "p";
  const [password, setPassword] = useState("");
  const [text, setText] = useState<string | null>(parsed.ok && !needsPassword ? null : "");
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  /* eslint-disable react/set-state-in-effect -- async decrypt on hash change
     is external work, not derivable during render. */
  useEffect(() => {
    if (!parsed.ok) {
      setError(
        parsed.reason === "newer-format" ? strings.errNewerFormat : strings.errIncompleteLink,
      );
      return;
    }
    if (parsed.mode === "r") {
      decodeRandom(hash)
        .then((d) => {
          setText(d.text);
          setCreatedAt(d.createdAt);
        })
        .catch(() => setError(strings.errIncompleteLink));
    }
  }, [hash, parsed]);
  /* eslint-enable react/set-state-in-effect */

  const onUnlock = useCallback(async () => {
    try {
      const d = await decodeWithPassword(hash, password);
      setText(d.text);
      setCreatedAt(d.createdAt);
      setError("");
    } catch {
      setError(strings.errWrongPasswordOrCorrupted);
    }
  }, [hash, password]);

  if (error) return <p className="p-8 text-center text-red-600 dark:text-red-400">{error}</p>;
  if (needsPassword && text === "") {
    return (
      <div className="mx-auto max-w-md space-y-2 p-8">
        <input
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={strings.passwordPlaceholder}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
        <button
          onClick={onUnlock}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
        >
          {strings.unlock}
        </button>
      </div>
    );
  }
  if (text === null) return <p className="p-8 text-center">…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-4">
      {createdAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {strings.createdOn(
            createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          )}
        </p>
      )}
      <div className="prose max-w-none dark:prose-invert">
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{text}</ReactMarkdown>
      </div>
      <button
        onClick={() => onFork(text)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
      >
        {strings.editAsNewPaste}
      </button>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [forkText, setForkText] = useState("");

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const onFork = useCallback((text: string) => {
    setForkText(text);
    window.location.hash = "";
    setRoute({ name: "create" });
  }, []);

  if (route.name === "view") return <ViewPaste hash={route.hash} onFork={onFork} />;
  return <CreateView key={forkText} initialText={forkText} />;
}
