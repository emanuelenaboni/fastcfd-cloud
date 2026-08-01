# Architecture

## Runtime

FastCFD Cloud is a static browser application. The Lattice-Boltzmann solver, geometry processing, visualization, and report generation run in the user's browser. Static hosting therefore does not receive project geometry or solver fields.

The deployable entry point is `public/index.html`. Bundled Three.js and rhino3dm assets are served from the same origin. OpenStreetMap and weather requests remain direct browser requests to their documented providers.

## Report storage

`public/fastcfd-cloud.js` is a compatibility bridge around the existing output paths:

1. It wraps the global `downloadBlob` function.
2. It intercepts generated `data:` and `blob:` downloads.
3. It replaces the legacy `http://127.0.0.1:8971/` report endpoint with an in-browser storage adapter.
4. With Drive connected, files are uploaded through Google Drive multipart upload.
5. Without Drive, or after an upload error, the browser downloads the artifact so output is not lost.

The bridge lets existing report generators remain usable while removing the local-PC save server.

## Google Drive trust boundary

- OAuth uses Google Identity Services in the browser.
- Scope: `https://www.googleapis.com/auth/drive.file`.
- Access tokens are held only in JavaScript memory and disappear on refresh.
- No client secret is used by the static web application.
- The app creates or reuses a folder named `FastCFD Cloud Reports` among files visible to this OAuth client.
- Every third-party user authorizes their own Drive; the public deployment does not write to the maintainer's Drive.

## Codex cloud

Codex cloud clones the GitHub repository, runs `npm ci`, and can execute the validators and Playwright suite. The application itself is deployed by GitHub Pages, so development and testing do not depend on the original Windows machine.
