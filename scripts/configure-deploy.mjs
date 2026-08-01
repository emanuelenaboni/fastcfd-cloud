import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const clientId = String(process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
const config = `window.FASTCFD_CLOUD_CONFIG = Object.freeze({
  googleClientId: ${JSON.stringify(clientId)},
  driveFolderName: "FastCFD Cloud Reports",
  driveScope: "https://www.googleapis.com/auth/drive.file",
  alsoDownloadReports: false,
});
`;
await writeFile(resolve(root, "public", "fastcfd-config.js"), config, "utf8");
console.log(clientId ? "Google Drive OAuth client configured for deployment." : "Google Drive OAuth client is not configured; deployment will keep local-download fallback.");
