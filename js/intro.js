/* ============================================================================
   EGAC CONSTRUCTION — ENTRANCE INTRO CONTROLLER
   ----------------------------------------------------------------------------
   Blueprint Registration Scan + dynamic logo handoff.

   The intro has a maximum duration of 5 seconds.
   The intro is removed immediately when the logo's actual CSS transform
   finishes — no guessed handoff delay.
   ========================================================================== */

window.EgacIntro = (function () {
  'use strict';

  function run(onDone) {
    var done = false;
    var timers = [];
    var html = document.documentElement;

    function clearTimers() {
      timers.forEach(function (timer) {
        window.clearTimeout(timer);
      });

      timers = [];
    }

    function settle() {
      if (done) return;

      done = true;
      clearTimers();

      try {
        if (typeof onDone === 'function') {
          onDone();
        }
      } finally {
        /* noop */
      }
    }

    var root = document.getElementById('egacIntro');
    var logoWrap = document.getElementById('egacIntroLogo');

    /* ================================================================
       SAFETY / REDUCED MOTION
       ================================================================ */

    var reduced = false;

    try {
      reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    } catch (e) {
      reduced = false;
    }

    if (!root || !logoWrap || reduced) {
      if (root) {
        root.style.display = 'none';
      }

      html.classList.add('egac-intro-ran');
      settle();
      return;
    }

    try {

      html.classList.add('egac-intro-lock');

      /* ==============================================================
         STAGE 1 — 0ms
         ============================================================= */

      root.classList.add('is-stage-1');


      /* ==============================================================
         STAGE 2 — 1000ms
         ============================================================= */

      timers.push(
        window.setTimeout(function () {

          if (done) return;

          root.classList.add('is-stage-2');

        }, 1000)
      );


      /* ==============================================================
         STAGE 3 — 2000ms
         ============================================================= */

      timers.push(
        window.setTimeout(function () {

          if (done) return;

          root.classList.add('is-stage-3');

        }, 2000)
      );


      /* ==============================================================
         STAGE 4 — 3000ms

         Start logo handoff.
         ============================================================= */

      timers.push(
        window.setTimeout(function () {

          if (done) return;

          /*
           * Calculate the exact navbar position
           * before starting the movement.
           */
          applyHandoffTransform(logoWrap);

          /*
           * Listen for the REAL CSS transform completion.
           * No hardcoded 1000ms handoff delay.
           */
          waitForLogoTransition(logoWrap, function () {

            if (done) return;

            finishIntro();

          });

          /*
           * Start stage 4 AFTER the listener is attached.
           */
          root.classList.add('is-stage-4');

        }, 3000)
      );


      /* ==============================================================
         ABSOLUTE FAILSAFE — 5000ms

         This is NOT the normal ending.
         It only prevents the site from ever being blocked.
         ============================================================= */

      timers.push(
        window.setTimeout(function () {

          if (done) return;

          finishIntro();

        }, 5000)
      );


    } catch (err) {

      html.classList.remove('egac-intro-lock');
      html.classList.add('egac-intro-ran');

      if (root) {
        root.style.display = 'none';
      }

      settle();
    }


    /* ================================================================
       FINISH INTRO
       ================================================================ */

    function finishIntro() {

      if (done) return;

      html.classList.remove('egac-intro-lock');
      html.classList.add('egac-intro-ran');

      /*
       * Hide the intro immediately.
       */
      root.classList.add('is-hidden');

      /*
       * Remove it from rendering shortly after.
       * This is intentionally very short.
       */
      window.setTimeout(function () {

        if (root) {
          root.style.display = 'none';
        }

      }, 100);

      settle();
    }
  }


  /* ==========================================================================
     WAIT FOR THE REAL CSS TRANSFORM TO FINISH
     --------------------------------------------------------------------------
     This is the important part.

     Instead of saying:
       "wait 1000ms"

     we say:
       "wait until the actual transform transition ends."

     This keeps JS and CSS perfectly synchronized.
     ========================================================================== */

  function waitForLogoTransition(logoWrap, callback) {

    var called = false;

    function finish() {

      if (called) return;

      called = true;

      logoWrap.removeEventListener(
        'transitionend',
        onTransitionEnd
      );

      callback();
    }

    function onTransitionEnd(event) {

      /*
       * Ignore transitions belonging to child elements.
       */
      if (event.target !== logoWrap) {
        return;
      }

      /*
       * We only care about the logo's transform.
       */
      if (
        event.propertyName !== 'transform' &&
        event.propertyName !== '-webkit-transform'
      ) {
        return;
      }

      finish();
    }

    logoWrap.addEventListener(
      'transitionend',
      onTransitionEnd
    );

    /*
     * Fallback in case the browser does not fire transitionend.
     *
     * This does NOT control the normal timing.
     * It only prevents the intro from getting stuck.
     */
    window.setTimeout(function () {

      finish();

    }, 1800);
  }


  /* ==========================================================================
     CALCULATE LOGO HANDOFF
     ========================================================================== */

  function applyHandoffTransform(logoWrap) {

    try {

      var introImg =
        logoWrap.querySelector('img');

      var navImg =
        document.querySelector('.brand__logo--light') ||
        document.querySelector('.brand__logo');

      if (!introImg || !navImg) {
        return;
      }


      /* ================================================================
         CURRENT INTRO LOGO
         ================================================================ */

      var introRect =
        introImg.getBoundingClientRect();


      /* ================================================================
         CURRENT NAVBAR LOGO
         ================================================================ */

      var navRect =
        navImg.getBoundingClientRect();


      /* ================================================================
         VALIDATE
         ================================================================ */

      if (
        !introRect.width ||
        !introRect.height ||
        !navRect.width ||
        !navRect.height
      ) {
        return;
      }


      /* ================================================================
         SCALE
         ================================================================ */

      var scale =
        navRect.height /
        introRect.height;


      /* ================================================================
         INTRO CENTER
         ================================================================ */

      var introCenterX =
        introRect.left +
        introRect.width / 2;

      var introCenterY =
        introRect.top +
        introRect.height / 2;


      /* ================================================================
         NAVBAR CENTER
         ================================================================ */

      var navCenterX =
        navRect.left +
        navRect.width / 2;

      var navCenterY =
        navRect.top +
        navRect.height / 2;


      /* ================================================================
         TRAVEL DISTANCE
         ================================================================ */

      var dx =
        navCenterX -
        introCenterX;

      var dy =
        navCenterY -
        introCenterY;


      /* ================================================================
         SEND VALUES TO CSS
         ================================================================ */

      logoWrap.style.setProperty(
        '--tx',
        dx.toFixed(2) + 'px'
      );

      logoWrap.style.setProperty(
        '--ty',
        dy.toFixed(2) + 'px'
      );

      logoWrap.style.setProperty(
        '--ts',
        scale.toFixed(4)
      );

    } catch (e) {

      /*
       * Safe fallback.
       */

    }
  }


  /* ==========================================================================
     PUBLIC API
     ========================================================================== */

  return {
    run: run
  };

})();