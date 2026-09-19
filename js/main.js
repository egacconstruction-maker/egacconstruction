/* ============================================================================
   EGAC CONSTRUCTION — BOOT
   Renders everything that comes from siteConfig.js / data.js, then starts the
   modules. Re-renders on a language change.
   ========================================================================== */

/* Pages inside /pages/ carry data-root="../" so every asset path resolves. */
window.assetPath = function (path) {
  var root = (document.body && document.body.dataset.root) || '';
  if (/^(https?:|\/\/|\/|data:|#)/.test(path)) return path;
  return root + path;
};

window.homeLink = function (hash) {
  var root = (document.body && document.body.dataset.root) || '';
  return root ? root + 'index.html' + hash : hash;
};

(function () {
  'use strict';

  var C = window.SITE_CONFIG;
  var D = window.SITE_DATA;
  var pick = function (v) { return window.I18N.pick(v); };
  var t = function (k) { return window.I18N.t(k); };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pad(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }

  /* --------------------------------------------------------------- chrome */
  function renderChrome() {
    /* official logo files — white for dark surfaces, navy for light ones */
    document.querySelectorAll('[data-logo]').forEach(function (n) {
      var file = n.getAttribute('data-logo') === 'navy' ? C.logoNavy : C.logoWhite;
      if (file) n.setAttribute('src', window.assetPath(file));
      n.setAttribute('alt', '');            /* the link carries the label */
    });

    document.querySelectorAll('[data-brand-name]').forEach(function (n) { n.textContent = pick(C.name); });
    document.querySelectorAll('[data-brand-sub]').forEach(function (n) { n.textContent = pick(C.descriptor); });
    document.querySelectorAll('[data-address]').forEach(function (n) { n.textContent = pick(C.address); });
    document.querySelectorAll('[data-hours]').forEach(function (n) { n.textContent = pick(C.hours); });
    document.querySelectorAll('[data-founded]').forEach(function (n) { n.textContent = C.founded; });

    document.querySelectorAll('[data-phone-link]').forEach(function (n) {
      n.setAttribute('href', 'tel:' + C.phoneRaw);
      n.textContent = C.phone;
    });
    document.querySelectorAll('[data-email-link]').forEach(function (n) {
      n.setAttribute('href', 'mailto:' + C.email);
      n.textContent = C.email;
    });
    document.querySelectorAll('[data-whatsapp-link]').forEach(function (n) {
      n.setAttribute('href', 'https://wa.me/' + C.whatsapp +
        '?text=' + encodeURIComponent(C.whatsappMessage));
    });

    var social = document.getElementById('footerSocial');
    if (social) {
      social.innerHTML = '';
      C.social.forEach(function (item) {
        /* No invented profile URLs: an entry without a link is not shown. */
        if (!item.url) return;
        var li = el('li');
        var a = el('a', null, item.label);
        a.href = item.url;
        if (/^https?:/.test(item.url)) { a.target = '_blank'; a.rel = 'noopener'; }
        li.appendChild(a);
        social.appendChild(li);
      });
      if (!social.children.length) {
        var col = social.closest('.footer__col');
        if (col) col.hidden = true;
      }
    }

    var footerSolutions = document.getElementById('footerSolutions');
    if (footerSolutions) {
      footerSolutions.innerHTML = '';
      D.solutions.forEach(function (s) {
        var li = el('li');
        var a = el('a', null, pick(s.name));
        a.href = window.homeLink('#solutions');
        li.appendChild(a);
        footerSolutions.appendChild(li);
      });
    }
  }

  /* ----------------------------------------------------------- statistics */
  /** Years-of-experience stays accurate on its own when fromFounded is set. */
  function statValue(stat) {
    if (stat.fromFounded && C.founded) {
      return Math.max(0, new Date().getFullYear() - C.founded);
    }
    return stat.value;
  }

  function counter(stat, valueClass) {
    var b = el('b', valueClass, '0');
    b.setAttribute('data-count', statValue(stat));
    b.setAttribute('data-suffix', stat.suffix);
    return b;
  }

  function renderStats() {
    var hero = document.getElementById('heroStats');
    if (hero) {
      hero.innerHTML = '';
      [C.stats[0], C.stats[1], C.stats[3]].forEach(function (stat) {
        var box = el('div', 'hero__stat');
        box.appendChild(counter(stat, ''));
        box.appendChild(el('span', null, pick(stat.label)));
        hero.appendChild(box);
      });
    }

    var grid = document.getElementById('statsGrid');
    if (grid) {
      grid.innerHTML = '';
      C.stats.forEach(function (stat) {
        var cell = el('div', 'stat');
        var value = el('div', 'stat__value', '0');
        value.setAttribute('data-count', statValue(stat));
        value.setAttribute('data-suffix', stat.suffix);
        cell.appendChild(value);
        cell.appendChild(el('div', 'stat__label', pick(stat.label)));
        grid.appendChild(cell);
      });
    }

    var strength = document.getElementById('strengthGrid');
    if (strength) {
      strength.innerHTML = '';
      C.stats.forEach(function (stat) {
        var cell = el('div', 'strength__cell');
        var value = el('div', 'strength__value', '0');
        value.setAttribute('data-count', statValue(stat));
        value.setAttribute('data-suffix', stat.suffix);
        cell.appendChild(value);
        cell.appendChild(el('div', 'strength__label', pick(stat.label)));
        strength.appendChild(cell);
      });
      strength.setAttribute('data-stagger', '');
    }
  }

  /* ------------------------------------------------------------ solutions */
  function renderSolutions() {
    var mega = document.getElementById('megaGrid');
    if (mega) {
      mega.innerHTML = '';
      D.solutions.forEach(function (s, i) {
        var a = el('a', 'mega__item');
        a.href = window.homeLink('#solutions');
        var name = el('span', 'mega__name');
        name.appendChild(el('i', 'mega__num', pad(i)));
        name.appendChild(el('span', null, pick(s.name)));
        a.appendChild(name);
        a.appendChild(el('span', 'mega__desc', pick(s.short)));
        mega.appendChild(a);
      });
    }

    var list = document.getElementById('solutionsList');
    var media = document.getElementById('solutionsMedia');
    if (!list || !media) return;

    list.innerHTML = '';
    media.innerHTML = '';
    var section = document.querySelector('.solutions');

    D.solutions.forEach(function (s, i) {
      var img = el('img');
      img.src = window.assetPath(s.image);
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);

      var row = el('button', 'solution');
      row.type = 'button';
      row.setAttribute('data-open-inquiry', '');
      row.setAttribute('data-solution', s.id);
      row.setAttribute('aria-label', pick(s.name) + ' — ' + t('solutions.view'));

      var thumb = el('span', 'solution__thumb');
      var thumbImg = el('img');
      thumbImg.src = window.assetPath(s.image);
      thumbImg.alt = pick(s.name);
      thumbImg.loading = 'lazy';
      thumb.appendChild(thumbImg);

      row.appendChild(el('span', 'solution__num', pad(i)));
      row.appendChild(el('span', 'solution__name', pick(s.name)));
      row.appendChild(el('span', 'solution__desc', pick(s.short)));
      row.appendChild(el('span', 'solution__go'));
      row.appendChild(thumb);

      function activate() {
        if (window.matchMedia('(max-width: 900px)').matches) return;
        section.classList.add('is-active');
        list.querySelectorAll('.solution').forEach(function (r) { r.classList.remove('is-hovered'); });
        row.classList.add('is-hovered');
        media.querySelectorAll('img').forEach(function (im, k) {
          im.classList.toggle('is-active', k === i);
        });
      }

      row.addEventListener('mouseenter', activate);
      row.addEventListener('focus', activate);
      list.appendChild(row);
    });

    function deactivate() {
      section.classList.remove('is-active');
      list.querySelectorAll('.solution').forEach(function (r) { r.classList.remove('is-hovered'); });
      media.querySelectorAll('img').forEach(function (im) { im.classList.remove('is-active'); });
    }
    section.addEventListener('mouseleave', deactivate);
    list.addEventListener('focusout', function (e) {
      if (!list.contains(e.relatedTarget)) deactivate();
    });
  }

  /* ------------------------------------------------------------ materials */
  function renderMaterials() {
    var strip = document.getElementById('materialsStrip');
    if (!strip) return;
    strip.innerHTML = '';

    D.materials.forEach(function (m) {
      var item = el('button', 'material');
      item.type = 'button';
      item.setAttribute('data-open-inquiry', '');
      item.setAttribute('aria-label', pick(m.name) + ' — ' + t('solutions.view'));

      var img = el('img');
      img.src = window.assetPath(m.image);
      img.alt = pick(m.name) + ' finish sample';
      img.loading = 'lazy';
      img.decoding = 'async';

      var body = el('div', 'material__body');
      body.appendChild(el('span', 'material__name', pick(m.name)));
      body.appendChild(el('span', 'material__note', pick(m.note)));
      body.appendChild(el('span', 'material__spec', pick(m.spec)));

      item.appendChild(img);
      item.appendChild(body);
      strip.appendChild(item);
    });
  }

  /* ------------------------------------------------------------ why / ads */
  function renderWhy() {
    var list = document.getElementById('whyList');
    if (!list) return;
    list.innerHTML = '';

    D.advantages.forEach(function (a, i) {
      var item = el('article', 'why__item');
      item.setAttribute('data-reveal', '');
      item.appendChild(el('span', 'why__num', pad(i)));
      item.appendChild(el('h3', 'why__title', pick(a.title)));
      item.appendChild(el('p', 'why__text', pick(a.text)));
      list.appendChild(item);
    });
  }

  function renderAdvertising() {
    var grid = document.getElementById('advertisingGrid');
    if (!grid) return;
    grid.innerHTML = '';

    D.advertising.forEach(function (a) {
      var item = el('article', 'ad-item');
      var img = el('img');
      img.src = window.assetPath(a.image);
      img.alt = pick(a.title);
      img.loading = 'lazy';
      img.decoding = 'async';
      var body = el('div', 'ad-item__body');
      body.appendChild(el('h3', 'ad-item__title', pick(a.title)));
      body.appendChild(el('p', 'ad-item__text', pick(a.text)));
      item.appendChild(img);
      item.appendChild(body);
      grid.appendChild(item);
    });
  }

  function renderClients() {
    var grid = document.getElementById('clientsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    D.clients.forEach(function (src, i) {
      var cell = el('div', 'client');
      var img = el('img');
      img.src = window.assetPath(src);
      img.alt = 'Client logo placeholder ' + pad(i);
      img.loading = 'lazy';
      cell.appendChild(img);
      grid.appendChild(cell);
    });
  }

  function renderAll() {
    renderChrome();
    renderStats();
    renderSolutions();
    renderMaterials();
    renderWhy();
    renderAdvertising();
    renderClients();
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    renderAll();
    window.I18N.apply();

    if (window.Theme) window.Theme.init();
    if (window.Nav) window.Nav.init();
    if (window.Projects) window.Projects.init();
    if (window.Lightbox) window.Lightbox.init();
    if (window.Contact) window.Contact.init();
    if (window.ProjectPage) window.ProjectPage.init();
    if (window.Animations) window.Animations.init();

    window.addEventListener('languagechange', function () {
      renderAll();
      window.I18N.apply();
      if (window.Animations) window.Animations.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
