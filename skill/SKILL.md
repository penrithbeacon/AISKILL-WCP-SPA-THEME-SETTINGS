# WCP SPA Theme Settings — Embed WCP Theme Switching into Any Existing WCP-Compliant SPA
**AI Skill UUID:** `d02cc465-6331-43f4-9aea-fe30a9842e08`

**Document file path:** `WCP-SPA-THEME-SETTINGS.md`

**Skill version:** `1.3.1`
**Skill type code:** Procedural
**Skill type context:** WCP SPA theme management — settings modal + URL import
**Skill type description:** Applies whenever a WCP-compliant SPA needs a user-facing Settings modal for theme switching (radio list), `.wcpt` file import, and URL query string theme injection.
**Applies when:** Embedding the WCP settings modal system into an existing single-page application that already uses WCP `--wcp-*` CSS custom properties as its design token layer.

**References:**
- [Widget Context Protocol — WCP Spec](https://wcp.widgetcontextprotocol.com) — defines the full `--wcp-*` CSS custom property token set
- [WCP Developer Guide](https://dev.widgetcontextprotocol.com) — theme adoption patterns, `postMessage` API, compliance checklists
- [WCP Portability Protocol — WCPP](https://wcpp.widgetcontextprotocol.com) — `.wcpt` theme file format and `com.widgetcontextprotocol.theme` URL parameter

---

## Overview

This skill provides a turnkey way to add full WCP theme management to any SPA that already uses WCP `--wcp-*` CSS custom properties. The source of truth for all code is the Captain John Peck SPA at:

```
/Volumes/websites/sites/client-captain-john-peck-project-banners/_spa/index.html
```

All code templates live in the same directory as this skill:

```
/Volumes/dashboard/wcp-themes/code-templates/website-settings-templates/
```

**What you get:**

| Feature | Description |
|---|---|
| Settings gear button | Icon button in the masthead opens the Settings modal |
| Three-tab modal | Theme / About / WCP pane |
| Theme radio list | Built-in (default) + named built-in themes + user-imported themes |
| `.wcpt` file import | JSZip-based import wizard; reads `themes.json` from the ZIP |
| URL query string import | `?com.widgetcontextprotocol.theme=<base64>` auto-imports and applies on page load |
| Hash-fragment import | `#wcp-theme=<base64>` (legacy; same payload format) |
| postMessage relay | Active theme vars forwarded to all `<iframe>` children |
| postMessage listener | Accepts theme pushes from a parent frame (WCP host dashboard) |
| Info modal | Secondary panel explaining `.wcpt` format and Theme Studio Docker setup |
| Session restore | Active vars cached in `sessionStorage` — no flash on same-tab navigation |
| Persistence | Selected UUID stored in `localStorage`; user theme list stored in `localStorage` |

---

## Prerequisites

The target SPA must already:

1. Use WCP `--wcp-*` CSS custom properties for all colours, typography, spacing, and layout.
2. Serve its own `--wcp-*` defaults as a `:root {}` block (or equivalent) as the fallback layer.
3. Load from a context where `localStorage` and `sessionStorage` are available (standard browser, not `file://`).

No server-side changes are needed. Everything is client-side JavaScript.

---

## Files Provided

| File | Purpose |
|---|---|
| `assets/templates/css-wcp-token-defaults.css` | `:root` WCP token fallback block — put in `<style>` in `<head>` |
| `assets/templates/css-masthead-settings-button.css` | Gear icon button styles |
| `assets/templates/css-theme-modal-panel.css` | Full panel, tabs, list, wizard, badge CSS |
| `assets/templates/html-masthead-settings-button.html` | Gear button HTML fragment — place in `<header>` |
| `assets/templates/html-settings-modal.html` | Settings modal HTML — place before `</body>` |
| `assets/templates/html-wcpt-info-modal.html` | Info modal HTML — place after settings modal |
| `assets/scripts/js-wcp-theme-engine.js` | Core theme state machine — place in `<script>` before controller |
| `assets/scripts/js-theme-modal-controller.js` | Modal UI logic — place in `<script>` after engine |
| `assets/templates/html-theme-url-export.html` | URL export panel HTML fragment — place inside the Theme pane (optional) |
| `assets/templates/html-url-export-info-modal.html` | Plain-English info modal explaining URL sharing — place after the `.wcpt` info modal (optional, requires Step 9) |
| `assets/scripts/js-theme-url-export.js` | URL export IIFE — generates copy-able share URLs for the active theme (optional) |
| `assets/templates/html-theme-collection-bar.html` | Collection dropdown HTML — place at top of Theme pane (optional, requires Step 11) |

---

## Integration Steps

### Step 1 — Add JSZip CDN dependency (required for `.wcpt` import)

Place in `<head>` or immediately before the theme engine `<script>`:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

If the SPA already has JSZip bundled, skip this.

### Step 2 — Add CSS token defaults

Copy the contents of `assets/templates/css-wcp-token-defaults.css` into the SPA's `<style>` block (or import it).

If the SPA already has a `:root { --wcp-* }` block, compare and merge — do not duplicate. The key to customise is `--wcp-color-primary` / `--wcp-color-primary-on` for the target brand.

### Step 3 — Add modal CSS

Copy the contents of `assets/templates/css-masthead-settings-button.css` and `assets/templates/css-theme-modal-panel.css` into the SPA's `<style>` block (or import as separate files).

### Step 4 — Add the settings button to the masthead

Copy `assets/templates/html-masthead-settings-button.html` and paste it inside the `<header>` element, after the title/subtitle content:

```html
<header class="masthead">
  <span class="masthead-title">Your SPA Title</span>
  <!-- paste assets/templates/html-masthead-settings-button.html here -->
</header>
```

The button calls `wcpOpenThemeModal()` on click — this function is registered by `assets/scripts/js-theme-modal-controller.js`.

### Step 5 — Add the modal HTML

Copy `assets/templates/html-settings-modal.html` and `assets/templates/html-wcpt-info-modal.html` into the `<body>`, immediately before `</body>`.

**Customise the About pane** in `assets/templates/html-settings-modal.html`: replace the two `wcp-about-section` blocks with a description of the target SPA and its producer.

### Step 6 — Add WCP compliance badge to the site footer

Place the badge in the site footer alongside the copyright line:

```html
<a href="https://widgetcontextprotocol.com" target="_blank" rel="noopener"
   title="WCP Theme Compliant" style="text-decoration:none;display:flex;align-items:center;">
  <img src="https://dev.widgetcontextprotocol.com/images/wcp-compliant-badge.svg"
       alt="WCP Compliant" height="20">
</a>
```

### Step 7 — Add the JavaScript

Place the two script blocks immediately before `</body>`, in this order:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
  /* contents of assets/scripts/js-wcp-theme-engine.js */
</script>
<script>
  /* contents of assets/scripts/js-theme-modal-controller.js */
</script>
```

Both scripts can be inlined in a single `<script>` tag if preferred, but the engine IIFE must come first.

### Step 9 — Add URL export panel (optional)

This panel appears inside the Theme tab when a named theme is active, showing two copy-able URL strings:
- **Full query string:** `?com.widgetcontextprotocol.theme=<base64>` — use when the target URL has no existing query parameters
- **Parameter only:** `&com.widgetcontextprotocol.theme=<base64>` — append to a URL that already has parameters

**9a — Add the panel HTML** inside the Theme pane (`#wcp-pane-theme`), between the theme list div and the error/wizard div. Copy the contents of `assets/templates/html-theme-url-export.html`.

**9b — Add the export script** immediately after the modal controller `</script>` block. Copy the IIFE from `assets/scripts/js-theme-url-export.js`.

**9c — Wire `renderAll()` in the controller** so the panel refreshes whenever the theme list changes. In `assets/scripts/js-theme-modal-controller.js`, replace the raw `renderList()` calls in `wcpOpenThemeModal`, `wcpSelectBuiltin`, `wcpSelectBuiltinTheme`, `wcpSelectImported`, and `wcpDeleteTheme` with a helper:

```js
function renderAll() { renderList(); if (window.wcpRenderExportPanel) window.wcpRenderExportPanel(); }
```

The panel is hidden automatically when Built-in (default) is selected — no manual hide logic needed.

**9d — Add the URL export info modal** so users can tap ⓘ to get a plain-English explanation of what the share URLs do and which version to use. Copy `assets/templates/html-url-export-info-modal.html` immediately after the `.wcpt` info modal (`assets/templates/html-wcpt-info-modal.html`), before `</body>`.

Wire the open/close functions in the modal controller, after the `wcpCloseInfoModal` line:

```js
var urlExportInfoBackdrop = document.getElementById('wcp-url-export-info-backdrop');
window.wcpOpenUrlExportInfo = function () { backdrop.classList.remove('open'); urlExportInfoBackdrop.classList.add('open'); };
window.wcpCloseUrlExportInfo = function (backToSettings) { urlExportInfoBackdrop.classList.remove('open'); if (backToSettings) { switchTab('theme'); backdrop.classList.add('open'); } };
urlExportInfoBackdrop.addEventListener('click', function (e) { if (e.target === urlExportInfoBackdrop) wcpCloseUrlExportInfo(); });
```

Add to the Escape key handler (before the `backdrop` check):
```js
else if (urlExportInfoBackdrop.classList.contains('open')) wcpCloseUrlExportInfo();
```

The modal has two footer buttons: **← Back to Settings** (calls `wcpCloseUrlExportInfo(true)`) and **Close** (calls `wcpCloseUrlExportInfo()`).

### Step 10 — Add the AI Skill PKG tab (optional)

This tab appears in the Settings modal alongside Theme / About / WCP. It explains to designers and developers how to add this theme system to their own website using an AI skill package.

**10a — Add the tab button** in the `wcp-settings-tabs` div:
```html
<button class="wcp-settings-tab" id="wcp-tab-aiskill" onclick="wcpSwitchTab('aiskill')">AI Skill PKG</button>
```

**10b — Add the pane** after the WCP pane closing `</div>`, before `wcp-panel-badge`. Copy from `assets/templates/html-settings-modal.html` (the `#wcp-pane-aiskill` block), updating the skill names and URL to match the target site's context if needed.

**10c — Register the tab in `switchTab`** in the modal controller:
```js
['theme', 'about', 'wcp', 'aiskill'].forEach(...)
```

### Step 11 — Add theme collections (optional)

This step adds a dropdown at the top of the Theme pane that lets users switch between collections:
- **My Themes** (default) — built-in themes + single-theme imports + user-imported themes
- **Seasonal collections** — lazy-loaded `.wcpt` files shipped in a `themes/` subdirectory
- **User-imported collections** — any multi-theme `.wcpt` import becomes its own deletable collection

**11a — Add the collection bar HTML** at the top of the Theme pane (`#wcp-pane-theme`), as the first child before `#wcp-theme-list`. Copy from `assets/templates/html-theme-collection-bar.html`.

**11b — Add the collection bar CSS** from `assets/templates/css-theme-modal-panel.css` (the section marked `── Theme collection bar (Step 11) ──`). Add it to the SPA's `<style>` block.

**11c — Deploy the bundled seasonal `.wcpt` files.** This skill package includes four ready-made seasonal collections in `assets/themes/`:

| File | Collection ID | Display name |
|------|--------------|--------------|
| `wcp-theme-collection-seasons-spring-d9f2581e-f063-4a15-baf8-e6cce8ba609b.wcpt` | `seasons-spring` | Spring |
| `wcp-theme-collection-seasons-summer-4e27a6db-1044-4eca-aa83-13166ef8f54e.wcpt` | `seasons-summer` | Summer |
| `wcp-theme-collection-seasons-autumn-c5e9bbcd-3ece-4bef-8b6c-98f53a0cf671.wcpt` | `seasons-autumn` | Autumn |
| `wcp-theme-collection-seasons-winter-4101d760-bcb8-4d1b-8a80-38ba6a1b736a.wcpt` | `seasons-winter` | Winter |

Copy all four files into a `themes/` subdirectory alongside the SPA's `index.html`.

**11d — Configure seasonal collections** in `assets/scripts/js-theme-modal-controller.js`. Locate the `SEASONAL_COLLECTIONS` array and replace `[]` with the four bundled entries:

```js
var SEASONAL_COLLECTIONS = [
  { id: 'seasons-spring', name: 'Spring', file: 'themes/wcp-theme-collection-seasons-spring-d9f2581e-f063-4a15-baf8-e6cce8ba609b.wcpt' },
  { id: 'seasons-summer', name: 'Summer', file: 'themes/wcp-theme-collection-seasons-summer-4e27a6db-1044-4eca-aa83-13166ef8f54e.wcpt' },
  { id: 'seasons-autumn', name: 'Autumn', file: 'themes/wcp-theme-collection-seasons-autumn-c5e9bbcd-3ece-4bef-8b6c-98f53a0cf671.wcpt' },
  { id: 'seasons-winter', name: 'Winter', file: 'themes/wcp-theme-collection-seasons-winter-4101d760-bcb8-4d1b-8a80-38ba6a1b736a.wcpt' },
];
```

If you have no seasonal collections, leave the array empty `[]`.

**Storage behaviour:**
- Selecting a seasonal theme stores it in `wcp-user-themes` with `_seasonal: true` so My Themes hides it. Only one seasonal entry is kept at a time.
- Multi-theme `.wcpt` imports store each theme with `_collection: colId` and create a named entry in `wcp-user-collections`. Deleting the collection removes all its themes from storage.
- Active collection ID is persisted in `wcp-active-collection` (localStorage).
- Seasonal availability and theme data are cached in `sessionStorage` for the page session.

**onclick pattern:** All dynamically generated onclick handlers in the controller use `data-*` attributes to pass arguments — never inline single-quoted string literals. This prevents JS syntax errors when the template is processed by Python, PHP, or other server-side string builders. See the `data-*` section in the controller file header for details.

### Step 8 — Customise built-in themes (optional)

In `assets/scripts/js-theme-modal-controller.js`, locate `WCP_BUILTIN_UUIDS` and `WCP_BUILTIN_THEMES`. By default these contain the three Penrith Beacon WCP themes (Dark, Light, High Contrast). To change them:

1. Create your theme object JSON: `{ "id": "<uuid>", "uuid": "<uuid>", "name": "...", "vars": { "--wcp-*": "..." } }`
2. Generate the base64 blob: `btoa(JSON.stringify(themeObj))`
3. Replace the entries in `WCP_BUILTIN_THEMES` and update `WCP_BUILTIN_UUIDS` to match.

The PB WCP Light theme (`uuid: b2c3d4e5-f6a7-8901-bcde-f12345678901`) is the canonical WCP template — keep it as the default built-in unless the brand specifically requires otherwise.

---

## URL Query String Theme Import

The theme engine reads `?com.widgetcontextprotocol.theme=<base64>` from the URL on page load. The base64 value must decode to a valid JSON theme object:

```json
{
  "id": "your-uuid",
  "uuid": "your-uuid",
  "name": "Theme Name",
  "vars": {
    "--wcp-color-bg": "#ffffff",
    "--wcp-color-primary": "#8B6914",
    "...": "..."
  }
}
```

**Generate a URL for sharing:**

```js
var theme = { id: "...", uuid: "...", name: "...", vars: { ... } };
var param = btoa(JSON.stringify(theme));
var url = location.href.includes('?')
  ? location.href + '&com.widgetcontextprotocol.theme=' + param
  : location.href + '?com.widgetcontextprotocol.theme=' + param;
```

The WCP Widget Theme Studio (Docker: `penrithbeacon/wcp-widget-theme-studio`) generates these URLs automatically.

---

## Example Prompt

The following is an example of the natural-language statement a user would type into an AI agent's prompt to invoke this Skill Package against a target SPA. Copy, adjust the bracketed values, and paste directly into the agent.

```
Using the Skill Package at /Volumes/dashboard/ai-skill-packages/WCP-SPA-THEME-SETTINGS.aiskill,
add the full WCP theme settings system to the SPA at
/Volumes/websites/sites/hartley-vale-district-records/src/index.html.

The application is called "Hartley Vale District Records" — a digitised archive of local
council minutes and planning documents for the fictional Borough of Hartley Vale.
It is already WCP-compliant and uses --wcp-* CSS custom properties throughout.

Producer: Penrith Beacon Communications (https://penrithbeacon.com).
Keep the default Penrith Beacon gold primary colour (#8B6914).
Include all three Penrith Beacon built-in themes (Dark, Light, High Contrast).
```

**What the agent will do when given this prompt:**

1. Read `manifest.yaml` from the Skill Package to locate `SKILL.md` (the entry point)
2. Read `SKILL.md` for the full integration instructions
3. Read `inputs/schema.json` to understand what information is required
4. Satisfy required inputs from the prompt (`spa_html_path`, `app_name`, `app_description`, `producer_name`, `producer_url`)
5. Read the target `index.html` to understand its existing structure
6. Apply the eight integration steps in order, reading each asset file from `assets/` as needed
7. Verify the conformance checklist before reporting the task complete

---

## Storage Keys

| Storage | Key | Contents |
|---|---|---|
| `sessionStorage` | `wcp-theme` | Active vars JSON (avoids flash on same-tab navigation) |
| `localStorage` | `wcp-user-themes` | `[{ uuid, name, vars, _seasonal?, _collection? }]` — all user themes |
| `localStorage` | `wcp-selected-theme` | UUID string or `'built-in'` |
| `localStorage` | `wcp-active-collection` | Active collection ID (`'my-themes'` or a UUID/`'ucol-*'`) |
| `localStorage` | `wcp-user-collections` | `[{ id, name, themes:[...] }]` — user-imported multi-theme collections |
| `sessionStorage` | `wcp-col-avail-<id>` | `'1'` or `'0'` — seasonal .wcpt HEAD probe result |
| `sessionStorage` | `wcp-col-themes-<id>` | JSON string of themes array from a loaded seasonal .wcpt |

---

## Conformance Checklist

- [ ] JSZip 3.x is loaded before the theme engine script
- [ ] `--wcp-*` token `:root` defaults are present in the SPA's CSS (own defaults, not overriding from this file)
- [ ] Gear button is present in the masthead and calls `wcpOpenThemeModal()`
- [ ] Both modal HTML blocks are present in `<body>` before `</body>`
- [ ] Theme engine IIFE loads before modal controller IIFE
- [ ] WCP compliance badge appears in the site footer
- [ ] About pane content has been updated to describe the target SPA
- [ ] Built-in themes have been reviewed; `--wcp-color-primary` is WCAG AA compliant on the built-in background
- [ ] URL query string import tested: append `?com.widgetcontextprotocol.theme=<base64>` and verify theme applies on load
- [ ] `.wcpt` import tested: import a valid `.wcpt` file and verify theme appears in the list and is applied
- [ ] *(if Step 9 applied)* URL export panel appears when a named theme is selected and is hidden for Built-in
- [ ] *(if Step 9 applied)* Copy buttons copy the correct `?` and `&` query strings to the clipboard
- [ ] *(if Step 9 applied)* ⓘ icon opens the URL export info modal; Back to Settings returns to the Theme tab; Escape closes the modal
- [ ] *(if Step 10 applied)* AI Skill PKG tab renders and links to `https://ai-skill-pkg.widgetcontextprotocol.com`
- [ ] *(if Step 11 applied)* Collection dropdown appears at top of Theme pane with "My Themes" as default
- [ ] *(if Step 11 applied with seasonal files)* Seasonal collections appear in dropdown only when their `.wcpt` files are deployed; missing files do not appear
- [ ] *(if Step 11 applied)* Importing a multi-theme `.wcpt` creates a named user collection in the dropdown; deleting it removes all its themes from storage
- [ ] *(if Step 11 applied)* All dynamic onclick handlers use `data-*` attributes — no single-quoted string arguments embedded in onclick values

**If all boxes are checked: the WCP theme settings system is correctly embedded and the SPA is WCP theme compliant.**
**If any box cannot be checked: resolve the gap before marking the integration complete.**

---

*© Anthony Harrison 2026. Created 2026-07-02. Last updated 2026-07-02. v1.3.0.*
*Skill format: Cup and Ring Task Manager licensed format © Anthony Harrison.*
