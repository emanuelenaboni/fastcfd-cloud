# Versioning and historical releases

The known local line contains nine distributions from `3.23.0` through `3.24.7`. The current cloud source is based on `3.24.7 Student`.

## Policy

- Upstream-style tool versions: `3.24.7`.
- Cloud packaging versions: `3.24.7-cloud.1`, `3.24.7-cloud.2`, and so on.
- Git tags: `v3.24.7-cloud.1` for cloud releases and `legacy-v3.24.7` for immutable historical package assets.
- Historical ZIPs are GitHub Release assets, not duplicated in the main source tree.
- `archive/versions.json` records SHA-256 checksums so published assets can be verified against the originals.

Versions that have no original ZIP are packaged from the preserved version directory and marked `repacked_from_directory` in the release notes.
