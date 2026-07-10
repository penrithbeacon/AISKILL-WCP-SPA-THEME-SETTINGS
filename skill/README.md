# AISKILL-WCP-SPA-THEME-SETTINGS

**WCP SPA Theme Settings** — Embed WCP theme switching (Settings modal, .wcpt import, URL sharing, seasonal collections) into any WCP-compliant SPA

Adds a complete, ready-to-use theme settings system to an existing single-page application that already uses the WCP (Widget Context Protocol) `--wcp-*` CSS custom property token layer — a gear-icon settings button, a tabbed modal (Theme / About / WCP), a theme engine that reads and applies `--wcp-*` variables, `.wcpt` file import via JSZip, shareable theme URLs, and an optional seasonal collections dropdown with four bundled collections (Spring, Summer, Autumn, Winter). Rather than building a settings UI from scratch, the agent copies a set of proven CSS/HTML/JS fragments into the target site in a defined order.

Reach for this whenever a WCP-compliant SPA needs its users to be able to switch themes, share a themed URL with someone else, or import a custom `.wcpt` theme file, without writing that system by hand. The target SPA must already use `--wcp-*` CSS custom properties as its design token layer — see WCP SPA WCP Compliance for that prerequisite step if it doesn't yet.

Ships with Python contract tests verifying the token and id cross-references between the copied fragments stay consistent, and carries the same SYSTEM.md external-registry verification as every other package in this ecosystem.

| | |
|---|---|
| Version | `2.0.3` |
| License | `MIT` |
| Author | Anthony Harrison |
| Homepage | https://openaiskillpackage.com/ |
| Spec | [Open AI Skill Package Specification](https://openaiskillpackage.com/) |

---

## What This Skill Does

Adds a complete, ready-to-use theme settings system to an existing single-page application
that already uses the WCP (Widget Context Protocol) `--wcp-*` CSS custom property token
layer. Rather than building a settings UI from scratch, the agent copies a set of proven
CSS/HTML/JS fragments into the target site in a defined order: a gear-icon settings button,
a tabbed modal (Theme / About / WCP), a theme engine that reads and applies `--wcp-*`
variables, `.wcpt` file import via JSZip, shareable theme URLs, and an optional seasonal
collections dropdown with four bundled collections (Spring, Summer, Autumn, Winter).

Use this when you have a WCP-compliant SPA and want its users to be able to switch themes,
share a themed URL with someone else, or import a custom `.wcpt` theme file — without
writing that system yourself.

---

## Prerequisites

Before using this skill, ensure the following are available in the AI agent's environment:

- The target SPA must already use WCP `--wcp-*` CSS custom properties as its design token layer
- A browser context (not `file://`) — the theme engine needs `localStorage`/`sessionStorage`
- [JSZip](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js) loaded via CDN (for `.wcpt` import), unless already bundled
- Python 3.8+ is only needed for this repo's own test suite, not for using the skill itself

---

## Quick Start

1. Download `WCP-SPA-THEME-SETTINGS-2.0.3.aiskill` from the [Releases](https://github.com/PenrithBeacon/AISKILL-WCP-SPA-THEME-SETTINGS/releases) page
2. Give your AI agent the following prompt:

```
Using the Skill Package at /path/to/WCP-SPA-THEME-SETTINGS-2.0.3.aiskill,
[describe what you want the skill to do, e.g. 'audit the contrast of /path/to/saved-page.html']
```

---

## Skill Archive Contents

```
WCP-SPA-THEME-SETTINGS-2.0.3.aiskill  (ZIP archive)
├── manifest.yaml          # identity & metadata
├── SKILL.md               # AI entry point — execution instructions
├── README.md              # this file — byte-identical to the repo-root copy
├── CHANGELOG.md           # version history
├── checksums.yaml         # SHA-256 integrity hashes
├── assets/
│   ├── scripts/
│   │   ├── js-wcp-theme-engine.js        # core theme state machine
│   │   ├── js-theme-modal-controller.js  # modal UI logic
│   │   └── js-theme-url-export.js        # optional URL export IIFE
│   ├── templates/          # CSS + HTML fragments copied into the target SPA
│   ├── themes/             # 4 bundled seasonal .wcpt collections
│   └── tests/              # Python contract tests (token/id cross-reference checks)
└── inputs/
    └── schema.json         # intentionally empty -- no structured inputs
```

---

## Development Workflow

To modify and repackage this skill:

```bash
# 1. Clone the source
git clone https://github.com/PenrithBeacon/AISKILL-WCP-SPA-THEME-SETTINGS.git
cd AISKILL-WCP-SPA-THEME-SETTINGS

# 2. Edit skill files in skill/
#    - skill/SKILL.md       — execution instructions
#    - skill/assets/scripts/ — the computation
#    - skill/assets/tests/   — unit tests

# 3. Run tests (must pass before packaging)
python3 -m pytest skill/assets/tests/ -v

# 4. Package
python3 skill/assets/scripts/pack.py \
  --skill-dir skill/ \
  --dist-dir dist/

# 5. Bump version in skill/manifest.yaml, update skill/CHANGELOG.md

# 6. Commit, tag, and release
git add -A
git commit -m "feat: WCP-SPA-THEME-SETTINGS v[NEW-VERSION]"
git push origin main
git tag v[NEW-VERSION]
git push origin v[NEW-VERSION]
gh release create v[NEW-VERSION] dist/WCP-SPA-THEME-SETTINGS-[NEW-VERSION].aiskill \
  --title "v[NEW-VERSION]" --notes "..."
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## License

MIT

---

## Contact

**Anthony Harrison**
For questions or contributions, open an issue on [GitHub](https://github.com/PenrithBeacon/AISKILL-WCP-SPA-THEME-SETTINGS).
