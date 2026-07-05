/**
 * WCP THEME ENGINE — core theme state machine (IIFE)
 *
 * Responsibilities:
 *  - Apply a theme object's vars to document.documentElement CSS custom properties
 *  - Persist theme selection to localStorage (user-themes list + selected UUID)
 *  - Cache active vars to sessionStorage for same-tab restore without flash
 *  - Handle two URL import paths on page load:
 *      • ?com.widgetcontextprotocol.theme=<base64>  (query string — primary)
 *      • #wcp-theme=<base64>                      (hash fragment — legacy)
 *  - Relay active theme vars to any <iframe> on the page via postMessage
 *  - Listen for postMessage theme pushes from a parent frame
 *
 * Exposes: window._wcpTheme — API object used by the modal controller
 *
 * Dependencies: none (no external libraries)
 * Place in <script> before js-theme-modal-controller.js and before </body>
 *
 * Query parameter key: com.widgetcontextprotocol.theme
 * Storage keys:
 *   sessionStorage: 'wcp-theme'        (active vars JSON)
 *   localStorage:   'wcp-user-themes'  (array of {uuid, name, vars})
 *                   'wcp-selected-theme' (UUID string or 'built-in')
 */

(function () {
  var SK = 'wcp-theme';          /* sessionStorage: active vars */
  var LK = 'wcp-user-themes';   /* localStorage:  user theme list */
  var AK = 'wcp-selected-theme'; /* localStorage:  selected UUID */
  var root = document.documentElement;

  /* Apply a vars map to :root CSS custom properties */
  function applyVars(vars) {
    if (!vars) return;
    for (var k in vars) {
      if (k.indexOf('-exempt-') !== -1) continue; /* skip exempt tokens */
      root.style.setProperty(k, vars[k]);
    }
    root.classList.add('wcp-themed');
    try { sessionStorage.setItem(SK, JSON.stringify(vars)); } catch (e) {}
    /* Relay to iframes */
    document.querySelectorAll('iframe').forEach(function (f) {
      try { f.contentWindow.postMessage({ type: 'wcp:theme', vars: vars }, '*'); } catch (e) {}
    });
  }

  /* Remove all --wcp-* custom properties set by JS, restoring CSS-defined defaults */
  function restoreBuiltin() {
    var s = root.style;
    for (var i = s.length - 1; i >= 0; i--) {
      var p = s[i];
      if (p.startsWith('--wcp-') && p.indexOf('-exempt-') === -1) s.removeProperty(p);
    }
    root.classList.remove('wcp-themed');
    try { sessionStorage.removeItem(SK); } catch (e) {}
  }

  function getThemes()  { try { return JSON.parse(localStorage.getItem(LK)) || []; } catch (e) { return []; } }
  function saveThemes(arr) { try { localStorage.setItem(LK, JSON.stringify(arr)); } catch (e) {} }
  function selectTheme(uuid) { try { localStorage.setItem(AK, uuid); } catch (e) {} }
  function getSelected() { try { return localStorage.getItem(AK) || 'built-in'; } catch (e) { return 'built-in'; } }

  /* Add or overwrite a theme in the user list; select it */
  function importTheme(obj) {
    var uuid = obj && (obj.uuid || obj.id);
    if (!uuid) return false;
    var themes = getThemes(), idx = themes.findIndex(function (t) { return t.uuid === uuid; });
    if (idx >= 0) { themes[idx] = { uuid: uuid, name: obj.name, vars: obj.vars }; }
    else          { themes.push(  { uuid: uuid, name: obj.name, vars: obj.vars }); }
    saveThemes(themes);
    selectTheme(uuid);
    return true;
  }

  /* Apply the persisted selected theme (or restore built-in) */
  function applySelected() {
    var sel = getSelected();
    if (sel === 'built-in') { restoreBuiltin(); return; }
    var themes = getThemes(), t = themes.find(function (x) { return x.uuid === sel; });
    if (t) { applyVars(t.vars); }
    else   { restoreBuiltin(); selectTheme('built-in'); }
  }

  /**
   * Handle a base64-encoded theme payload (from URL query string or hash).
   * Accepts two payload shapes:
   *   1. Full theme object: { uuid, name, vars, ... }  → import + apply
   *   2. Raw vars map:      { "--wcp-color-bg": "#fff", ... } → apply without persisting
   *
   * If the theme UUID matches a built-in or already-stored UUID, it is
   * selected directly rather than duplicated in the user list.
   */
  function handlePayload(b64) {
    try {
      var obj = JSON.parse(atob(b64));
      if (obj.vars && obj.uuid) {
        /* Full theme object */
        var alreadyExists =
          (typeof WCP_BUILTIN_UUIDS !== 'undefined' && WCP_BUILTIN_UUIDS.indexOf(obj.uuid) >= 0) ||
          getThemes().some(function (t) { return t.uuid === obj.uuid; });
        if (alreadyExists) {
          selectTheme(obj.uuid);
          applySelected();
          return;
        }
        importTheme(obj);
        applyVars(obj.vars);
        return;
      }
      /* Bare vars map */
      if (typeof obj === 'object' && !obj.vars) { applyVars(obj); }
    } catch (e) {}
  }

  /* ── Boot sequence ─────────────────────────────────────────────────────── */
  var QK = 'com.widgetcontextprotocol.theme';
  var qp = new URLSearchParams(location.search).get(QK);

  if (location.hash.startsWith('#wcp-theme=')) {
    /* Legacy hash-fragment path */
    handlePayload(location.hash.slice(11));
    setTimeout(function () { if (window._wcpRenderList) window._wcpRenderList(); }, 0);
  } else if (qp) {
    /* Standard query-string path */
    handlePayload(qp);
    setTimeout(function () { if (window._wcpRenderList) window._wcpRenderList(); }, 0);
  } else {
    /* No URL theme: restore sessionStorage cache, then localStorage selection */
    try {
      var ss = sessionStorage.getItem(SK);
      if (ss) { applyVars(JSON.parse(ss)); }
    } catch (e) {}
    if (!sessionStorage.getItem(SK)) { applySelected(); }
  }

  /* Listen for theme pushes from a parent frame (e.g. WCP host dashboard) */
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'wcp:theme' && e.data.vars) applyVars(e.data.vars);
  });

  /* Public API — consumed by js-theme-modal-controller.js */
  window._wcpTheme = {
    getThemes:      getThemes,
    saveThemes:     saveThemes,
    selectTheme:    selectTheme,
    getSelected:    getSelected,
    importTheme:    importTheme,
    applySelected:  applySelected,
    applyVars:      applyVars,
    restoreBuiltin: restoreBuiltin
  };
})();
