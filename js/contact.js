/* ============================================================================
   EGAC CONSTRUCTION — INQUIRY MODAL + CLIENT REQUEST FORM
   ----------------------------------------------------------------------------
   The modal markup is built here (once) and injected into every page, so the
   form can never drift between index.html and the project pages.

   BACKEND: configured in js/siteConfig.js

       contactEndpoint: 'api/submit.php'   → validates + stores in MySQL
       contactEndpoint: ''                 → demo mode, nothing is sent

   The handler answers with JSON { ok: true } on success and a 4xx/5xx status
   on failure. Nothing here ever claims success unless the server confirmed it.
   ========================================================================== */

window.Contact = (function () {
  'use strict';

  var modal, panel, form, wrap, success, error, submitBtn, note;
  var serviceSelect, typeSelect, errorText;
  var lastFocus = null;
  var sending = false;
  var openedAt = 0;

  function t(key) { return window.I18N.t(key); }
  function pick(v) { return window.I18N.pick(v); }

  /* ----------------------------------------------------------- the markup */
  function template() {
    var C = window.SITE_CONFIG;
    return '' +
    '<div class="modal__backdrop" data-close-modal></div>' +
    '<div class="modal__panel">' +
      '<button class="modal__close" type="button" data-close-modal data-i18n-aria="form.close" aria-label="Close"></button>' +

      '<div id="formWrap">' +
        '<h2 class="modal__title" id="inquiryTitle" data-i18n="form.title">Let\u2019s talk</h2>' +
        '<p class="modal__sub" data-i18n="form.sub">Tell us about the project. We reply within one working day.</p>' +

        '<form class="form" id="inquiryForm" novalidate>' +

          /* honeypot — hidden from people, irresistible to bots */
          '<div class="field field--trap" aria-hidden="true">' +
            '<label for="f-website">Website</label>' +
            '<input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">' +
          '</div>' +
          '<input type="hidden" name="form_time" id="f-time" value="">' +

          field('name', 'text', 'form.name', true, 'name') +
          field('company', 'text', 'form.company', true, 'organization') +
          field('phone', 'tel', 'form.phone', true, 'tel') +
          field('email', 'email', 'form.email', true, 'email') +

          '<div class="field">' +
            '<label for="f-service"><span data-i18n="form.service">Service required</span> <span class="req">*</span></label>' +
            '<select id="f-service" name="service" required aria-describedby="e-service"></select>' +
            '<span class="field__error" id="e-service"></span>' +
          '</div>' +

          '<div class="field">' +
            '<label for="f-type"><span data-i18n="form.type">Project type</span> <span class="req">*</span></label>' +
            '<select id="f-type" name="projectType" required aria-describedby="e-type"></select>' +
            '<span class="field__error" id="e-type"></span>' +
          '</div>' +

          field('location', 'text', 'form.location', true) +
          field('area', 'text', 'form.area', false) +

          '<div class="field field--full">' +
            '<label for="f-message"><span data-i18n="form.message">Project details</span> <span class="req">*</span></label>' +
            '<textarea id="f-message" name="message" required aria-describedby="e-message"></textarea>' +
            '<span class="field__error" id="e-message"></span>' +
          '</div>' +

          '<div class="field field--full field--file">' +
            '<label for="f-files" data-i18n="form.files">Attach project files</label>' +
            '<input id="f-files" name="files[]" type="file" multiple aria-describedby="e-files">' +
            '<span class="field__hint">' +
              '<span data-i18n="form.filesHint">Drawings, BOQ or references \u2014 optional</span>' +
              ' (' + C.uploadMaxFiles + ' \u00d7 ' + C.uploadMaxMB + 'MB max)' +
            '</span>' +
            '<span class="field__error" id="e-files"></span>' +
          '</div>' +

          '<div class="form__foot">' +
            '<p class="form__note" id="formNote"></p>' +
            '<button class="btn submit" id="submitBtn" type="submit">' +
              '<span class="submit__idle" data-i18n="form.submit">Send inquiry</span>' +
              '<span class="submit__busy" data-i18n="form.sending">Sending\u2026</span>' +
              '<svg class="btn__arrow" viewBox="0 0 26 10" width="26" height="10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="M0 5h25.2"/><path d="M21.4 1.2 25.2 5l-3.8 3.8"/></svg>' +
              '<i class="spinner" aria-hidden="true"></i>' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +

      '<div class="form-state" id="formSuccess" role="status">' +
        '<div class="check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5"/></svg></div>' +
        '<h2 class="form-state__title" data-i18n="form.successTitle">Thank you</h2>' +
        '<p class="form-state__text" data-i18n="form.successText">Your request has been submitted successfully. Our team will contact you shortly.</p>' +
        '<div class="form-state__actions">' +
          '<button class="btn" type="button" data-close-modal><span data-i18n="form.successBtn">Close</span><svg class="btn__arrow" viewBox="0 0 26 10" width="26" height="10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="M0 5h25.2"/><path d="M21.4 1.2 25.2 5l-3.8 3.8"/></svg></button>' +
        '</div>' +
      '</div>' +

      '<div class="form-state" id="formError" role="alert">' +
        '<h2 class="form-state__title" data-i18n="form.errorTitle">The request was not sent</h2>' +
        '<p class="form-state__text" id="formErrorText" data-i18n="form.errorText">Something blocked the request. Try again, or reach us on WhatsApp.</p>' +
        '<div class="form-state__actions">' +
          '<button class="btn" type="button" id="retryBtn"><span data-i18n="form.retry">Try again</span><svg class="btn__arrow" viewBox="0 0 26 10" width="26" height="10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="M0 5h25.2"/><path d="M21.4 1.2 25.2 5l-3.8 3.8"/></svg></button>' +
          '<a class="btn btn--ghost" href="#" data-whatsapp-link target="_blank" rel="noopener">' +
            '<span data-i18n="float.whatsapp">Chat on WhatsApp</span><svg class="btn__arrow" viewBox="0 0 26 10" width="26" height="10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="M0 5h25.2"/><path d="M21.4 1.2 25.2 5l-3.8 3.8"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function field(id, type, key, required, autocomplete) {
    return '' +
      '<div class="field">' +
        '<label for="f-' + id + '">' +
          '<span data-i18n="' + key + '"></span>' +
          (required ? ' <span class="req">*</span>' : '') +
        '</label>' +
        '<input id="f-' + id + '" name="' + id + '" type="' + type + '"' +
          (autocomplete ? ' autocomplete="' + autocomplete + '"' : '') +
          (type === 'tel' ? ' inputmode="tel"' : '') +
          (required ? ' required' : '') +
          ' aria-describedby="e-' + id + '">' +
        '<span class="field__error" id="e-' + id + '"></span>' +
      '</div>';
  }

  function build() {
    modal = document.getElementById('inquiryModal');
    if (modal) return;                       /* already in the page */
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'inquiryModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'inquiryTitle');
    modal.hidden = true;
    modal.innerHTML = template();
    document.body.appendChild(modal);
  }

  /* ------------------------------------------------------------ open/close */
  function open(preselect) {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    window.requestAnimationFrame(function () { modal.classList.add('is-open'); });
    document.body.classList.add('is-locked');
    document.documentElement.classList.add('has-overlay');
    resetToForm();

    openedAt = Date.now();
    var stamp = document.getElementById('f-time');
    if (stamp) stamp.value = String(openedAt);

    if (preselect && serviceSelect) serviceSelect.value = preselect;
    window.setTimeout(function () {
      var first = form.querySelector('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea');
      if (first) first.focus();
    }, 260);
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    document.documentElement.classList.remove('has-overlay');
    window.setTimeout(function () { modal.hidden = true; }, 420);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function resetToForm() {
    wrap.style.display = '';
    success.classList.remove('is-visible');
    error.classList.remove('is-visible');
    setBusy(false);
  }

  function showState(which) {
    wrap.style.display = 'none';
    success.classList.toggle('is-visible', which === 'success');
    error.classList.toggle('is-visible', which === 'error');
    panel.scrollTop = 0;
  }

  function setBusy(state) {
    sending = state;
    submitBtn.classList.toggle('is-loading', state);
    submitBtn.disabled = state;                      /* no double submits */
    submitBtn.setAttribute('aria-busy', state ? 'true' : 'false');
  }

  /* ------------------------------------------------------------ validation */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var PHONE = /^[+()\-\s.\d]{7,22}$/;

  function setError(field, message) {
    var holder = field.closest('.field');
    var box = holder.querySelector('.field__error');
    holder.classList.toggle('has-error', !!message);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (box) box.textContent = message || '';
  }

  function validateField(field) {
    /* trim as we validate, so " " never counts as an answer */
    if (field.type !== 'file' && typeof field.value === 'string') {
      var trimmed = field.value.replace(/^\s+|\s+$/g, '');
      if (trimmed !== field.value && document.activeElement !== field) field.value = trimmed;
    }
    var value = (field.value || '').trim();

    if (field.hasAttribute('required') && !value) {
      setError(field, t('form.required'));
      return false;
    }
    if (field.type === 'email' && value && !EMAIL.test(value)) {
      setError(field, t('form.emailInvalid'));
      return false;
    }
    if (field.type === 'tel' && value && (!PHONE.test(value) || value.replace(/\D/g, '').length < 7)) {
      setError(field, t('form.phoneInvalid'));
      return false;
    }
    if (field.tagName === 'TEXTAREA' && value && value.length < 10) {
      setError(field, t('form.messageShort'));
      return false;
    }
    setError(field, '');
    return true;
  }

  function validateFiles() {
    var input = document.getElementById('f-files');
    if (!input || !input.files || !input.files.length) return true;
    var C = window.SITE_CONFIG;

    if (input.files.length > C.uploadMaxFiles) {
      setError(input, t('form.filesTooMany').replace('{n}', C.uploadMaxFiles));
      return false;
    }
    for (var i = 0; i < input.files.length; i++) {
      if (input.files[i].size > C.uploadMaxMB * 1024 * 1024) {
        setError(input, t('form.filesTooBig').replace('{n}', C.uploadMaxMB));
        return false;
      }
    }
    setError(input, '');
    return true;
  }

  function validateForm() {
    var fields = form.querySelectorAll(
      'input[required], select[required], textarea[required], input[type="email"], input[type="tel"]');
    var ok = true, firstBad = null;
    Array.prototype.forEach.call(fields, function (field) {
      if (!validateField(field)) {
        ok = false;
        if (!firstBad) firstBad = field;
      }
    });
    if (!validateFiles()) {
      ok = false;
      if (!firstBad) firstBad = document.getElementById('f-files');
    }
    if (firstBad) firstBad.focus();
    return ok;
  }

  /* --------------------------------------------------------------- sending */
  function send(data) {
    var endpoint = window.SITE_CONFIG.contactEndpoint;

    if (!endpoint) {
      /* DEMO MODE — no endpoint configured, nothing leaves the browser */
      var preview = {};
      data.forEach(function (value, key) {
        preview[key] = (value && value.name) ? value.name : value;
      });
      /* eslint-disable-next-line no-console */
      console.info('[EGAC] Inquiry captured (demo mode, not sent anywhere):', preview);
      return new Promise(function (resolve) { window.setTimeout(resolve, 900); });
    }

    return fetch(window.assetPath(endpoint), {
      method: window.SITE_CONFIG.contactMethod || 'POST',
      body: data,
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || body.ok === false) {
          var err = new Error(body.message || ('Request failed: ' + res.status));
          err.payload = body;
          err.status = res.status;
          throw err;
        }
        return body;
      });
    });
  }

  /** Paint server-side field errors back onto the form. */
  function applyServerErrors(payload) {
    if (!payload || !payload.fields) return false;
    var shown = false;
    Object.keys(payload.fields).forEach(function (key) {
      var input = form.querySelector('[name="' + key + '"]');
      if (!input) return;
      setError(input, payload.fields[key] || t('form.required'));
      shown = true;
    });
    return shown;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    if (!validateForm()) return;

    setBusy(true);
    var data = new FormData(form);
    data.append('language', window.I18N.lang);
    data.append('page', window.location.href);
    data.set('form_time', String(openedAt));

    send(data)
      .then(function () {
        form.reset();                       /* only after the server confirms */
        showState('success');
      })
      .catch(function (err) {
        /* eslint-disable-next-line no-console */
        console.error('[EGAC] Inquiry failed:', err);

        if (err.payload && applyServerErrors(err.payload)) {
          setBusy(false);
          var firstBad = form.querySelector('.field.has-error input, .field.has-error select, .field.has-error textarea');
          if (firstBad) firstBad.focus();
          return;
        }
        if (errorText) {
          errorText.textContent = (err.payload && err.payload.message) || t('form.errorText');
        }
        showState('error');
      })
      .then(function () { setBusy(false); });
  }

  /* --------------------------------------------------------- select filling */
  function fillSelect(select, options, placeholderKey) {
    if (!select) return;
    var current = select.value;
    select.innerHTML = '';

    var placeholder = new Option(t(placeholderKey), '');
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    options.forEach(function (opt) {
      select.appendChild(new Option(opt.label, opt.id));
    });
    if (current) select.value = current;
  }

  function fillSelects() {
    /* Services come from the site's own solutions list — nothing invented. */
    var services = window.SITE_DATA.solutions.map(function (s) {
      return { id: s.id, label: pick(s.name) };
    });
    services.push({ id: 'other', label: t('form.typeOther') });
    fillSelect(serviceSelect, services, 'form.serviceChoose');

    var types = (window.SITE_CONFIG.projectTypes || []).map(function (p) {
      return { id: p.id, label: pick(p.label) };
    });
    fillSelect(typeSelect, types, 'form.typeChoose');
  }

  function init() {
    build();
    if (!modal) return;

    panel = modal.querySelector('.modal__panel');
    form = document.getElementById('inquiryForm');
    wrap = document.getElementById('formWrap');
    success = document.getElementById('formSuccess');
    error = document.getElementById('formError');
    errorText = document.getElementById('formErrorText');
    submitBtn = document.getElementById('submitBtn');
    note = document.getElementById('formNote');
    serviceSelect = document.getElementById('f-service');
    typeSelect = document.getElementById('f-type');

    fillSelects();
    if (note && !window.SITE_CONFIG.contactEndpoint) note.textContent = t('form.demoNote');

    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-open-inquiry]');
      if (opener) {
        e.preventDefault();
        open(opener.getAttribute('data-solution'));
        return;
      }
      if (e.target.closest('[data-close-modal]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key !== 'Tab') return;

      /* focus trap */
      var focusables = panel.querySelectorAll('a[href], button:not([disabled]), input:not([tabindex="-1"]), select, textarea');
      var list = Array.prototype.filter.call(focusables, function (el) { return el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    form.addEventListener('submit', onSubmit);
    form.addEventListener('blur', function (e) {
      if (e.target.matches('input:not([type="hidden"]), select, textarea')) validateField(e.target);
    }, true);
    form.addEventListener('input', function (e) {
      if (e.target.closest('.field.has-error')) {
        if (e.target.type === 'file') validateFiles();
        else validateField(e.target);
      }
    });
    form.addEventListener('change', function (e) {
      if (e.target.type === 'file') validateFiles();
    });

    var retry = document.getElementById('retryBtn');
    if (retry) retry.addEventListener('click', resetToForm);

    window.I18N.apply();

    window.addEventListener('languagechange', function () {
      fillSelects();
      window.I18N.apply();
      if (note && !window.SITE_CONFIG.contactEndpoint) note.textContent = t('form.demoNote');
      form.querySelectorAll('.field.has-error input, .field.has-error select, .field.has-error textarea')
        .forEach(validateField);
    });
  }

  return { init: init, open: open, close: close };
})();
