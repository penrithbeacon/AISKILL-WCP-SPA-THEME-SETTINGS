/**
 * WCP THEME URL EXPORT — generates shareable URL query strings for the active theme (IIFE)
 *
 * Renders two copy-able strings inside #wcp-url-export whenever a named theme is active:
 *   Full query string:  ?com.widgetcontextprotocol.theme=<base64>
 *   Parameter only:     &com.widgetcontextprotocol.theme=<base64>
 *
 * The panel is hidden when Built-in (default) is selected — there is no payload to export.
 *
 * The base64 payload is a JSON theme object:
 *   { "uuid": "<uuid>", "name": "<name>", "vars": { "--wcp-*": "..." } }
 *
 * This script is intentionally separate from js-theme-modal-controller.js so that
 * integrators who do not want the URL export feature can omit it without touching
 * the controller.
 *
 * Exposes globals (called from inline onclick HTML attributes):
 *   wcpRenderExportPanel  — called by the modal controller after every renderList()
 *   wcpCopyExportUrl      — called by Copy buttons in html-theme-url-export.html
 *
 * Dependencies:
 *   - js-wcp-theme-engine.js  (window._wcpTheme must be populated)
 *   - html-theme-url-export.html  (DOM elements #wcp-url-export, #wcp-export-full, #wcp-export-param)
 *
 * Query parameter key: com.widgetcontextprotocol.theme
 */

(function () {
  var QK = 'com.widgetcontextprotocol.theme';

  /* Collect theme object for the currently selected UUID */
  function getActiveTheme() {
    var wt = window._wcpTheme || {};
    var sel = wt.getSelected ? wt.getSelected() : 'built-in';
    if (sel === 'built-in') return null;

    /* Check built-in named themes first (from the controller's WCP_BUILTIN_THEMES) */
    if (typeof WCP_BUILTIN_THEMES !== 'undefined') {
      var bt = WCP_BUILTIN_THEMES.find(function (t) { return (t.uuid || t.id) === sel; });
      if (bt) return bt;
    }

    /* Then check user-imported themes */
    var themes = wt.getThemes ? wt.getThemes() : [];
    return themes.find(function (t) { return t.uuid === sel; }) || null;
  }

  function buildPayload(theme) {
    try {
      return btoa(JSON.stringify({ uuid: theme.uuid || theme.id, name: theme.name, vars: theme.vars }));
    } catch (e) { return null; }
  }

  /* Render or hide the export panel based on current selection */
  function renderExportPanel() {
    var panel = document.getElementById('wcp-url-export');
    if (!panel) return;

    var theme = getActiveTheme();
    if (!theme) { panel.style.display = 'none'; return; }

    var b64 = buildPayload(theme);
    if (!b64) { panel.style.display = 'none'; return; }

    var fullStr  = '?' + QK + '=' + b64;
    var paramStr = '&' + QK + '=' + b64;

    var fullEl  = document.getElementById('wcp-export-full');
    var paramEl = document.getElementById('wcp-export-param');
    if (fullEl)  fullEl.textContent  = fullStr;
    if (paramEl) paramEl.textContent = paramStr;

    panel.style.display = 'block';
  }

  /* Copy one of the two URL forms; form = 'full' | 'param' */
  function copyExportUrl(form) {
    var elId  = form === 'full' ? 'wcp-export-full'   : 'wcp-export-param';
    var btnId = form === 'full' ? 'wcp-copy-full-btn' : 'wcp-copy-param-btn';
    var el    = document.getElementById(elId);
    var btn   = document.getElementById(btnId);
    if (!el || !el.textContent) return;

    var text = el.textContent;
    function showTick() {
      if (btn) { var orig = btn.textContent; btn.textContent = '✔'; setTimeout(function () { btn.textContent = orig; }, 2000); }
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(showTick).catch(function () { fallbackCopy(text); showTick(); });
    } else {
      fallbackCopy(text); showTick();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* Expose globals */
  window.wcpRenderExportPanel = renderExportPanel;
  window.wcpCopyExportUrl     = copyExportUrl;
})();
