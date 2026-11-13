// Centralized English UI strings (PRD §1: UI is English, PRD is Indonesian).
// All user-visible text must come from here — no hardcoded strings in components.

export const strings = {
  appTitle: "Statibin",
  appTagline: "Serverless pastebin — the URL is the database.",
  // One hard fact on the first screen (HARD_LIMIT is 8000, keep in sync).
  hardFact: "One link holds up to 8,000 encrypted characters — the server never sees them.",

  editorPlaceholder: "Paste your Markdown here",
  editorLabel: "Markdown",
  previewLabel: "Preview",
  preview: "Preview",
  edit: "Edit",
  protectWithPassword: "Protect with password",
  passwordPlaceholder: "Enter password",
  unlock: "Unlock",
  unlockTitle: "This paste is locked",
  unlockHint: "It is decrypted in your browser only.",
  passwordLabel: "Password",
  decrypting: "Decrypting paste",
  errTitle: "Could not open this link",
  generateLink: "Generate Link",
  copy: "Copy",
  copied: "Copied!",
  showQrCode: "Show QR Code",
  close: "Close",
  editAsNewPaste: "Edit as new paste",
  renderAnyway: "Render anyway",

  sizeUnit: (used: number, limit: number) =>
    `${used.toLocaleString("en-US")} / ${limit.toLocaleString("en-US")} chars`,
  approachingSafeLimit: "Approaching safe limit",
  largeSizeWarning: "Large size — may fail in some browsers/messenger apps",
  exceedsMaximum: "Exceeds maximum size — please shorten your content",
  qrTooLarge: "Too large for QR code — copy the link instead.",
  previewDisabledLarge: "Preview disabled for very large pastes —",

  lostLinkWarning: "This link cannot be recovered if lost. Store it safely.",
  createdOn: (date: string) => `Created on ${date}`,

  errIncompleteLink: "This link looks incomplete or corrupted.",
  errNewerFormat: "This link uses a newer format. Please update the app.",
  errWrongPasswordOrCorrupted: "Wrong password or corrupted link.",
  errPasswordCheckFailed:
    "Could not run the password check on this device or browser. Try a different browser.",
  errGenerateFailed: "Could not generate the link. Please try again.",
} as const;
