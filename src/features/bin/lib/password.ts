// Password-based key derivation: Argon2id via hash-wasm (PRD §3.3).
// Baseline params — MUST be re-benchmarked on a budget Android device
// before final (target: decrypt < 2s). Parallelism stays 1 so no
// Web Worker / SharedArrayBuffer / COOP+COEP headers are needed.

export const ARGON2_MEMORY_KIB = 19 * 1024; // 19 MiB
export const ARGON2_ITERATIONS = 2;
export const ARGON2_PARALLELISM = 1;
export const ARGON2_HASH_LENGTH = 32; // 256-bit key for AES-GCM
export const SALT_BYTES = 16; // 128-bit salt per paste

export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  // Argon2 ships as WebAssembly (~28 kB). Most pastes are random-mode, so only
  // pay for it when a password is actually used.
  const { argon2id } = await import("hash-wasm");
  const out = await argon2id({
    password,
    salt: new Uint8Array(salt),
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: "binary",
  });
  return new Uint8Array(out as Uint8Array);
}
