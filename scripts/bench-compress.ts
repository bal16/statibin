// Re-runnable compression benchmark for Statibin pipeline decisions.
// Usage (from repo root): bun scripts/bench-compress.ts [path-to-text-file]
// Defaults to the bundled sample in scripts/fixtures/benchmark-sample.txt.
import { deflateSync, gzipSync, strToU8 } from "fflate";
import { encodeText } from "../src/features/bin/lib/compress.ts";
import { estimateLength } from "../src/features/bin/lib/utils.ts";
import { encodeRandom } from "../src/features/bin/lib/fragment.ts";

const defaultFile = new URL("./fixtures/benchmark-sample.txt", import.meta.url).pathname;
const file = process.argv[2] ?? defaultFile;
const text = await Bun.file(file).text();
const raw = strToU8(text);
const b64 = (n: number) => Math.ceil(n / 3) * 4;

console.log(`input: ${file}`);
console.log(`text chars: ${text.length} | utf8 bytes: ${raw.length}`);
console.log("");

const rows: Array<[string, number]> = [];
for (const level of [1, 6, 9] as const) {
  const d = deflateSync(raw, { level });
  rows.push([`deflate L${level}`, d.length]);
}
const gz = gzipSync(raw, { level: 9 });
rows.push(["gzip L9", gz.length]);

// v2 actual: full pipeline through the real encoder (binary envelope,
// single base64url round since the 2026-09-05 migration)
const enc = encodeText(text);
const frag = await encodeRandom(text);
console.log("--- stage breakdown (current v2, mode r, no password) ---");
console.log(`raw utf8 bytes:        ${raw.length}`);
console.log(
  `deflated bytes:        ${Math.ceil((enc.dataB64u.length * 3) / 4)} (flag=${enc.compressed})`,
);
console.log(
  `envelope bytes:        ${Math.ceil((enc.dataB64u.length * 3) / 4) + 5} (1 flag + 4 epoch + payload)`,
);
console.log(`envelope+tag bytes:    ${Math.ceil((enc.dataB64u.length * 3) / 4) + 5 + 16}`);
console.log(
  `ciphertext as b64u:    ${b64(Math.ceil((enc.dataB64u.length * 3) / 4) + 5 + 16)} (single round)`,
);
console.log(`fixed fields (#v2.r.+key+iv+seps): 65`);
console.log(`fragment actual:       ${frag.length}`);
console.log(`estimate():            ${estimateLength(text, false)}`);
console.log("");
// Archived v1 measurement (JSON envelope, double base64url) for this exact
// sample, taken pre-migration. It only makes sense for the bundled fixture.
const V1_REFERENCE = 4725;
if (file.endsWith("benchmark-sample.txt")) {
  console.log("--- vs archived v1 (bundled sample only) ---");
  console.log(`v1 fragment (archived): ${V1_REFERENCE}`);
  console.log(
    `saving:                 ${V1_REFERENCE - frag.length} chars (${(((V1_REFERENCE - frag.length) / V1_REFERENCE) * 100).toFixed(1)}%)`,
  );
} else {
  console.log("--- vs archived v1: skipped (reference is defined for the bundled sample only) ---");
}
console.log("");
console.log("--- algorithm comparison (compressed bytes) ---");
for (const [name, len] of rows) {
  console.log(`${name}: ${len} bytes (${((len / raw.length) * 100).toFixed(1)}% of raw)`);
}
