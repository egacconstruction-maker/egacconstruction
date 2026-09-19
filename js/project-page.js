/* ============================================================================
   EGAC CONSTRUCTION — PROJECT DETAIL PAGE
   ----------------------------------------------------------------------------
   Reads ?project=<id>, renders the record from js/projects.js into a vertical
   editorial layout and wires every image into the lightbox.

   Rules it follows:
   · a field left empty in the data is not rendered at all (no "Year —")
   · an image file that does not exist is removed, not shown broken
   · project-video.mp4 appears only when the project actually has one
   ========================================================================== */

window.ProjectPage = (function () {
  'use strict';

  var project = null;

  /* The same inline arrow the rest of the site uses. */
  var ARROW = '<svg class="btn__arrow" viewBox="0 0 26 10" width="26" height="10" fill="none" ' +
    'stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" ' +
    'aria-hidden="true" focusable="false">' +
    '<path d="M0 5h25.2"/><path d="M21.4 1.2 25.2 5l-3.8 3.8"/></svg>';

  function pick(v) { return window.I18N.pick(v); }
  function t(k) { return window.I18N.t(k); }
  function value(v) { return window.Projects.value(v); }

  function currentId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('project');
  }

  function name(p) { return window.Projects.name(p); }

  /* ------------------------------------------------------------- helpers */
  function setText(id, val) {
    var node = document.getElementById(id);
    if (node) node.textContent = val;
  }

  /** Show the block only when it has content; otherwise take it out. */
  function fill(blockId, textId, val) {
    var block = document.getElementById(blockId);
    if (!block) return;
    if (!val) { block.remove(); return; }
    block.hidden = false;
    setText(textId, val);
  }

  function renderMissing() {
    var main = document.getElementById('main');
    main.innerHTML =
      '<section class="error-page"><div class="container">' +
        '<p class="error-page__code">404</p>' +
        '<h1 class="error-page__title"></h1>' +
        '<p class="error-page__text"></p>' +
        '<a class="btn" href="../index.html#projects"><span></span>' + ARROW + '</a>' +
      '</div></section>';
    main.querySelector('.error-page__title').textContent = t('project.missing');
    main.querySelector('.error-page__text').textContent = t('e404.text');
    main.querySelector('.btn span').textContent = t('project.back');
  }

  /* --------------------------------------------------------------- facts */
  function renderFacts() {
    var list = document.getElementById('pFacts');
    if (!list) return;
    list.innerHTML = '';

    var facts = [
      { label: t('project.location'), value: value(project.location) },
      { label: t('project.year'),     value: value(project.year) },
      { label: t('project.scope'),    value: value(project.scope) }
    ].filter(function (f) { return !!f.value; });

    if (!facts.length) { list.hidden = true; return; }
    list.hidden = false;
    list.style.setProperty('--fact-count', facts.length);

    facts.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'fact';
      var dt = document.createElement('dt');
      dt.textContent = f.label;
      var dd = document.createElement('dd');
      dd.textContent = f.value;
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      list.appendChild(wrap);
    });
  }

  /* ----------------------------------------------------------- materials */
  function renderMaterials() {
    var block = document.getElementById('pSystemsBlock');
    var list = document.getElementById('pSystems');
    if (!block || !list) return;

    var items = (project.materials || []).map(pick).filter(Boolean);
    if (!items.length) { block.remove(); return; }

    block.hidden = false;
    list.innerHTML = '';
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
  }

  /* ------------------------------------------------------------ hero image */
  function renderHero() {
    var figure = document.getElementById('pHeroFigure');
    var hero = document.getElementById('pHero');
    if (!figure || !hero) return;

    if (!project.cover) { figure.remove(); return; }
    hero.src = window.assetPath(project.cover);
    hero.alt = name(project);
    hero.addEventListener('error', function () { figure.remove(); });
  }

  /* --------------------------------------------------------------- gallery
     Large images stacked vertically. Each one opens the lightbox; any file
     that fails to load removes itself from the page and from the gallery.
     ---------------------------------------------------------------------- */
  function renderGallery() {
    var section = document.getElementById('pGallerySection');
    var gallery = document.getElementById('pGallery');
    if (!gallery || !section) return;
    gallery.innerHTML = '';

    var sources = (project.gallery || []).filter(Boolean);
    if (!sources.length) { section.remove(); return; }

    var remaining = sources.length;

    sources.forEach(function (src, i) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'gallery__item';
      item.setAttribute('data-gallery-item', '');
      item.setAttribute('data-reveal', 'image');
      item.setAttribute('data-cursor', 'view');
      item.setAttribute('data-cursor-label', t('light.counter'));
      item.setAttribute('aria-label', name(project) + ' — ' + t('light.counter') + ' ' + (i + 1));

      var img = document.createElement('img');
      img.src = window.assetPath(src);
      img.alt = name(project) + ' — ' + t('light.counter') + ' ' + (i + 1);
      img.loading = i < 2 ? 'eager' : 'lazy';
      img.decoding = 'async';

      img.addEventListener('error', function () {
        item.remove();
        remaining -= 1;
        if (remaining <= 0 && section.parentNode) section.remove();
      });

      item.appendChild(img);
      gallery.appendChild(item);
    });

    if (window.Lightbox) window.Lightbox.attach(gallery);
  }

  /* ----------------------------------------------------------------- video */
  function renderVideo() {
    var section = document.getElementById('pVideoSection');
    if (!section) return;
    if (!project.video) { section.remove(); return; }

    var video = document.getElementById('pVideo');
    var shell = section.querySelector('.project-video');
    if (shell) shell.setAttribute('data-reveal', 'image');
    video.src = window.assetPath(project.video);
    video.addEventListener('error', function () { section.remove(); });
    section.hidden = false;
  }

  /* --------------------------------------------------------- previous/next */
  function renderPager() {
    var all = window.SITE_DATA.projects;
    var idx = all.indexOf(project);

    var prev = all[(idx - 1 + all.length) % all.length];
    var next = all[(idx + 1) % all.length];

    var prevLink = document.getElementById('pPrev');
    var nextLink = document.getElementById('pNext');
    var pager = document.querySelector('.next-project');

    if (all.length < 2) { if (pager) pager.remove(); return; }
    if (pager) pager.setAttribute('data-reveal', '');

    if (prevLink) {
      prevLink.href = 'project.html?project=' + encodeURIComponent(prev.id);
      setText('pPrevName', name(prev));
    }
    if (nextLink) {
      nextLink.href = 'project.html?project=' + encodeURIComponent(next.id);
      setText('pNextName', name(next));
    }
  }

  /** A section whose blocks were all removed should not leave a gap behind. */
  function tidy() {
    var body = document.querySelector('.project-body');
    if (body && !body.children.length) {
      var section = body.closest('section');
      if (section) section.remove();
    }
  }

  function render() {
    if (!project) { renderMissing(); return; }

    document.title = name(project) + ' | ' + pick(window.SITE_CONFIG.name);
    var desc = document.querySelector('meta[name="description"]');
    if (desc && value(project.description)) {
      desc.setAttribute('content', value(project.description).slice(0, 180));
    }

    setText('pTitle', name(project));
    renderFacts();
    renderHero();
    fill('pAboutBlock', 'pAbout', value(project.description));
    renderMaterials();
    renderGallery();
    renderVideo();
    renderPager();
    tidy();

    /* Everything above was created after Animations.init ran, so the shared
       observer needs to be told about the new nodes. */
    if (window.Animations) window.Animations.refresh();
  }

  function init() {
    if (!document.getElementById('pTitle')) return;
    var id = currentId();
    project = window.SITE_DATA.projects.filter(function (p) {
      return p.id === id || p.slug === id;
    })[0] || null;

    render();

    window.addEventListener('languagechange', function () {
      /* A re-render would need the removed blocks back, so reload the shell
         text only — the language switch keeps the page structure intact. */
      if (!project) { render(); return; }
      setText('pTitle', name(project));
      renderFacts();
      var about = document.getElementById('pAbout');
      if (about) about.textContent = value(project.description);
      renderMaterials();
      if (window.Animations) window.Animations.refresh();
    });
  }

  return { init: init };
})();
