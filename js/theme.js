/* ============================================================================
   EGAC CONSTRUCTION — LIGHT / DARK THEME
   ----------------------------------------------------------------------------
   The theme itself is pure CSS: every rule paints with the tokens declared in
   css/main.css §1, and `html[data-theme="dark"]` overrides that one block.
   This file only decides which value the attribute carries.

   ORDER OF PRECEDENCE
     1. what the visitor last chose        (localStorage, key 'egac-theme')
     2. their operating system preference  (prefers-color-scheme)
     3. light

   NO FLASH: a three-line inline script in the <head> of every page sets the
   attribute before the stylesheets paint. This module runs later and only
   wires up the button, so the page never renders in the wrong theme.

   THE LOGO IS NEVER RECOLOURED. Both official files are already in the
   markup, stacked in one grid cell; the theme decides which of the two is
   opaque (see css/main.css, "brand lock-up"). No filter, no invert.
   ========================================================================== */

window.Theme = (function () {
  'use strict';

  var KEY = 'egac-theme';
  var root = document.documentElement;
  var buttons = [];

  function stored() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function remember(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* private mode */ }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  /** Keeps every toggle in the page (navbar + mobile menu) in agreement. */
  function paintButtons() {
    var dark = current() === 'dark';
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      var label = window.I18N
        ? window.I18N.t(dark ? 'theme.toLight' : 'theme.toDark')
        : (dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  function apply(value, persist) {
    root.setAttribute('data-theme', value === 'dark' ? 'dark' : 'light');
    if (persist) remember(value);
    paintButtons();

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'dark' ? '#06111D' : '#0B1C30');

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: value } }));
  }

  function toggle() {
    /* Colours cross-fade for a moment, then the hint is removed so the
       transition never interferes with scrolling or hover states. */
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('is-theming');
      window.setTimeout(function () { root.classList.remove('is-theming'); }, 460);
    }
    apply(current() === 'dark' ? 'light' : 'dark', true);
  }

  function init() {
    buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-toggle]'));

    /* The inline head script already set the attribute; this only reconciles
       the case where it could not run. */
    if (!root.getAttribute('data-theme')) {
      apply(stored() || (systemPrefersDark() ? 'dark' : 'light'), false);
    } else {
      paintButtons();
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });

    /* Follow the system only while the visitor has not made a choice. */
    if (window.matchMedia) {
      var query = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        if (!stored()) apply(e.matches ? 'dark' : 'light', false);
      };
      if (query.addEventListener) query.addEventListener('change', onChange);
      else if (query.addListener) query.addListener(onChange);
    }

    window.addEventListener('languagechange', paintButtons);
  }

  return { init: init, toggle: toggle, apply: apply, current: current };
})();
