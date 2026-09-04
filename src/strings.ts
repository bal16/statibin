// Centralized English UI strings (PRD §1: UI is English, PRD is Indonesian).
// All user-visible text must come from here — no hardcoded strings in components.

export const strings = {
  appTitle: "Statibin",
  appTagline: "Serverless pastebin — the URL is the database.",

  editorPlaceholder: "Paste your Markdown here...",
  preview: "Preview",
  edit: "Edit",
  protectWithPassword: "Protect with password",
  passwordPlaceholder: "Enter password",
  unlock: "Unlock",
  generateLink: "Generate Link",
  copy: "Copy",
  copied: "Copied!",
  showQrCode: "Show QR Code",
  editAsNewPaste: "✏️ Edit as new paste",
  renderAnyway: "Render anyway",

  sizeUnit: (used: number, limit: number) =>
    `${used.toLocaleString("en-US")} / ${limit.toLocaleString("en-US")} chars`,
  approachingSafeLimit: "Approaching safe limit",
  largeSizeWarning: "Large size — may fail in some browsers/messenger apps",
  exceedsMaximum: "Exceeds maximum size — please shorten your content",
  qrTooLarge: "Too large for QR code — copy the link instead.",
  previewDisabledLarge: "Preview disabled for very large pastes —",

  lostLinkWarning: "⚠️ This link cannot be recovered if lost. Store it safely.",
  createdOn: (date: string) => `Created on ${date}`,

  errIncompleteLink: "This link looks incomplete or corrupted.",
  errNewerFormat: "This link uses a newer format. Please update the app.",
  errWrongPasswordOrCorrupted: "Wrong password or corrupted link.",
} as const;
