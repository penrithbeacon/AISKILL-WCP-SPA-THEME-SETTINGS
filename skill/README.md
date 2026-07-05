# WCP SPA Theme Settings

Embeds a complete WCP Settings modal into any WCP-compliant single-page application: theme
switching, `.wcpt` file import, shareable theme URLs, and a seasonal collections dropdown.

**Version:** 1.3.2
**License:** MIT
**Author:** Anthony Harrison
**Homepage:** https://openaiskillpackage.com/
**WCP spec version:** 2.2.1

---

## Prerequisites

The target SPA must already:

1. Use WCP `--wcp-*` CSS custom properties for all colours, typography, spacing, and layout.
2. Serve its own `--wcp-*` defaults as a `:root {}` block (or equivalent) as the fallback layer.
3. Load from a context where `localStorage` and `sessionStorage` are available (a standard
   browser context, not `file://`).

No server-side changes are needed — everything is client-side JavaScript, plus [JSZip](https://stuk.github.io/jszip/)
loaded from CDN for `.wcpt` file import.

---

## Quick Start

This is a manual integration skill, not a single script — there is no one-command entry
point. The agent works through eleven integration steps described in `SKILL.md`, copying
CSS/HTML fragments from `assets/templates/` and JavaScript from `assets/scripts/` into the
target SPA in a specific order, then verifies the result against the conformance checklist
at the end of `SKILL.md` before reporting the task complete.

---

## Inputs

There is no structured input schema — the "input" is the target SPA's existing `index.html`
(or equivalent) and its current WCP token usage, which the agent reads directly. See
`inputs/schema.json` (intentionally empty) and `SKILL.md`'s Example Prompt section for the
kind of natural-language brief this skill expects.

---

## Output

The target SPA gains, in place, with no separate output file:

- A gear-icon Settings button in the masthead
- A three-tab modal (Theme / About / WCP, optionally a fourth AI Skill PKG tab)
- Theme switching between built-in, seasonal, and user-imported themes
- `.wcpt` file import and shareable theme URLs
- Four bundled seasonal `.wcpt` collections in `assets/themes/`, ready to deploy alongside
  the target site if Step 11 (optional) is applied

---

## Source Repository

https://github.com/PenrithBeacon/AISKILL-WCP-SPA-THEME-SETTINGS
