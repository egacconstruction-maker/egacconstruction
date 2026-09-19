/* ============================================================================
   EGAC CONSTRUCTION — ANIMATION ENGINE
   ----------------------------------------------------------------------------
   Reveals run on IntersectionObserver so the site behaves correctly even if the
   GSAP CDN is unreachable. When GSAP + ScrollTrigger are present they take over
   the scrubbed parallax. Everything is skipped under prefers-reduced-motion.
   ========================================================================== */

window.Animations = (function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var observer = null;
  var started = false;
  var counterObserver = null;
  var parallaxItems = [];
  var rafPending = false;

  /* ------------------------------------------------------------- 1. loader
     The entrance intro (js/intro.js, css/intro.css) owns its own cinematic
     timeline and calls back into start() when the handoff to the navbar
     logo completes. If that module or its markup is ever missing, fall
     back to revealing the site immediately so nothing can get stuck. */
  function runLoader() {
    if (window.EgacIntro && typeof window.EgacIntro.run === 'function') {
      window.EgacIntro.run(start);
    } else {
      start();
    }
  }

  function start() {
    document.documentElement.classList.add('is-hero-ready');
  }

  /* -------------------------------------------------------- 1b. hero video
     The poster is in the markup and paints immediately. The video source is
     attached afterwards so it never blocks first render, and the smaller
     mobile file is chosen on narrow screens. With reduced motion the video is
     never loaded at all — the poster simply stays.
     ---------------------------------------------------------------------- */
  function initHeroVideo() {
    var media = document.getElementById('heroMedia');
    var video = document.getElementById('heroVideo');
    var C = window.SITE_CONFIG || {};
    if (!media || !video) return;

    var overlay = parseFloat(C.heroOverlay);
    if (!isNaN(overlay)) {
      document.documentElement.style.setProperty('--hero-overlay-opacity', String(overlay));
    }

    if (C.heroPoster) {
      var poster = document.getElementById('heroPoster');
      if (poster) poster.src = window.assetPath(C.heroPoster);
      video.poster = window.assetPath(C.heroPoster);
    }

    if (reduced || !C.heroVideo) {
      video.remove();
      return;
    }

    var small = window.matchMedia('(max-width: 900px)').matches;
    var file = (small && C.heroVideoMobile) ? C.heroVideoMobile : C.heroVideo;

    var source = document.createElement('source');
    source.src = window.assetPath(file);
    source.type = 'video/mp4';
    video.appendChild(source);

    video.addEventListener('playing', function () { media.classList.add('is-playing'); });
    video.addEventListener('error', function () { media.classList.remove('is-playing'); });

    video.load();
    var attempt = video.play();
    if (attempt && attempt.catch) {
      /* Autoplay refused (some battery-saver modes): keep the poster. */
      attempt.catch(function () { media.classList.remove('is-playing'); });
    }

    /* Do not burn battery or bandwidth while the hero is off screen. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.05 }).observe(media);
    }
  }

  /* ------------------------------------------------------------ 2. reveals */
  function initReveals() {
    var targets = document.querySelectorAll('[data-reveal], [data-stagger]');

    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach(function (el) {
      if (!el.classList.contains('is-in')) observer.observe(el);
    });
  }

  /* ----------------------------------------------------------- 3. counters */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = reduced ? 0 : 1500;
    var startTime = null;

    function format(n) {
      return Math.round(n).toLocaleString('en-US') + suffix;
    }
    if (!duration) { el.textContent = format(target); return; }

    function step(now) {
      if (startTime === null) startTime = now;
      var p = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4);          /* power4.out */
      el.textContent = format(target * eased);
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
      return;
    }
    counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ---------------------------------------------------------- 4. parallax */
  function initParallax() {
    var items = document.querySelectorAll('[data-parallax]');
    if (!items.length || reduced) return;

    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      items.forEach(function (el) {
        var depth = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        window.gsap.fromTo(el,
          { yPercent: -depth * 50 },
          {
            yPercent: depth * 50,
            ease: 'none',
            scrollTrigger: {
              trigger: el.closest('section') || el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          });
      });
      return;
    }

    /* fallback: light rAF parallax */
    parallaxItems = Array.prototype.slice.call(items);
    window.addEventListener('scroll', function () {
      if (rafPending) return;
      rafPending = true;
      window.requestAnimationFrame(function () {
        var vh = window.innerHeight;
        parallaxItems.forEach(function (el) {
          var host = el.closest('section') || el;
          var rect = host.getBoundingClientRect();
          if (rect.bottom < -200 || rect.top > vh + 200) return;
          var depth = parseFloat(el.getAttribute('data-parallax')) || 0.1;
          var centre = rect.top + rect.height / 2 - vh / 2;
          el.style.transform = 'translate3d(0,' + (-centre * depth).toFixed(2) + 'px,0)';
        });
        rafPending = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------ 5. custom cursor */
  function initCursor() {
    var cursor = document.getElementById('cursor');
    if (!cursor || reduced) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1025px)').matches) return;

    var label = cursor.querySelector('span');
    var x = 0, y = 0, cx = 0, cy = 0, pending = false;

    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      cursor.classList.add('is-visible');
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        cx += (x - cx) * 0.55;
        cy += (y - cy) * 0.55;
        cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
        pending = false;
      });
    });

    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-visible'); });

    document.addEventListener('mouseover', function (e) {
      var media = e.target.closest('[data-cursor="view"]');
      var link = e.target.closest('a, button, .filter, input, select, textarea');
      cursor.classList.toggle('is-media', !!media);
      cursor.classList.toggle('is-link', !media && !!link);
      if (media) label.textContent = media.getAttribute('data-cursor-label') || window.I18N.t('projects.view');
      else label.textContent = '';
    });
  }

  /* ------------------------------------------------------------------ api */
  function refresh() {
    /* Called before init (modules render their markup first), there is no
       observer yet — and the fallback below would mark every reveal on the
       page as already seen, killing the scroll animations. init() observes
       whatever exists by the time it runs, so doing nothing here is right. */
    if (!started) return;

    if (observer) {
      document.querySelectorAll('[data-reveal]:not(.is-in), [data-stagger]:not(.is-in)')
        .forEach(function (el) { observer.observe(el); });
    } else {
      document.querySelectorAll('[data-reveal], [data-stagger]')
        .forEach(function (el) { el.classList.add('is-in'); });
    }
    if (counterObserver) {
      document.querySelectorAll('[data-count]').forEach(function (el) { counterObserver.observe(el); });
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function init() {
    started = true;
    initHeroVideo();
    runLoader();
    initReveals();
    initCounters();
    initParallax();
    initCursor();
  }

  return { init: init, refresh: refresh, reduced: reduced };
})();
