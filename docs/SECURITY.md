# Security

## Credentials

- Never commit Google OAuth client secrets, access tokens, refresh tokens, service-account JSON, AI API keys, or cookies.
- The Google OAuth Web client ID is public configuration, not a secret; deployment injects it from a GitHub repository variable.
- The optional external commentary key in the legacy UI remains user-supplied. It must not be present in fixtures, screenshots, logs, or reports.

## Google Drive

FastCFD uses the least-privilege `drive.file` scope. A deployment must not widen this to full-Drive access without a separate security review.

## Static hosting

The app is intended for HTTPS hosting. Localhost interception exists only as a compatibility adapter and never sends report data to a real localhost service in the cloud distribution.

## Scientific integrity

Convergence does not block exports by product decision. Reports must therefore expose solver state and warnings without ambiguity. Removing the warning or mislabelling a provisional run as certified is a security and integrity defect.

## Reporting vulnerabilities

Do not publish sensitive project geometry or OAuth data in public issues. Use a private maintainer channel for security reports until a dedicated disclosure address is configured.
