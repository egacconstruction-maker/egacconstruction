/* ============================================================================
   EGAC CONSTRUCTION — NAVIGATION
   Header scroll state, solutions mega menu, mobile menu, active-section
   tracking and page transitions.
   ========================================================================== */

window.Nav = (function () {
  'use strict';

  var header, mega, megaTrigger, burger, mobileMenu;
  var lastY = 0, ticking = false, megaOpen = false, menuOpen = false;
  var hoverTimer = null;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;

    header.classList.toggle('is-solid', y > 40);

    /* auto-hide once the user is well down the page and scrolling away */
    var goingDown = y > lastY + 4;
    if (!megaOpen && !menuOpen && y > 700 && goingDown) {
      header.classList.add('is-hidden');
      closeMega();
    } else if (y < lastY - 4 || y <= 700) {
      header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  }

  function requestScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }

  /* ------------------------------------------------------------- mega menu */
  function openMega() {
    if (megaOpen || window.matchMedia('(max-width: 900px)').matches) return;
    megaOpen = true;
    mega.hidden = false;
    window.requestAnimationFrame(function () { mega.classList.add('is-open'); });
    megaTrigger.setAttribute('aria-expanded', 'true');
    /* On a short viewport the panel reaches the floating buttons, so they
       step aside while it is open rather than sitting there unclickable. */
    document.documentElement.classList.add('is-mega-open');
  }

  function closeMega() {
    if (!megaOpen) return;
    megaOpen = false;
    mega.classList.remove('is-open');
    megaTrigger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('is-mega-open');
    window.setTimeout(function () { if (!megaOpen) mega.hidden = true; }, 400);
  }

  function bindMega() {
    if (!mega || !megaTrigger) return;
    var parent = megaTrigger.closest('li');

    parent.addEventListener('mouseenter', function () {
      window.clearTimeout(hoverTimer);
      openMega();
    });
    [parent, mega].forEach(function (el) {
      el.addEventListener('mouseleave', function () {
        hoverTimer = window.setTimeout(closeMega, 180);
      });
      el.addEventListener('mouseenter', function () { window.clearTimeout(hoverTimer); });
    });

    megaTrigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openMega(); mega.querySelector('a').focus(); }
    });
    megaTrigger.addEventListener('click', function () { closeMega(); });
    mega.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) closeMega();
    });
  }

  /* ----------------------------------------------------------- mobile menu */
  function openMenu() {
    menuOpen = true;
    mobileMenu.hidden = false;
    window.requestAnimationFrame(function () { mobileMenu.classList.add('is-open'); });
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', window.I18N.t('nav.menuClose'));
    document.body.classList.add('is-locked');
    header.classList.remove('is-hidden');
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    mobileMenu.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', window.I18N.t('nav.menuOpen'));
    document.body.classList.remove('is-locked');
    window.setTimeout(function () { if (!menuOpen) mobileMenu.hidden = true; }, 640);
  }

  function bindMenu() {
    if (!burger || !mobileMenu) return;
    burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) closeMenu();
    });
  }

  /* ------------------------------------------------- active section marker */
  function trackSections() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) map[id] = link;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-current'); });
        var active = map[entry.target.id];
        if (active) active.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(map).forEach(function (id) { observer.observe(document.getElementById(id)); });
  }

  /* -------------------------------------------------------- page transition */
  function bindPageTransitions() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#' || link.target === '_blank') return;
      if (link.hasAttribute('download') || /^(mailto:|tel:|https?:\/\/|\/\/)/.test(href)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      /* With reduced motion the curtain is skipped entirely. */
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      e.preventDefault();
      document.documentElement.classList.add('is-leaving');

      /* The last panel lands at 420ms (330ms sweep + 90ms stagger); we hand
         over to the browser right then, so the new page paints behind a
         fully closed curtain and there is never a flash of white. */
      window.setTimeout(function () { window.location.href = href; }, 430);
    });

    /* Coming back through history restores the page mid-exit, so clear the
       state and replay the arrival sweep. Without this the visitor would
       land on a page still hidden behind the curtain. */
    window.addEventListener('pageshow', function (event) {
      if (!document.documentElement.classList.contains('is-leaving') && !event.persisted) return;
      document.documentElement.classList.remove('is-leaving');

      var panels = document.querySelectorAll('.curtain__panel');
      panels.forEach(function (panel) {
        panel.style.animation = 'none';
        /* force a reflow so the animation can be restarted */
        void panel.offsetWidth;
        panel.style.animation = '';
      });
    });
  }

  function init() {
    header = document.getElementById('header');
    mega = document.getElementById('mega');
    megaTrigger = document.getElementById('megaTrigger');
    burger = document.getElementById('burger');
    mobileMenu = document.getElementById('mobileMenu');
    if (!header) return;

    if (document.body.dataset.navSolid === 'true') header.classList.add('is-forced');

    window.addEventListener('scroll', requestScroll, { passive: true });
    onScroll();

    bindMega();
    bindMenu();
    trackSections();
    bindPageTransitions();

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeMega();
      closeMenu();
    });

    /* language buttons */
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.I18N.set(btn.getAttribute('data-lang-btn'));
        closeMega();
        closeMenu();
      });
    });

    window.addEventListener('languagechange', function () {
      if (burger) {
        burger.setAttribute('aria-label',
          window.I18N.t(menuOpen ? 'nav.menuClose' : 'nav.menuOpen'));
      }
    });
  }

  return { init: init, closeMega: closeMega, closeMenu: closeMenu };
})();
