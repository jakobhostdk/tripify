// Bundle the Chrome extension into a downloadable zip served from /public.
// Runs automatically before `next build` via npm's lifecycle "prebuild".
// Silently no-ops when the extension/ directory isn't present (e.g. in a
// trimmed clone), so it never blocks a Next build.

import { createRequire } from "node:module";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// archiver still ships as CJS — pull it in via createRequire to keep this
// script as plain ESM with no top-level await indirection.
const require = createRequire(import.meta.url);
const archiver = require("archiver");

const ROOT = process.cwd();
const EXT_DIR = path.join(ROOT, "extension");
const OUT_DIR = path.join(ROOT, "public");
const OUT_FILE = path.join(OUT_DIR, "tripify-extension.zip");

if (!existsSync(EXT_DIR)) {
  console.log("[build-extension-zip] no extension/ — skipping");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const out = createWriteStream(OUT_FILE);
const archive = archiver("zip", { zlib: { level: 9 } });

archive.on("error", (err) => {
  console.error("[build-extension-zip] archiver error:", err);
  process.exit(1);
});

out.on("close", () => {
  const kb = (archive.pointer() / 1024).toFixed(1);
  console.log(`[build-extension-zip] ${OUT_FILE} (${kb} kB)`);
});

archive.pipe(out);
archive.directory(EXT_DIR, false, (entry) => {
  // Skip dot-files and the README inside the zip — the README is for the repo,
  // not for users who load the unpacked folder.
  if (entry.name.startsWith(".") || entry.name === "README.md") return false;
  return entry;
});
await archive.finalize();
