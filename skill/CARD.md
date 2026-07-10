# WCP SPA Theme Settings

Embed WCP theme switching (Settings modal, .wcpt import, URL sharing, seasonal collections) into any WCP-compliant SPA

Adds a complete, ready-to-use theme settings system to an existing
single-page application that already uses the WCP (Widget Context
Protocol) `--wcp-*` CSS custom property token layer -- a gear-icon
settings button, a tabbed modal (Theme / About / WCP), a theme engine
that reads and applies `--wcp-*` variables, `.wcpt` file import via
JSZip, shareable theme URLs, and an optional seasonal collections
dropdown with four bundled collections (Spring, Summer, Autumn, Winter).
Rather than building a settings UI from scratch, the agent copies a set
of proven CSS/HTML/JS fragments into the target site in a defined order.

Reach for this whenever a WCP-compliant SPA needs its users to be able
to switch themes, share a themed URL with someone else, or import a
custom `.wcpt` theme file, without writing that system by hand. The
target SPA must already use `--wcp-*` CSS custom properties as its
design token layer -- see WCP SPA WCP Compliance for that prerequisite
step if it doesn't yet.

Ships with Python contract tests verifying the token and id
cross-references between the copied fragments stay consistent, and
carries the same SYSTEM.md external-registry verification as every
other package in this ecosystem.

**Version:** 2.0.3
**Author:** Anthony Harrison
**License:** MIT
**Package ID:** `com.penrithbeacon.wcp-spa-theme-settings`
**Package UUID:** `515af161-bbcc-4170-a376-7b8f74480849`
**Homepage:** https://openaiskillpackage.com/

---

## Capabilities

- `filesystem.read`
- `filesystem.write`

## Permissions

_None declared._

---

*Generated deterministically by `build_card.py` from `manifest.yaml` — do not hand-edit.
Re-run `build_card.py` after any `manifest.yaml` change, before packaging.*
