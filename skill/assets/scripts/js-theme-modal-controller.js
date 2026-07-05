/**
 * WCP THEME MODAL CONTROLLER — settings panel UI logic (IIFE)
 *
 * Manages:
 *  - Settings modal open/close + backdrop click-to-close + Escape key
 *  - Four-tab switching (Theme / About / WCP / AI Skill PKG)
 *  - Theme collection dropdown (My Themes + optional seasonal + user-imported)
 *  - Theme list rendering per active collection
 *  - Built-in theme selection and user theme selection/deletion
 *  - .wcpt file import wizard: JSZip extraction → themes.json + manifest.json
 *  - Multi-theme .wcpt imports create a named user collection (deletable)
 *  - Single-theme imports go to My Themes
 *  - Seasonal .wcpt collections: lazy-loaded via fetch → JSZip (Option A)
 *  - Info modal open/close (secondary panel; returns to caller's tab on close)
 *  - URL export info modal open/close
 *
 * Exposes globals (called from inline onclick / data-* attribute handlers):
 *   wcpOpenThemeModal, wcpCloseThemeModal, wcpSwitchTab,
 *   wcpSwitchCollection, wcpDeleteCollection,
 *   wcpSelectBuiltin, wcpSelectBuiltinTheme,
 *   wcpSelectImported, wcpSelectSeasonalTheme,
 *   wcpDeleteTheme, wcpImportFile,
 *   wcpOpenInfoModal, wcpCloseInfoModal,
 *   wcpOpenUrlExportInfo, wcpCloseUrlExportInfo,
 *   wcpCopyCmd (copy-to-clipboard for Docker Quick Start in info modal),
 *   _wcpRenderList (called by theme engine after URL-payload import)
 *
 * Dependencies:
 *   - js-wcp-theme-engine.js  (must run first; populates window._wcpTheme)
 *   - JSZip 3.x               (CDN or bundled; required for .wcpt import + seasonal)
 *       <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"><\/script>
 *   - html-settings-modal.html     (DOM elements)
 *   - html-wcpt-info-modal.html    (DOM elements)
 *   - html-url-export-info-modal.html (DOM elements; required if Step 9 applied)
 *   - html-theme-collection-bar.html  (DOM elements; required for Step 11)
 *
 * ── ONCLICK PATTERN ─────────────────────────────────────────────────────────
 * All dynamically generated onclick handlers use data-* attributes instead of
 * quoting string arguments inside the onclick value. This avoids JS syntax
 * errors when building HTML via string concatenation in JS or server-side
 * template languages (e.g. Python heredocs). Always follow this pattern:
 *
 *   BAD:  onclick="myFunc('" + uuid + "')"   ← breaks if uuid contains quotes
 *   GOOD: data-uuid="' + uuid + '" onclick="myFunc(this.dataset.uuid)"
 *
 * CUSTOMISE — WCP_BUILTIN_THEMES:
 *   Replace the three base64 blobs below with your own built-in themes.
 *   Each blob is a base64-encoded JSON string of a full WCP theme object:
 *     { "id": "<uuid>", "uuid": "<uuid>", "name": "...", "vars": { "--wcp-*": "..." } }
 *
 *   To generate a blob:
 *     btoa(JSON.stringify({ id: "...", uuid: "...", name: "...", vars: { ... } }))
 *
 *   WCP_BUILTIN_UUIDS must list the same UUIDs in the same order.
 *   These themes appear in the list as "Built-in" (with badge) and cannot be deleted.
 *
 * CUSTOMISE — SEASONAL_COLLECTIONS:
 *   If your site does not use seasonal theme collections, set this to [].
 *   If it does, each entry needs:
 *     { id: '<uuid>', name: 'Display Name', file: 'themes/<filename>.wcpt' }
 *   The .wcpt files must be deployed in a `themes/` subdirectory alongside
 *   the SPA's index.html. They are probed via HEAD request on modal open —
 *   only available files appear in the dropdown.
 */

(function () {
  var backdrop  = document.getElementById('wcp-theme-backdrop');
  var listEl    = document.getElementById('wcp-theme-list');
  var errEl     = document.getElementById('wcp-theme-error');
  var wizardEl  = document.getElementById('wcp-theme-wizard');
  var importBtn = document.getElementById('wcp-import-btn');

  function WT() { return window._wcpTheme || {}; }

  /* ── Built-in themes ──────────────────────────────────────────────────── */
  /*
   * CUSTOMISE: Replace these UUIDs and base64 blobs with your own built-in themes.
   * The three entries here are the Penrith Beacon WCP Dark, Light, and High Contrast themes.
   * Remove entries you don't want; add new ones in the same pattern.
   */
  var WCP_BUILTIN_UUIDS = [
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', /* PB WCP Dark */
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', /* PB WCP Light */
    'c3d4e5f6-a7b8-9012-cdef-123456789012'  /* PB WCP High Contrast */
  ];

  var WCP_BUILTIN_THEMES = (function () {
    try {
      return [
        /* PB WCP Dark */
        JSON.parse(atob('eyJpZCI6ImExYjJjM2Q0LWU1ZjYtNzg5MC1hYmNkLWVmMTIzNDU2Nzg5MCIsInV1aWQiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJuYW1lIjoiUGVucml0aCBCZWFjb24gV0NQIERhcmsiLCJkZXNjcmlwdGlvbiI6IldDQUcgQUEgY29tcGxpYW50IGRhcmsgdGhlbWUuIiwidmFycyI6eyItLXdjcC1jb2xvci1iZyI6IiMwZDExMTciLCItLXdjcC1jb2xvci1zdXJmYWNlIjoiIzE2MWIyMiIsIi0td2NwLWNvbG9yLXN1cmZhY2UtcmFpc2VkIjoiIzFjMjEyOCIsIi0td2NwLWNvbG9yLXN1cmZhY2Utc3Vua2VuIjoiIzBkMTExNyIsIi0td2NwLWNvbG9yLW92ZXJsYXkiOiJyZ2JhKDEzLDE3LDIzLDAuNzUpIiwiLS13Y3AtY29sb3ItYm9yZGVyIjoiIzZlNzY4MSIsIi0td2NwLWNvbG9yLWJvcmRlci1zdHJvbmciOiJyZ2JhKDIzMCwyMzcsMjQzLDAuMjUpIiwiLS13Y3AtY29sb3ItdGV4dCI6IiNlNmVkZjMiLCItLXdjcC1jb2xvci10ZXh0LW11dGVkIjoiIzhiOTQ5ZSIsIi0td2NwLWNvbG9yLXRleHQtZGlzYWJsZWQiOiJyZ2JhKDEzOSwxNDgsMTU4LDAuNSkiLCItLXdjcC1jb2xvci10ZXh0LWludmVyc2UiOiIjMGQxMTE3IiwiLS13Y3AtY29sb3ItbGluayI6IiM1OGE2ZmYiLCItLXdjcC1jb2xvci1wcmltYXJ5IjoiI2YwODgzZSIsIi0td2NwLWNvbG9yLXByaW1hcnktZGltIjoicmdiYSgyNDAsMTM2LDYyLDAuMTUpIiwiLS13Y3AtY29sb3ItcHJpbWFyeS1vbiI6IiMwMDAwMDAiLCItLXdjcC1jb2xvci1zdWNjZXNzIjoiIzNmYjk1MCIsIi0td2NwLWNvbG9yLXN1Y2Nlc3Mtb24iOiIjZmZmZmZmIiwiLS13Y3AtY29sb3Itc3VjY2Vzcy1zdXJmYWNlIjoicmdiYSg2MywxODUsODAsMC4xMikiLCItLXdjcC1jb2xvci13YXJuaW5nIjoiI2QyOTkyMiIsIi0td2NwLWNvbG9yLXdhcm5pbmctc3VyZmFjZSI6InJnYmEoMjEwLDE1MywzNCwwLjEyKSIsIi0td2NwLWNvbG9yLWRhbmdlciI6IiNmODUxNDkiLCItLXdjcC1jb2xvci1kYW5nZXItc3VyZmFjZSI6InJnYmEoMjQ4LDgxLDczLDAuMTIpIiwiLS13Y3AtY29sb3ItaW5mbyI6IiM1OGE2ZmYiLCItLXdjcC1jb2xvci1pbmZvLXN1cmZhY2UiOiJyZ2JhKDg4LDE2NiwyNTUsMC4xMikiLCItLXdjcC1mb250LWZhbWlseSI6Ii1hcHBsZS1zeXN0ZW0sQmxpbmtNYWNTeXN0ZW1Gb250LCdTZWdvZSBVSScsT3BlblNhbnMsc2Fucy1zZXJpZiIsIi0td2NwLWZvbnQtbW9ubyI6InVpLW1vbm9zcGFjZSwnU0YgTW9ubycsJ0ZpcmEgQ29kZScsbW9ub3NwYWNlIiwiLS13Y3AtZm9udC1zaXplLXhzIjoiMC43MHJlbSIsIi0td2NwLWZvbnQtc2l6ZS1zbSI6IjAuODByZW0iLCItLXdjcC1mb250LXNpemUtbWQiOiIwLjg3NXJlbSIsIi0td2NwLWZvbnQtc2l6ZS1sZyI6IjFyZW0iLCItLXdjcC1mb250LXNpemUteGwiOiIxLjEyNXJlbSIsIi0td2NwLWZvbnQtc2l6ZS0yeGwiOiIxLjM3NXJlbSIsIi0td2NwLWZvbnQtc2l6ZS0zeGwiOiIxLjc1cmVtIiwiLS13Y3AtZm9udC13ZWlnaHQtbm9ybWFsIjoiNDAwIiwiLS13Y3AtZm9udC13ZWlnaHQtbWVkaXVtIjoiNTAwIiwiLS13Y3AtZm9udC13ZWlnaHQtc2VtaWJvbGQiOiI2MDAiLCItLXdjcC1mb250LXdlaWdodC1ib2xkIjoiNzAwIiwiLS13Y3AtbGluZS1oZWlnaHQtdGlnaHQiOiIxLjIiLCItLXdjcC1saW5lLWhlaWdodC1ub3JtYWwiOiIxLjUiLCItLXdjcC1saW5lLWhlaWdodC1yZWxheGVkIjoiMS43NSIsIi0td2NwLXNwYWNlLTEiOiI0cHgiLCItLXdjcC1zcGFjZS0yIjoiOHB4IiwiLS13Y3Atc3BhY2UtMyI6IjEycHgiLCItLXdjcC1zcGFjZS00IjoiMTZweCIsIi0td2NwLXNwYWNlLTUiOiIyNHB4IiwiLS13Y3Atc3BhY2UtNiI6IjMycHgiLCItLXdjcC1zcGFjZS03IjoiNDhweCIsIi0td2NwLXNwYWNlLTgiOiI2NHB4IiwiLS13Y3AtcmFkaXVzLXNtIjoiNHB4IiwiLS13Y3AtcmFkaXVzLW1kIjoiOHB4IiwiLS13Y3AtcmFkaXVzLWxnIjoiMTJweCIsIi0td2NwLXJhZGl1cy14bCI6IjE2cHgiLCItLXdjcC1yYWRpdXMtcm91bmQiOiI5OTk5cHgiLCItLXdjcC1zaGFkb3ctc20iOiIwIDRweCAxNnB4IHJnYmEoMCwwLDAsLjQ1KSIsIi0td2NwLXNoYWRvdy1tZCI6IjAgNHB4IDEycHggcmdiYSgwLDAsMCwuMikiLCItLXdjcC1zaGFkb3ctbGciOiIwIDhweCAyNHB4IHJnYmEoMCwwLDAsLjI1KSIsIi0td2NwLXNoYWRvdy14bCI6IjAgMTZweCA0MHB4IHJnYmEoMCwwLDAsLjMpIiwiLS13Y3AtZHVyYXRpb24tZmFzdCI6IjEwMG1zIiwiLS13Y3AtZHVyYXRpb24tbm9ybWFsIjoiMjAwbXMiLCItLXdjcC1kdXJhdGlvbi1zbG93IjoiMzUwbXMiLCItLXdjcC1lYXNpbmctc3RhbmRhcmQiOiJlYXNlIiwiLS13Y3AtZWFzaW5nLW91dCI6ImVhc2Utb3V0IiwiLS13Y3AtZWFzaW5nLWluIjoiZWFzZS1pbiIsIi0td2NwLWVhc2luZy1zcHJpbmciOiJjdWJpYy1iZXppZXIoMC4zNCwxLjU2LDAuNjQsMSkiLCItLXdjcC16LWJhc2UiOiIwIiwiLS13Y3Atei1yYWlzZWQiOiIxMCIsIi0td2NwLXotZHJvcGRvd24iOiIxMDAwIiwiLS13Y3Atei1zdGlja3kiOiIxMTAwIiwiLS13Y3Atei1tb2RhbCI6IjEyMDAiLCItLXdjcC16LXRvYXN0IjoiMTMwMCIsIi0td2NwLXotdG9vbHRpcCI6IjE0MDAiLCItLXdjcC1mb2N1cy1yaW5nLXdpZHRoIjoiMnB4IiwiLS13Y3AtZm9jdXMtcmluZy1vZmZzZXQiOiIycHgiLCItLXdjcC1mb2N1cy1yaW5nLWNvbG9yIjoiI2YwODgzZSIsIi0td2NwLXRvdWNoLXRhcmdldC1taW4iOiI0NHB4IiwiLS13Y3Atd2lkZ2V0LWJnIjoiIzE2MWIyMiIsIi0td2NwLXdpZGdldC1ib3JkZXIiOiIjNmU3NjgxIiwiLS13Y3Atd2lkZ2V0LXJhZGl1cyI6IjhweCIsIi0td2NwLXdpZGdldC1wYWRkaW5nIjoiMTZweCIsIi0td2NwLXdpZGdldC1nYXAiOiIxMnB4IiwiLS13Y3Atd2lkZ2V0LXNoYWRvdyI6IjAgNHB4IDE2cHggcmdiYSgwLDAsMCwuNDUpIn19')),
        /* PB WCP Light */
        JSON.parse(atob('eyJpZCI6ImIyYzNkNGU1LWY2YTctODkwMS1iY2RlLWYxMjM0NTY3ODkwMSIsInV1aWQiOiJiMmMzZDRlNS1mNmE3LTg5MDEtYmNkZS1mMTIzNDU2Nzg5MDEiLCJuYW1lIjoiUGVucml0aCBCZWFjb24gV0NQIExpZ2h0IiwiZGVzY3JpcHRpb24iOiJXQ0FHIEFBIGNvbXBsaWFudCBsaWdodCB0aGVtZS4iLCJ2YXJzIjp7Ii0td2NwLWNvbG9yLWJnIjoiI2ZmZmZmZiIsIi0td2NwLWNvbG9yLXN1cmZhY2UiOiIjZjZmOGZhIiwiLS13Y3AtY29sb3Itc3VyZmFjZS1yYWlzZWQiOiIjZWFlZWYyIiwiLS13Y3AtY29sb3Itc3VyZmFjZS1zdW5rZW4iOiIjZmZmZmZmIiwiLS13Y3AtY29sb3Itb3ZlcmxheSI6InJnYmEoMjU1LDI1NSwyNTUsMC43NSkiLCItLXdjcC1jb2xvci1ib3JkZXIiOiIjZDBkN2RlIiwiLS13Y3AtY29sb3ItYm9yZGVyLXN0cm9uZyI6InJnYmEoMzEsMzUsNDAsMC4yNSkiLCItLXdjcC1jb2xvci10ZXh0IjoiIzFmMjMyOCIsIi0td2NwLWNvbG9yLXRleHQtbXV0ZWQiOiIjNjM2Yzc2IiwiLS13Y3AtY29sb3ItdGV4dC1kaXNhYmxlZCI6InJnYmEoOTksMTA4LDExOCwwLjUpIiwiLS13Y3AtY29sb3ItdGV4dC1pbnZlcnNlIjoiI2ZmZmZmZiIsIi0td2NwLWNvbG9yLWxpbmsiOiIjMDk2OWRhIiwiLS13Y3AtY29sb3ItcHJpbWFyeSI6IiM4QjY5MTQiLCItLXdjcC1jb2xvci1wcmltYXJ5LWRpbSI6InJnYmEoMTM5LDEwNSwyMCwwLjEyKSIsIi0td2NwLWNvbG9yLXByaW1hcnktb24iOiIjZmZmZmZmIiwiLS13Y3AtY29sb3Itc3VjY2VzcyI6IiMxYTdmMzciLCItLXdjcC1jb2xvci1zdWNjZXNzLW9uIjoiI2ZmZmZmZiIsIi0td2NwLWNvbG9yLXN1Y2Nlc3Mtc3VyZmFjZSI6InJnYmEoMjYsMTI3LDU1LDAuMTIpIiwiLS13Y3AtY29sb3Itd2FybmluZyI6IiM5YTY3MDAiLCItLXdjcC1jb2xvci13YXJuaW5nLXN1cmZhY2UiOiJyZ2JhKDE1NCwxMDMsMCwwLjEyKSIsIi0td2NwLWNvbG9yLWRhbmdlciI6IiNjZjIyMmUiLCItLXdjcC1jb2xvci1kYW5nZXItc3VyZmFjZSI6InJnYmEoMjA3LDM0LDQ2LDAuMTIpIiwiLS13Y3AtY29sb3ItaW5mbyI6IiMwOTY5ZGEiLCItLXdjcC1jb2xvci1pbmZvLXN1cmZhY2UiOiJyZ2JhKDksMTA1LDIxOCwwLjEyKSIsIi0td2NwLWZvbnQtZmFtaWx5IjoiLWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsJ1NlZ29lIFVJJyxzYW5zLXNlcmlmIiwiLS13Y3AtZm9udC1tb25vIjoidWktbW9ub3NwYWNlLCdTRiBNb25vJywnRmlyYSBDb2RlJyxtb25vc3BhY2UiLCItLXdjcC1mb250LXNpemUteHMiOiIwLjcwcmVtIiwiLS13Y3AtZm9udC1zaXplLXNtIjoiMC44MHJlbSIsIi0td2NwLWZvbnQtc2l6ZS1tZCI6IjAuODc1cmVtIiwiLS13Y3AtZm9udC1zaXplLWxnIjoiMXJlbSIsIi0td2NwLWZvbnQtc2l6ZS14bCI6IjEuMTI1cmVtIiwiLS13Y3AtZm9udC1zaXplLTJ4bCI6IjEuMzc1cmVtIiwiLS13Y3AtZm9udC1zaXplLTN4bCI6IjEuNzVyZW0iLCItLXdjcC1mb250LXdlaWdodC1ub3JtYWwiOiI0MDAiLCItLXdjcC1mb250LXdlaWdodC1tZWRpdW0iOiI1MDAiLCItLXdjcC1mb250LXdlaWdodC1zZW1pYm9sZCI6IjYwMCIsIi0td2NwLWZvbnQtd2VpZ2h0LWJvbGQiOiI3MDAiLCItLXdjcC1saW5lLWhlaWdodC10aWdodCI6IjEuMiIsIi0td2NwLWxpbmUtaGVpZ2h0LW5vcm1hbCI6IjEuNSIsIi0td2NwLWxpbmUtaGVpZ2h0LXJlbGF4ZWQiOiIxLjc1IiwiLS13Y3Atc3BhY2UtMSI6IjRweCIsIi0td2NwLXNwYWNlLTIiOiI4cHgiLCItLXdjcC1zcGFjZS0zIjoiMTJweCIsIi0td2NwLXNwYWNlLTQiOiIxNnB4IiwiLS13Y3Atc3BhY2UtNSI6IjI0cHgiLCItLXdjcC1zcGFjZS02IjoiMzJweCIsIi0td2NwLXNwYWNlLTciOiI0OHB4IiwiLS13Y3Atc3BhY2UtOCI6IjY0cHgiLCItLXdjcC1yYWRpdXMtc20iOiI0cHgiLCItLXdjcC1yYWRpdXMtbWQiOiI4cHgiLCItLXdjcC1yYWRpdXMtbGciOiIxMnB4IiwiLS13Y3AtcmFkaXVzLXhsIjoiMTZweCIsIi0td2NwLXJhZGl1cy1yb3VuZCI6Ijk5OTlweCIsIi0td2NwLXNoYWRvdy1zbSI6IjAgNHB4IDhweCByZ2JhKDAsMCwwLC4xMikiLCItLXdjcC1zaGFkb3ctbWQiOiIwIDRweCAxMnB4IHJnYmEoMCwwLDAsLjIpIiwiLS13Y3Atc2hhZG93LWxnIjoiMCA4cHggMjRweCByZ2JhKDAsMCwwLC4yNSkiLCItLXdjcC1zaGFkb3cteGwiOiIwIDE2cHggNDBweCByZ2JhKDAsMCwwLC4zKSIsIi0td2NwLWR1cmF0aW9uLWZhc3QiOiIxMDBtcyIsIi0td2NwLWR1cmF0aW9uLW5vcm1hbCI6IjIwMG1zIiwiLS13Y3AtZHVyYXRpb24tc2xvdyI6IjM1MG1zIiwiLS13Y3AtZWFzaW5nLXN0YW5kYXJkIjoiZWFzZSIsIi0td2NwLWVhc2luZy1vdXQiOiJlYXNlLW91dCIsIi0td2NwLWVhc2luZy1pbiI6ImVhc2UtaW4iLCItLXdjcC1lYXNpbmctc3ByaW5nIjoiY3ViaWMtYmV6aWVyKDAuMzQsMS41NiwwLjY0LDEpIiwiLS13Y3Atei1iYXNlIjoiMCIsIi0td2NwLXotcmFpc2VkIjoiMTAiLCItLXdjcC16LWRyb3Bkb3duIjoiMTAwMCIsIi0td2NwLXotc3RpY2t5IjoiMTEwMCIsIi0td2NwLXotbW9kYWwiOiIxMjAwIiwiLS13Y3Atei10b2FzdCI6IjEzMDAiLCItLXdjcC16LXRvb2x0aXAiOiIxNDAwIiwiLS13Y3AtZm9jdXMtcmluZy13aWR0aCI6IjJweCIsIi0td2NwLWZvY3VzLXJpbmctb2Zmc2V0IjoiMnB4IiwiLS13Y3AtZm9jdXMtcmluZy1jb2xvciI6IiM4QjY5MTQiLCItLXdjcC10b3VjaC10YXJnZXQtbWluIjoiNDRweCIsIi0td2NwLXdpZGdldC1iZyI6IiNmNmY4ZmEiLCItLXdjcC13aWRnZXQtYm9yZGVyIjoiI2QwZDdkZSIsIi0td2NwLXdpZGdldC1yYWRpdXMiOiI4cHgiLCItLXdjcC13aWRnZXQtcGFkZGluZyI6IjE2cHgiLCItLXdjcC13aWRnZXQtZ2FwIjoiMTJweCIsIi0td2NwLXdpZGdldC1zaGFkb3ciOiIwIDRweCA4cHggcmdiYSgwLDAsMCwuMTIpIn19')),
        /* PB WCP High Contrast */
        JSON.parse(atob('eyJpZCI6ImMzZDRlNWY2LWE3YjgtOTAxMi1jZGVmLTEyMzQ1Njc4OTAxMiIsInV1aWQiOiJjM2Q0ZTVmNi1hN2I4LTkwMTItY2RlZi0xMjM0NTY3ODkwMTIiLCJuYW1lIjoiUGVucml0aCBCZWFjb24gV0NQIEhpZ2ggQ29udHJhc3QiLCJkZXNjcmlwdGlvbiI6IldDQUcgQUEgY29tcGxpYW50IGhpZ2ggY29udHJhc3QgdGhlbWUuIiwidmFycyI6eyItLXdjcC1jb2xvci1iZyI6IiMwMDAwMDAiLCItLXdjcC1jb2xvci1zdXJmYWNlIjoiIzBkMGQwZCIsIi0td2NwLWNvbG9yLXN1cmZhY2UtcmFpc2VkIjoiIzFhMWExYSIsIi0td2NwLWNvbG9yLXN1cmZhY2Utc3Vua2VuIjoiIzAwMDAwMCIsIi0td2NwLWNvbG9yLW92ZXJsYXkiOiJyZ2JhKDAsMCwwLDAuNzUpIiwiLS13Y3AtY29sb3ItYm9yZGVyIjoiI2ZmZmZmZiIsIi0td2NwLWNvbG9yLWJvcmRlci1zdHJvbmciOiJyZ2JhKDI1NSwyNTUsMjU1LDAuMjUpIiwiLS13Y3AtY29sb3ItdGV4dCI6IiNmZmZmZmYiLCItLXdjcC1jb2xvci10ZXh0LW11dGVkIjoiI2NjY2NjYyIsIi0td2NwLWNvbG9yLXRleHQtZGlzYWJsZWQiOiJyZ2JhKDIwNCwyMDQsMjA0LDAuNSkiLCItLXdjcC1jb2xvci10ZXh0LWludmVyc2UiOiIjMDAwMDAwIiwiLS13Y3AtY29sb3ItbGluayI6IiMwMGI0ZmYiLCItLXdjcC1jb2xvci1wcmltYXJ5IjoiI2ZmOGMwMCIsIi0td2NwLWNvbG9yLXByaW1hcnktZGltIjoicmdiYSgyNTUsMTQwLDAsMC4xNSkiLCItLXdjcC1jb2xvci1wcmltYXJ5LW9uIjoiIzAwMDAwMCIsIi0td2NwLWNvbG9yLXN1Y2Nlc3MiOiIjMDBmZjQxIiwiLS13Y3AtY29sb3Itc3VjY2Vzcy1vbiI6IiNmZmZmZmYiLCItLXdjcC1jb2xvci1zdWNjZXNzLXN1cmZhY2UiOiJyZ2JhKDAsMjU1LDY1LDAuMTIpIiwiLS13Y3AtY29sb3Itd2FybmluZyI6IiNmZmZmMDAiLCItLXdjcC1jb2xvci13YXJuaW5nLXN1cmZhY2UiOiJyZ2JhKDI1NSwyNTUsMCwwLjEyKSIsIi0td2NwLWNvbG9yLWRhbmdlciI6IiNmZjMzMzMiLCItLXdjcC1jb2xvci1kYW5nZXItc3VyZmFjZSI6InJnYmEoMjU1LDUxLDUxLDAuMTIpIiwiLS13Y3AtY29sb3ItaW5mbyI6IiMwMGI0ZmYiLCItLXdjcC1jb2xvci1pbmZvLXN1cmZhY2UiOiJyZ2JhKDAsMTgwLDI1NSwwLjEyKSIsIi0td2NwLWZvbnQtZmFtaWx5IjoiLWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsJ1NlZ29lIFVJJyxzYW5zLXNlcmlmIiwiLS13Y3AtZm9udC1tb25vIjoidWktbW9ub3NwYWNlLCdTRiBNb25vJywnRmlyYSBDb2RlJyxtb25vc3BhY2UiLCItLXdjcC1mb250LXNpemUteHMiOiIwLjcwcmVtIiwiLS13Y3AtZm9udC1zaXplLXNtIjoiMC44MHJlbSIsIi0td2NwLWZvbnQtc2l6ZS1tZCI6IjAuODc1cmVtIiwiLS13Y3AtZm9udC1zaXplLWxnIjoiMXJlbSIsIi0td2NwLWZvbnQtc2l6ZS14bCI6IjEuMTI1cmVtIiwiLS13Y3AtZm9udC1zaXplLTJ4bCI6IjEuMzc1cmVtIiwiLS13Y3AtZm9udC1zaXplLTN4bCI6IjEuNzVyZW0iLCItLXdjcC1mb250LXdlaWdodC1ub3JtYWwiOiI0MDAiLCItLXdjcC1mb250LXdlaWdodC1tZWRpdW0iOiI1MDAiLCItLXdjcC1mb250LXdlaWdodC1zZW1pYm9sZCI6IjYwMCIsIi0td2NwLWZvbnQtd2VpZ2h0LWJvbGQiOiI3MDAiLCItLXdjcC1saW5lLWhlaWdodC10aWdodCI6IjEuMiIsIi0td2NwLWxpbmUtaGVpZ2h0LW5vcm1hbCI6IjEuNSIsIi0td2NwLWxpbmUtaGVpZ2h0LXJlbGF4ZWQiOiIxLjc1IiwiLS13Y3Atc3BhY2UtMSI6IjRweCIsIi0td2NwLXNwYWNlLTIiOiI4cHgiLCItLXdjcC1zcGFjZS0zIjoiMTJweCIsIi0td2NwLXNwYWNlLTQiOiIxNnB4IiwiLS13Y3Atc3BhY2UtNSI6IjI0cHgiLCItLXdjcC1zcGFjZS02IjoiMzJweCIsIi0td2NwLXNwYWNlLTciOiI0OHB4IiwiLS13Y3Atc3BhY2UtOCI6IjY0cHgiLCItLXdjcC1yYWRpdXMtc20iOiI0cHgiLCItLXdjcC1yYWRpdXMtbWQiOiI0cHgiLCItLXdjcC1yYWRpdXMtbGciOiIxMnB4IiwiLS13Y3AtcmFkaXVzLXhsIjoiMTZweCIsIi0td2NwLXJhZGl1cy1yb3VuZCI6Ijk5OTlweCIsIi0td2NwLXNoYWRvdy1zbSI6Im5vbmUiLCItLXdjcC1zaGFkb3ctbWQiOiIwIDRweCAxMnB4IHJnYmEoMCwwLDAsLjIpIiwiLS13Y3Atc2hhZG93LWxnIjoiMCA4cHggMjRweCByZ2JhKDAsMCwwLC4yNSkiLCItLXdjcC1zaGFkb3cteGwiOiIwIDE2cHggNDBweCByZ2JhKDAsMCwwLC4zKSIsIi0td2NwLWR1cmF0aW9uLWZhc3QiOiIxMDBtcyIsIi0td2NwLWR1cmF0aW9uLW5vcm1hbCI6IjIwMG1zIiwiLS13Y3AtZHVyYXRpb24tc2xvdyI6IjM1MG1zIiwiLS13Y3AtZWFzaW5nLXN0YW5kYXJkIjoiZWFzZSIsIi0td2NwLWVhc2luZy1vdXQiOiJlYXNlLW91dCIsIi0td2NwLWVhc2luZy1pbiI6ImVhc2UtaW4iLCItLXdjcC1lYXNpbmctc3ByaW5nIjoiY3ViaWMtYmV6aWVyKDAuMzQsMS41NiwwLjY0LDEpIiwiLS13Y3Atei1iYXNlIjoiMCIsIi0td2NwLXotcmFpc2VkIjoiMTAiLCItLXdjcC16LWRyb3Bkb3duIjoiMTAwMCIsIi0td2NwLXotc3RpY2t5IjoiMTEwMCIsIi0td2NwLXotbW9kYWwiOiIxMjAwIiwiLS13Y3Atei10b2FzdCI6IjEzMDAiLCItLXdjcC16LXRvb2x0aXAiOiIxNDAwIiwiLS13Y3AtZm9jdXMtcmluZy13aWR0aCI6IjJweCIsIi0td2NwLWZvY3VzLXJpbmctb2Zmc2V0IjoiMnB4IiwiLS13Y3AtZm9jdXMtcmluZy1jb2xvciI6IiNmZjhjMDAiLCItLXdjcC10b3VjaC10YXJnZXQtbWluIjoiNDRweCIsIi0td2NwLXdpZGdldC1iZyI6IiMwZDBkMGQiLCItLXdjcC13aWRnZXQtYm9yZGVyIjoiI2ZmZmZmZiIsIi0td2NwLXdpZGdldC1yYWRpdXMiOiI0cHgiLCItLXdjcC13aWRnZXQtcGFkZGluZyI6IjE2cHgiLCItLXdjcC13aWRnZXQtZ2FwIjoiMTJweCIsIi0td2NwLXdpZGdldC1zaGFkb3ciOiJub25lIn19'))
      ];
    } catch (e) { return []; }
  })();

  /* ── Seasonal collections ─────────────────────────────────────────────── */
  /*
   * CUSTOMISE: Remove entries you don't want; set to [] for no seasonal collections.
   * Files must be in a `themes/` subdirectory alongside the SPA's index.html.
   * UUID-suffixed filenames prevent collisions when themes from multiple sources
   * are stored in the same directory.
   */
  var SEASONAL_COLLECTIONS = [
    { id: 'seasons-spring', name: 'Spring', file: 'themes/wcp-theme-collection-seasons-spring-d9f2581e-f063-4a15-baf8-e6cce8ba609b.wcpt' },
    { id: 'seasons-summer', name: 'Summer', file: 'themes/wcp-theme-collection-seasons-summer-4e27a6db-1044-4eca-aa83-13166ef8f54e.wcpt' },
    { id: 'seasons-autumn', name: 'Autumn', file: 'themes/wcp-theme-collection-seasons-autumn-c5e9bbcd-3ece-4bef-8b6c-98f53a0cf671.wcpt' },
    { id: 'seasons-winter', name: 'Winter', file: 'themes/wcp-theme-collection-seasons-winter-4101d760-bcb8-4d1b-8a80-38ba6a1b736a.wcpt' },
  ];

  /* ── Storage ──────────────────────────────────────────────────────────── */
  var CK = 'wcp-active-collection';
  var UK = 'wcp-user-collections';
  function getActiveColId()         { try { return localStorage.getItem(CK) || 'my-themes'; } catch (e) { return 'my-themes'; } }
  function setActiveColId(id)       { try { localStorage.setItem(CK, id); } catch (e) {} }
  function getUserCollections()     { try { return JSON.parse(localStorage.getItem(UK)) || []; } catch (e) { return []; } }
  function saveUserCollections(arr) { try { localStorage.setItem(UK, JSON.stringify(arr)); } catch (e) {} }

  /* ── Seasonal availability probing ───────────────────────────────────── */
  /*
   * On modal open, HEAD-probes each seasonal .wcpt file once per session.
   * Only available files appear in the dropdown — missing files are hidden
   * silently, so the SPA works even without any seasonal .wcpt files deployed.
   */
  function probeSeasonalAvailability(callback) {
    if (!SEASONAL_COLLECTIONS.length) { callback(); return; }
    var pending = SEASONAL_COLLECTIONS.length;
    function done() { if (!--pending) callback(); }
    SEASONAL_COLLECTIONS.forEach(function (col) {
      var key = 'wcp-col-avail-' + col.id;
      try { if (sessionStorage.getItem(key) === '1') { done(); return; } } catch (e) {}
      fetch(col.file, { method: 'HEAD' })
        .then(function (r) { try { sessionStorage.setItem(key, r.ok ? '1' : '0'); } catch (e) {} })
        .catch(function ()  { try { sessionStorage.setItem(key, '0');             } catch (e) {} })
        .then(done);
    });
  }
  function isSeasonalAvailable(col) {
    try { return sessionStorage.getItem('wcp-col-avail-' + col.id) === '1'; } catch (e) { return false; }
  }

  /* ── Seasonal theme loading ───────────────────────────────────────────── */
  function loadSeasonalThemes(col, callback) {
    var key = 'wcp-col-themes-' + col.id;
    try { var cached = sessionStorage.getItem(key); if (cached) { callback(JSON.parse(cached)); return; } } catch (e) {}
    fetch(col.file)
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (buf) { return JSZip.loadAsync(buf); })
      .then(function (zip) { return zip.file('themes.json').async('string'); })
      .then(function (json) {
        try { sessionStorage.setItem(key, json); } catch (e) {}
        try { callback(JSON.parse(json)); } catch (e) { console.warn('wcp seasonal render:', e); }
      })
      .catch(function (e) { console.warn('wcp seasonal load:', e); callback([]); });
  }

  /* ── Dropdown ─────────────────────────────────────────────────────────── */
  function renderDropdown() {
    var sel = document.getElementById('wcp-collection-select'); if (!sel) return;
    var active   = getActiveColId();
    var userCols = getUserCollections();
    var avail    = SEASONAL_COLLECTIONS.filter(isSeasonalAvailable);
    var html = '<option value="my-themes"' + (active === 'my-themes' ? ' selected' : '') + '>My Themes</option>';
    if (avail.length) {
      html += '<optgroup label="Seasons">';
      avail.forEach(function (col) {
        html += '<option value="' + col.id + '"' + (active === col.id ? ' selected' : '') + '>' + col.name + '</option>';
      });
      html += '</optgroup>';
    }
    if (userCols.length) {
      html += '<optgroup label="Imported Collections">';
      userCols.forEach(function (col) {
        html += '<option value="' + col.id + '"' + (active === col.id ? ' selected' : '') + '>' + col.name + '</option>';
      });
      html += '</optgroup>';
    }
    sel.innerHTML = html;
  }

  /* ── Collection header ────────────────────────────────────────────────── */
  function colHeader(name, colId, deletable) {
    return '<div class="wcp-col-header"><span>' + name + '</span>' +
      (deletable ? '<button class="wcp-col-delete-btn" data-cid="' + colId + '" onclick="wcpDeleteCollection(this.dataset.cid)">Delete Collection</button>' : '') +
      '</div>';
  }

  /* ── Collection render ────────────────────────────────────────────────── */
  function renderCollection(colId) {
    var wt = WT(), sel = wt.getSelected ? wt.getSelected() : 'built-in';

    var seasonal = SEASONAL_COLLECTIONS.find(function (c) { return c.id === colId; });
    if (seasonal) {
      listEl.innerHTML = colHeader(seasonal.name, colId, false) + '<div class="wcp-theme-loading">Loading…</div>';
      loadSeasonalThemes(seasonal, function (themes) {
        var html = colHeader(seasonal.name, colId, false);
        themes.forEach(function (t) {
          var uuid = t.uuid || t.id;
          html += '<div class="wcp-theme-item" data-uuid="' + uuid + '" data-cid="' + colId + '" onclick="wcpSelectSeasonalTheme(this.dataset.uuid,this.dataset.cid)">' +
            '<input type="radio" name="wcp-theme-radio" ' + (sel === uuid ? 'checked' : '') + '><label>' + t.name + '</label></div>';
        });
        listEl.innerHTML = html || colHeader(seasonal.name, colId, false) + '<div class="wcp-theme-loading">No themes found.</div>';
        if (window.wcpRenderExportPanel) window.wcpRenderExportPanel();
      });
      return;
    }

    var userCols = getUserCollections();
    var userCol  = userCols.find(function (c) { return c.id === colId; });
    if (userCol) {
      var html = colHeader(userCol.name, colId, true);
      (userCol.themes || []).forEach(function (t) {
        html += '<div class="wcp-theme-item" data-uuid="' + t.uuid + '" data-cid="' + colId + '" onclick="wcpSelectImported(this.dataset.uuid,this.dataset.cid)">' +
          '<input type="radio" name="wcp-theme-radio" ' + (sel === t.uuid ? 'checked' : '') + '><label>' + t.name + '</label></div>';
      });
      listEl.innerHTML = html;
      return;
    }

    /* My Themes */
    var themes     = wt.getThemes ? wt.getThemes() : [];
    var userThemes = themes.filter(function (t) { return WCP_BUILTIN_UUIDS.indexOf(t.uuid) < 0 && !t._seasonal && !t._collection; });
    var html = colHeader('My Themes', 'my-themes', false);
    html += '<div class="wcp-theme-item" onclick="wcpSelectBuiltin()">' +
      '<input type="radio" name="wcp-theme-radio" ' + (sel === 'built-in' ? 'checked' : '') + '><label>Built-in <span class="wcp-theme-builtin">(default)</span></label></div>';
    WCP_BUILTIN_THEMES.forEach(function (t) {
      html += '<div class="wcp-theme-item" data-uuid="' + t.uuid + '" onclick="wcpSelectBuiltinTheme(this.dataset.uuid)">' +
        '<input type="radio" name="wcp-theme-radio" ' + (sel === t.uuid ? 'checked' : '') + '>' +
        '<label>' + t.name + '<br><span class="wcp-theme-builtin">Built-in</span></label></div>';
    });
    userThemes.forEach(function (t) {
      html += '<div class="wcp-theme-item" data-uuid="' + t.uuid + '" onclick="wcpSelectImported(this.dataset.uuid)">' +
        '<input type="radio" name="wcp-theme-radio" ' + (sel === t.uuid ? 'checked' : '') + '>' +
        '<label>' + t.name + '</label>' +
        '<button class="wcp-theme-delete" data-uuid="' + t.uuid + '" onclick="event.stopPropagation();wcpDeleteTheme(this.dataset.uuid)" title="Remove">&times;</button></div>';
    });
    listEl.innerHTML = html;
  }

  function renderAll() { renderCollection(getActiveColId()); if (window.wcpRenderExportPanel) window.wcpRenderExportPanel(); }

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function resolveUuid(obj) { return obj && (obj.uuid || obj.id) || null; }
  function normaliseTheme(th) { var uuid = resolveUuid(th); if (!uuid || !th.vars) return null; return { uuid: uuid, name: th.name || 'Unnamed Theme', vars: th.vars }; }
  function isDuplicate(obj) {
    var uuid = resolveUuid(obj); if (!uuid) return false;
    if (WCP_BUILTIN_UUIDS.indexOf(uuid) >= 0) return true;
    var wt = WT(), existing = (wt.getThemes ? wt.getThemes() : []);
    return !!existing.find(function (t) { return t.uuid === uuid && !t._seasonal && !t._collection; });
  }

  /* ── Wizard (file import panel within Theme pane) ──────────────────────── */
  function openWizard()  { wizardEl.classList.add('open'); importBtn.disabled = true; }
  function closeWizard() { wizardEl.classList.remove('open'); importBtn.disabled = false; document.getElementById('wcp-theme-file').value = ''; errEl.style.display = 'none'; }

  /* ── Info modals ──────────────────────────────────────────────────────── */
  var infoBackdrop   = document.getElementById('wcp-info-backdrop');
  var infoReturnTab  = 'theme';
  window.wcpOpenInfoModal = function (returnTab) { infoReturnTab = returnTab || 'theme'; backdrop.classList.remove('open'); infoBackdrop.classList.add('open'); };
  window.wcpCloseInfoModal = function () { infoBackdrop.classList.remove('open'); switchTab(infoReturnTab); backdrop.classList.add('open'); };
  infoBackdrop.addEventListener('click', function (e) { if (e.target === infoBackdrop) wcpCloseInfoModal(); });

  /* URL export info modal — only wired if html-url-export-info-modal.html is present (Step 9) */
  var urlExportInfoBackdrop = document.getElementById('wcp-url-export-info-backdrop');
  if (urlExportInfoBackdrop) {
    window.wcpOpenUrlExportInfo = function () { backdrop.classList.remove('open'); urlExportInfoBackdrop.classList.add('open'); };
    window.wcpCloseUrlExportInfo = function (backToSettings) { urlExportInfoBackdrop.classList.remove('open'); if (backToSettings) { switchTab('theme'); backdrop.classList.add('open'); } };
    urlExportInfoBackdrop.addEventListener('click', function (e) { if (e.target === urlExportInfoBackdrop) wcpCloseUrlExportInfo(); });
  }

  /* ── Tab switching ────────────────────────────────────────────────────── */
  /*
   * CUSTOMISE: Add 'aiskill' if you included the AI Skill PKG tab (Step 10).
   * The array must match the id suffixes of the pane and tab button elements.
   */
  var TABS = ['theme', 'about', 'wcp']; /* add 'aiskill' if Step 10 applied */
  function switchTab(tab) {
    TABS.forEach(function (t) {
      document.getElementById('wcp-pane-' + t).classList.toggle('hidden', t !== tab);
      document.getElementById('wcp-tab-'  + t).classList.toggle('active', t === tab);
    });
  }
  window.wcpSwitchTab = switchTab;

  /* ── Settings modal open/close ────────────────────────────────────────── */
  window.wcpOpenThemeModal = function () {
    closeWizard(); switchTab('theme'); backdrop.classList.add('open');
    renderDropdown(); renderAll();
    probeSeasonalAvailability(function () { renderDropdown(); });
  };
  window.wcpCloseThemeModal = function () { backdrop.classList.remove('open'); };
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) wcpCloseThemeModal(); });

  /* ── Collection switching ─────────────────────────────────────────────── */
  window.wcpSwitchCollection = function (colId) { setActiveColId(colId); renderAll(); };
  window.wcpDeleteCollection = function (colId) {
    var wt = WT();
    var themes = (wt.getThemes ? wt.getThemes() : []).filter(function (t) { return t._collection !== colId; });
    if (wt.saveThemes) wt.saveThemes(themes);
    var sel = wt.getSelected ? wt.getSelected() : 'built-in';
    var stillExists = themes.find(function (t) { return t.uuid === sel; }) || WCP_BUILTIN_UUIDS.indexOf(sel) >= 0 || sel === 'built-in';
    if (!stillExists) { if (wt.restoreBuiltin) wt.restoreBuiltin(); if (wt.selectTheme) wt.selectTheme('built-in'); }
    saveUserCollections(getUserCollections().filter(function (c) { return c.id !== colId; }));
    setActiveColId('my-themes');
    renderDropdown(); renderAll();
  };

  /* ── Theme selection ──────────────────────────────────────────────────── */
  window.wcpSelectBuiltin = function () {
    var wt = WT(); if (wt.restoreBuiltin) wt.restoreBuiltin(); if (wt.selectTheme) wt.selectTheme('built-in'); renderAll();
  };
  window.wcpSelectBuiltinTheme = function (uuid) {
    var wt = WT(), t = WCP_BUILTIN_THEMES.find(function (x) { return x.uuid === uuid; }); if (!t) return;
    if (wt.importTheme) wt.importTheme(t); if (wt.applyVars) wt.applyVars(t.vars); renderAll();
  };
  window.wcpSelectImported = function (uuid, fromColId) {
    var wt = WT();
    if (fromColId) {
      var col = getUserCollections().find(function (c) { return c.id === fromColId; });
      if (col) {
        var theme = (col.themes || []).find(function (t) { return t.uuid === uuid; });
        if (theme) {
          var rest = (wt.getThemes ? wt.getThemes() : []).filter(function (t) { return t._collection !== fromColId; });
          rest.push({ uuid: uuid, name: theme.name, vars: theme.vars, _collection: fromColId });
          if (wt.saveThemes) wt.saveThemes(rest);
        }
      }
    }
    if (wt.selectTheme) wt.selectTheme(uuid); if (wt.applySelected) wt.applySelected(); renderAll();
  };
  window.wcpSelectSeasonalTheme = function (uuid, colId) {
    var key = 'wcp-col-themes-' + colId;
    try {
      var cached = sessionStorage.getItem(key); if (!cached) return;
      var themes = JSON.parse(cached);
      var theme  = themes.find(function (t) { return (t.uuid || t.id) === uuid; }); if (!theme) return;
      var wt = WT();
      var rest = (wt.getThemes ? wt.getThemes() : []).filter(function (t) { return !t._seasonal; });
      rest.push({ uuid: uuid, name: theme.name, vars: theme.vars, _seasonal: true });
      if (wt.saveThemes) wt.saveThemes(rest);
      if (wt.selectTheme) wt.selectTheme(uuid);
      if (wt.applyVars)   wt.applyVars(theme.vars);
      renderAll();
    } catch (e) {}
  };
  window.wcpDeleteTheme = function (uuid) {
    var wt = WT(); if (WCP_BUILTIN_UUIDS.indexOf(uuid) >= 0) return;
    var themes = (wt.getThemes ? wt.getThemes() : []).filter(function (t) { return t.uuid !== uuid; });
    if (wt.saveThemes) wt.saveThemes(themes);
    var sel = wt.getSelected ? wt.getSelected() : 'built-in';
    if (sel === uuid) { if (wt.restoreBuiltin) wt.restoreBuiltin(); if (wt.selectTheme) wt.selectTheme('built-in'); }
    renderAll();
  };

  /* ── .wcpt / JSON file import ─────────────────────────────────────────── */
  /*
   * Single theme → goes to My Themes.
   * Multiple themes → creates a named user collection (shown in dropdown,
   *   deletable). Collection name read from manifest.json `collectionName`
   *   field; falls back to "Imported <date>" if absent.
   */
  function processImportedData(raw, collectionName) {
    var arr = Array.isArray(raw) ? raw : (raw && (raw.uuid || raw.id)) ? [raw] : (raw && Array.isArray(raw.themes)) ? raw.themes : [];
    if (!arr.length) { errEl.textContent = 'No valid themes found in the file.'; errEl.style.display = 'block'; return; }
    var validThemes = arr.map(normaliseTheme).filter(Boolean);
    if (!validThemes.length) { errEl.textContent = 'No valid themes found.'; errEl.style.display = 'block'; return; }

    if (validThemes.length === 1) {
      var th = validThemes[0];
      if (isDuplicate(th)) { errEl.textContent = 'A theme with this ID already exists.'; errEl.style.display = 'block'; return; }
      var wt = WT();
      if (wt.importTheme) wt.importTheme(th); if (wt.applyVars) wt.applyVars(th.vars);
      setActiveColId('my-themes'); closeWizard(); renderDropdown(); renderAll(); return;
    }

    var colName   = collectionName || ('Imported ' + new Date().toLocaleDateString());
    var colId     = 'ucol-' + Date.now();
    var cols      = getUserCollections();
    var newThemes = validThemes.filter(function (t) { return WCP_BUILTIN_UUIDS.indexOf(t.uuid) < 0; });
    if (!newThemes.length) { errEl.textContent = 'All themes already exist.'; errEl.style.display = 'block'; return; }
    cols.push({ id: colId, name: colName, themes: newThemes });
    saveUserCollections(cols);
    setActiveColId(colId);
    var wt = WT();
    if (wt.importTheme) wt.importTheme(newThemes[0]); if (wt.applyVars) wt.applyVars(newThemes[0].vars);
    closeWizard(); renderDropdown(); renderAll();
  }

  window.wcpImportFile = function () {
    errEl.style.display = 'none';
    var f = document.getElementById('wcp-theme-file').files[0];
    if (!f) { errEl.textContent = 'Please choose a file.'; errEl.style.display = 'block'; return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = e.target.result;
        if (f.name.endsWith('.wcpt') && typeof JSZip !== 'undefined') {
          JSZip.loadAsync(data).then(function (zip) {
            var files  = Object.values(zip.files);
            var tEntry = files.find(function (x) { return x.name === 'themes.json' || /\/themes\.json$/.test(x.name); });
            var mEntry = files.find(function (x) { return x.name === 'manifest.json' || /\/manifest\.json$/.test(x.name); });
            if (!tEntry) tEntry = files.find(function (x) { return x.name.endsWith('.json') && !/manifest\.json$/i.test(x.name); });
            if (!tEntry) throw new Error('No theme data found in .wcpt');
            return Promise.all([tEntry.async('string'), mEntry ? mEntry.async('string') : Promise.resolve(null)]);
          }).then(function (r) {
            var themes = JSON.parse(r[0]), colName = null;
            if (r[1]) { try { colName = JSON.parse(r[1]).collectionName || null; } catch (e2) {} }
            processImportedData(themes, colName);
          }).catch(function (err) { errEl.textContent = 'Error: ' + err.message; errEl.style.display = 'block'; });
          return;
        }
        processImportedData(JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)), null);
      } catch (err) { errEl.textContent = 'Invalid theme file: ' + err.message; errEl.style.display = 'block'; }
    };
    if (f.name.endsWith('.wcpt') && typeof JSZip !== 'undefined') reader.readAsArrayBuffer(f); else reader.readAsText(f);
  };

  document.getElementById('wcp-wizard-cancel').addEventListener('click', closeWizard);
  importBtn.addEventListener('click', openWizard);

  /* Escape key: close modals in priority order */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (infoBackdrop.classList.contains('open')) wcpCloseInfoModal();
      else if (urlExportInfoBackdrop && urlExportInfoBackdrop.classList.contains('open')) wcpCloseUrlExportInfo();
      else if (backdrop.classList.contains('open')) wcpCloseThemeModal();
    }
  });

  /* Expose so theme engine can re-render after URL-payload import */
  window._wcpRenderList = function () { setActiveColId('my-themes'); renderDropdown(); renderAll(); };
  window.WCP_BUILTIN_THEMES = WCP_BUILTIN_THEMES;
})();

/* ── Docker Quick Start copy button (in info modal) ──────────────────────── */
window.wcpCopyCmd = function () {
  var cmd = 'docker run -d \\\n  --name wcp-widget-theme-studio \\\n' +
            '  -p 3740:3740 \\\n  -v theme_data:/app/data \\\n' +
            '  -v theme_published:/app/published \\\n' +
            '  -e CONTAINER_NAME=wcp-widget-theme-studio \\\n' +
            '  --restart unless-stopped \\\n' +
            '  docker.io/penrithbeacon/wcp-widget-theme-studio:latest';
  var btn = document.getElementById('wcp-copy-cmd-btn');
  function showTick() {
    btn.textContent = '✔';
    setTimeout(function () {
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13"' +
        ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    }, 2000);
  }
  if (!navigator.clipboard) { showTick(); return; }
  navigator.clipboard.writeText(cmd).then(showTick).catch(function () {});
};
