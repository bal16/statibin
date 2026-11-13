<div align="center">

<img src="https://shieldcn.dev/header/surface.svg?title=Statibin&subtitle=The%20URL%20is%20the%20database" alt="Statibin — the URL is the database" width="100%" />

<p><strong>A pastebin with no database.</strong> Your Markdown is compressed, encrypted in the browser, and stored in the link itself. The server only ships the app; it never receives the paste.</p>

<p>
  <a href="https://statibin.vercel.app"><img alt="Live demo" src="https://shieldcn.dev/badge/live%20demo-open%20app-0f766e.svg?logo=lu:Globe" /></a>
  <a href="https://github.com/bal16/statibin/stargazers"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/bal16/statibin.svg?variant=secondary&amp;logo=github" /></a>
  <a href="https://github.com/bal16/statibin/commits/main"><img alt="Last commit" src="https://shieldcn.dev/github/last-commit/bal16/statibin.svg?variant=secondary" /></a>
  <img alt="No backend" src="https://shieldcn.dev/badge/no%20backend-static%20site-334155.svg?logo=lu:CloudOff" />
  <img alt="React 19" src="https://shieldcn.dev/badge/React-19-61dafb.svg?logo=react" />
  <img alt="Vite 7" src="https://shieldcn.dev/badge/Vite-7-646cff.svg?logo=vite" />
  <img alt="TypeScript 5.9" src="https://shieldcn.dev/badge/TypeScript-5.9-3178c6.svg?logo=typescript" />
  <img alt="Tailwind CSS 4" src="https://shieldcn.dev/badge/Tailwind%20CSS-4-06b6d4.svg?logo=tailwindcss" />
  <img alt="AES-GCM 256" src="https://shieldcn.dev/badge/AES--GCM-256-0f766e.svg?logo=lu:ShieldCheck" />
  <img alt="Argon2id" src="https://shieldcn.dev/badge/Argon2id-hash--wasm-7c3aed.svg?logo=lu:KeyRound" />
</p>

</div>

> [!NOTE]
> Statibin is a small learning project about encryption in the browser. This README explains the ideas behind the code, not just the commands to run it.

## Try it

Open **[statibin.vercel.app](https://statibin.vercel.app)**, write Markdown, and press **Generate Link**.

- **Random-key link** — the decryption key is part of the URL. Anyone who has the link can read the paste.
- **Password link** — the key is derived from your password with Argon2id. The password and the plaintext stay in the browser.

There is no account, no server-side storage, and no recovery. **If you lose the link, the paste is gone.**

## The idea in one sentence

A URL has two parts: everything before `#` is sent to the server, and everything after `#` (the fragment) stays in the browser. Statibin puts the whole encrypted paste in the fragment, so a plain static file server can host a pastebin without ever seeing a paste.

That is what “the URL is the database” means here. It is not a metaphor and there is no hidden storage bucket.

## How a paste becomes a link

The pipeline is short on purpose. Each step solves one problem.

### 1. Text becomes UTF-8 bytes

JavaScript strings are not bytes. `TextEncoder` converts the Markdown into UTF-8, which is the format the compressor and the encryptor expect.

### 2. DEFLATE makes the URL shorter

Markdown repeats a lot: spaces, tags, headings, code fences. `fflate` runs DEFLATE at level 6 and keeps the result only if it is actually smaller. If compression does not help (for example, a short or already-random string), the raw bytes are used instead and a flag records which path was taken.

### 3. A small binary envelope records what happened

Before encryption, the payload gets a five-byte header:

```text
[flag: 1 byte][timestamp: 4 bytes][payload: N bytes]
```

- `flag` says whether the payload is deflated or raw.
- `timestamp` is a Unix epoch in seconds. It travels _inside_ the encrypted data, so the server cannot read the creation time.
- The payload is the compressed Markdown. It stays as bytes; there is no intermediate JSON and no extra Base64 step here.

### 4. AES-GCM encrypts the envelope

The browser’s native Web Crypto API performs AES-GCM with a 256-bit key. Every paste gets a fresh 96-bit IV (initialization vector). Reusing an IV with the same key breaks GCM, so the code generates a new one for every encryption and never caches it.

The key comes from one of two places:

- **Random mode:** 32 random bytes from `crypto.getRandomValues`. The key is stored in the URL fragment, which is why the link itself is the secret.
- **Password mode:** Argon2id derives the key from the password and a fresh 128-bit salt. The baseline is 19 MiB of memory, 2 iterations, and parallelism 1. The Argon2 WebAssembly module is loaded only when a password is actually used.

### 5. Base64URL puts the bytes in the URL

URLs are text, so the ciphertext is encoded once with Base64URL (no padding). Dots separate the fields because `.` is not part of the Base64URL alphabet.

The final fragment looks like this:

```text
#v2.r.<key>.<iv>.<ciphertext>
#v2.p.<salt>.<iv>.<ciphertext>
```

`r` means random key, `p` means password. The `v2` prefix lets the parser reject unknown formats with a friendly message instead of failing halfway through.

## What “zero-knowledge” does and does not mean

It is easy to make this sound stronger than it is. The honest version:

- The fragment is not included in HTTP requests. It does not appear in server access logs, CDN logs, or referrer headers.
- The host still serves the JavaScript that performs the encryption. If you do not trust the host, run the app yourself.
- A random-key link is a bearer token. Forwarding the link is the same as forwarding the key.
- The host can still see metadata such as your IP address and when you opened the app. It cannot see the paste content.
- Browser extensions, clipboard managers, screenshots, and anyone looking over your shoulder can see the plaintext.
- Do not add analytics that log full URLs. The fragment is the private part, and a single careless event can leak it.

This design keeps paste content out of requests and server-side storage. It is not a promise that the hosted page can never be malicious.

## Size limits

The link is the storage, so the limit is the URL, not a database row.

| Level         | URL length        | What happens                                 |
| ------------- | ----------------- | -------------------------------------------- |
| Normal        | under 3,200 chars | No warning                                   |
| Soft warning  | 3,200–3,999 chars | “Approaching safe limit”                     |
| Large warning | 4,000–8,000 chars | “May fail in some browsers/messenger apps”   |
| Hard block    | over 8,000 chars  | Generate button is disabled                  |
| QR code       | over ~2,000 chars | QR button is disabled; copy the link instead |

The counter shows the estimated final URL length while you type. It runs synchronously; the real encryption is async because AES-GCM and Argon2 are async.

## Benchmark: the 25% lesson

The first version of the format looked reasonable: compress, Base64 the payload, wrap it in JSON, encrypt the JSON string, Base64 again, then put it in the URL. The second Base64 round was the problem.

Base64 makes data about 33% larger. Doing it twice multiplies the overhead:

```text
(4/3) × (4/3) = 1.78×
```

DEFLATE cut the sample to about 55% of its original size. The double Base64 tax brought it back to roughly 97%. The compressor was working; the envelope was wasting the gain.

The fix was to stop encoding the payload as text before encryption. Version 2 encrypts a binary envelope and performs Base64URL only once, after encryption.

### The numbers

Sample: `scripts/fixtures/benchmark-sample.txt` (4,669 characters, 4,730 UTF-8 bytes). It is a realistic Markdown document with prose, tables, and code fences.

| Algorithm                 | Compressed bytes | Share of raw |
| ------------------------- | ---------------: | -----------: |
| deflate level 1           |            2,628 |        55.6% |
| deflate level 6 (current) |            2,586 |        54.7% |
| deflate level 9           |            2,586 |        54.7% |
| gzip level 9              |            2,604 |        55.1% |

Changing the DEFLATE level or adding a gzip wrapper moved the result by less than 50 bytes. The big win came from the envelope:

|                    | v1 (JSON, double Base64) | v2 (binary, single Base64) |
| ------------------ | -----------------------: | -------------------------: |
| Fragment length    |              4,725 chars |            **3,543 chars** |
| `estimateLength()` |              4,727 chars |    **3,543 chars (exact)** |
| Saving             |                        — |    **1,182 chars (25.0%)** |

<img src="https://shieldcn.dev/chart/json.svg?values=4725,3543&title=URL%20fragment%20length%3A%20v1%20%E2%86%92%20v2%20(chars)&theme=emerald&area=true" alt="Chart showing the URL fragment shrinking from 4,725 characters in v1 to 3,543 characters in v2" width="720" />

### Reproduce it

The benchmark lives in `scripts/`, outside the gitignored `docs/` folder, and runs against the real encoder:

```bash
bun run bench
```

You can also point it at any text file:

```bash
bun scripts/bench-compress.ts path/to/your-file.md
```

The script prints the stage-by-stage byte counts, the final fragment length, the estimate, and the algorithm comparison. Your numbers will differ with your input. The useful part is the shape: check the envelope before blaming the compressor.

## Run locally

You need [Bun](https://bun.sh) 1.4 or newer (the repo is developed with Bun 1.4.4).

```bash
bun install
bun run dev
```

The dev server starts at `http://localhost:5173`. `localhost` counts as a secure context, so Web Crypto and the clipboard API work without HTTPS during development.

Useful commands:

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `bun run dev`      | Start Vite with hot reload                      |
| `bun test`         | Run the test suite with Bun’s test runner       |
| `bun run coverage` | Run tests with coverage                         |
| `bun run check`    | Type-check, lint, format-check, test, and build |
| `bun run build`    | Create the production build in `dist/`          |
| `bun run preview`  | Serve the production build locally              |
| `bun run bench`    | Run the compression benchmark                   |

## Project map

```text
src/app/                  App shell and hash-based routing
src/pages/                Create and read screens
src/features/bin/         Compression, crypto, fragment codec, Markdown UI
src/shared/               UI strings and clipboard helpers
scripts/                  Compression benchmark and its sample fixture
```

`docs/` is intentionally ignored by Git. It holds local design notes and decision records, not part of the published project.

## Deployment notes

The app is a static SPA. `bun run build` produces `dist/`, which can be served by any static host.

- **HTTPS is required in production.** `crypto.subtle` and `navigator.clipboard` are restricted to secure contexts.
- **Keep `wasm-unsafe-eval` in the Content Security Policy.** `hash-wasm` compiles its WebAssembly module at runtime. Removing that directive breaks password links in production while everything still works on localhost.
- **No rewrites are needed for paste routing.** The path is always `/`; the paste state is in the fragment.
- **Strip fragments before logging.** If analytics are ever added, make sure they never record the full URL.

## Further reading

- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [MDN: URL fragment](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)
- [fflate](https://github.com/101arrowz/fflate)
- [hash-wasm](https://github.com/Daninet/hash-wasm)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Vite guide](https://vite.dev/guide/)

## Status

This is an MVP for learning. It does not have accounts, server-side storage, real expiry, burn-after-read, or image uploads. Those features would either need a server or break the “URL is the database” constraint.

The most interesting part of the project is not the UI. It is the moment you realize that compression, encryption, and URL encoding all compete for the same byte budget, and that changing the envelope can matter more than changing the algorithm.
