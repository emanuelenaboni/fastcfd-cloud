# FastCFD Cloud repository guidance

## Product invariants

- Keep the application browser-only and cloud-deployable.
- Do not introduce machine-specific paths or a localhost-only report dependency.
- A report may be generated from any available simulation result; convergence must not disable report controls.
- Every report must disclose solver state, residual when available, run length, grid, and material limitations.
- Do not describe provisional or two-dimensional screening output as certified CFD or code compliance.
- Google Drive access must use OAuth with the least-privilege `drive.file` scope. Never commit OAuth tokens, client secrets, service-account keys, API keys, or refresh tokens.
- If Drive upload fails, preserve the artifact with a browser download and show the failure to the user.
- Preserve OpenStreetMap attribution in maps and reports.

## Required checks

Before proposing a release:

```bash
npm ci
npm run validate
npm run test:smoke
```

For changes to the solver or report generators, add a reproducible fixture and report the solver status explicitly.

## Versioning

- The imported application version remains `3.24.7` until FastCFD functionality changes.
- Cloud integration changes increment the `-cloud.N` suffix.
- Historical distributions are immutable release assets; never rewrite them.
