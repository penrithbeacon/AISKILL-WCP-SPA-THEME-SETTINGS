# Changelog — WCP SPA Theme Settings

All notable changes to this skill are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

This package had no `CHANGELOG.md` and no `changelog` field in its manifest prior to this
retrofit — the entries below were recovered from the shipped package's own `README.md`,
which itself was one version stale (headed "v1.3.1" while `manifest.yaml` already said
1.3.2). Per-version dates were not recorded anywhere recoverable.

---

## [2.0.3] — 2026-07-10

### Added
- **BREAKING** (`.aiskill` spec v2.3.0): new required manifest field
  `synopsis` — a multi-paragraph, hand-authored expansion of `description`,
  feeding both `README.md`'s opening and `CARD.md`'s rendering

### Fixed
- Repo-root `README.md` and `skill/README.md` had diverged and both still
  referenced a stale `v1.3.2` — unified into one byte-identical README,
  version references corrected

## [2.0.2] — 2026-07-10

### Added
- **BREAKING:** `SYSTEM.md` is now a fourth required package file
  (`.aiskill` spec v2.2.0) — an invariant, versioned verification protocol
  every AI agent must follow before executing `SKILL.md`
- New required manifest field `system_protocol_version`

## [2.0.1] — 2026-07-10

### Added
- Bundled `skill/LICENSE.txt` (MIT) — conforms to the v2.1.0 `.aiskill` spec's
  optional bundled license file

## [2.0.0]

### Changed
- **BREAKING:** `CARD.md` is now a third REQUIRED package file, alongside `manifest.yaml` and
  `SKILL.md` — generated deterministically by `build_card.py` from `manifest.yaml`

## [1.3.2]

Current shipped state as recovered from the `.aiskill` archive. The specific changes made
since 1.3.1 were not documented anywhere recoverable at retrofit time.

## [1.3.1]

### Fixed
- `WCP_BUILTIN_THEMES` exposed as `window.WCP_BUILTIN_THEMES` so the URL export IIFE can access it
- `loadSeasonalThemes` `.catch` no longer re-firing the callback if render threw

### Added
- Four seasonal `.wcpt` files bundled in `assets/themes/` — no longer sourced externally
- Step 11 now references the bundled files with exact IDs and filenames

## [1.3.0]

### Added
- Theme collections dropdown (My Themes, seasonal, user-imported)
- URL export panel with a shareable theme query string
- URL export info modal
- AI Skill PKG tab

## [1.0.0] – [1.2.0]

Initial releases. Individual version changes were not preserved — collapsed into this single
range as recorded in the shipped package's own README at retrofit time.
