# FastCFD Cloud

FastCFD Cloud packages FastCFD Urban Studio `3.24.7` as a browser-hosted CFD screening tool that can be developed and tested from Codex cloud, published as a static web application, and connected to Google Drive for report storage.

## Current capabilities

- Runs entirely in a modern browser; no Rhino or Windows installation is required.
- Imports OpenStreetMap context and 3DM, OBJ, DXF, or saved FastCFD projects.
- Produces HTML reports, PNG plates, CSV metrics, project packages, campaign outputs, and QA manifests.
- Generates reports after any simulation result is available. Convergence never blocks export; the solver state and residual remain visible in the report.
- Saves generated files to each user's `FastCFD Cloud Reports` folder after Google Drive authorization.
- Falls back to a normal browser download if Drive is unavailable.
- Preserves the offline `3.24.7 Student` distribution and its evidence files.

FastCFD is a design-screening tool, not a certified three-dimensional CFD solver or a compliance engine. Reports must be interpreted with their recorded grid, solver state, residual, geometry warnings, and limitations.

## Run locally

```bash
npm install
npm run validate
npm run serve
```

Open `http://127.0.0.1:4173`.

## Test

```bash
npx playwright install chromium
npm run test:smoke
```

## Google Drive

The public app requests only the `drive.file` OAuth scope. This allows FastCFD to create and manage files it owns without requesting access to the user's entire Drive.

1. Create a Google OAuth 2.0 Web client.
2. Add the deployed FastCFD origin to Authorized JavaScript origins.
3. Set the GitHub repository variable `GOOGLE_OAUTH_CLIENT_ID`.
4. Deploy the Pages workflow.
5. In FastCFD, click **CONNETTI DRIVE** and approve access.

The access token remains in browser memory and is not committed, persisted, or sent to the FastCFD repository.

## Repository map

- `public/`: deployable application.
- `tests/`: browser smoke tests.
- `scripts/`: local server and validation utilities.
- `docs/`: architecture, security, report, and migration guidance.
- `archive/versions.json`: inventory and checksums of known local releases.
- `docs/evidence/`: preserved `3.24.7` QA and setup evidence.

## Versioning

The cloud distribution uses SemVer build names such as `3.24.7-cloud.1`. Historical desktop/student packages are tracked by checksum and are intended to be attached to matching GitHub Releases. See [docs/VERSIONING.md](docs/VERSIONING.md).

## License

FastCFD Cloud is released under the MIT License. Bundled third-party components retain their own notices; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
