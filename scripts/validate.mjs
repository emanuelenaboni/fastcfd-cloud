import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicDir = join(root, "public");
const required = [
  "index.html",
  "fastcfd-cloud.js",
  "fastcfd-config.js",
  "three.min.js",
  "OrbitControls.js",
  "3DMLoader.js",
  "rhino3dm.js",
  "rhino3dm.wasm",
];

const errors = [];
for (const name of required) {
  try {
    const info = await stat(join(publicDir, name));
    if (!info.isFile() || info.size === 0) errors.push(`${name}: missing or empty`);
  } catch {
    errors.push(`${name}: missing`);
  }
}

const html = await readFile(join(publicDir, "index.html"), "utf8");
for (const marker of ["FastCFD Urban Studio v3.24.7", "fastcfd-config.js", "fastcfd-cloud.js"]) {
  if (!html.includes(marker)) errors.push(`index.html: missing ${marker}`);
}
if (!html.includes("function reportReady(){var s=st();return !!(s.hasResults&&s.metrics);}")) {
  errors.push("index.html: non-blocking report readiness policy not found");
}
if (/onlyConverged/.test(html)) {
  errors.push("index.html: obsolete convergence export gate found");
}

const versions = JSON.parse(await readFile(join(root, "archive", "versions.json"), "utf8"));
if (versions.canonical_version !== "3.24.7" || !Array.isArray(versions.versions)) {
  errors.push("archive/versions.json: invalid canonical version manifest");
} else {
  const names = versions.versions.map((entry) => entry.version);
  for (const expected of ["3.23.0", "3.24.0", "3.24.1", "3.24.2", "3.24.3", "3.24.4", "3.24.5", "3.24.6", "3.24.7"]) {
    if (!names.includes(expected)) errors.push(`archive/versions.json: missing ${expected}`);
  }
  for (const entry of versions.versions) {
    if (!/^[a-f0-9]{64}$/.test(entry.html_sha256 || "")) {
      errors.push(`archive/versions.json: invalid HTML checksum for ${entry.version}`);
    }
  }
}

const cloud = await readFile(join(publicDir, "fastcfd-cloud.js"), "utf8");
if (!cloud.includes("https://www.googleapis.com/auth/drive.file")) {
  errors.push("fastcfd-cloud.js: least-privilege Drive scope missing");
}
if (/client_secret|private_key|refresh_token/i.test(cloud)) {
  errors.push("fastcfd-cloud.js: forbidden credential material marker");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /"client_secret"\s*:/i,
  /"refresh_token"\s*:/i,
];
for (const file of await walk(root)) {
  if (!/\.(?:html|js|mjs|json|md|txt|ya?ml)$/i.test(file)) continue;
  const text = await readFile(file, "utf8").catch(() => "");
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    errors.push(`${file.slice(root.length + 1)}: possible secret`);
  }
}

const hash = createHash("sha256").update(html).digest("hex");
if (errors.length) {
  console.error("Validation failed:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log(`Validation passed. FastCFD 3.24.7 cloud bundle SHA-256 ${hash}`);
