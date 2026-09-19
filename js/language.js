/* ============================================================================
   EGAC CONSTRUCTION — LANGUAGE / RTL ENGINE
   ----------------------------------------------------------------------------
   Static copy is translated through data-i18n attributes:

     <h2 data-i18n="intro.title"></h2>
     <input data-i18n-placeholder="form.namePlaceholder">
     <button data-i18n-aria="nav.menuOpen">

   Dynamic copy (projects, solutions …) lives in data.js as { en, ar } pairs
   and is re-rendered whenever the `languagechange` event fires.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'egac-lang';

  var DICT = {
    en: {
      'meta.title': 'EGAC Construction | Facade & Architectural Solutions',

      'nav.about': 'About',
      'nav.solutions': 'Solutions',
      'nav.projects': 'Projects',
      'nav.materials': 'Materials',
      'nav.why': 'Why EGAC',
      'nav.contact': 'Contact',
      'nav.cta': 'Start a project',
      'nav.menuOpen': 'Open menu',
      'nav.menuClose': 'Close menu',
      'nav.home': 'Home',
      'nav.langSwitch': 'Switch language',
      'theme.toDark': 'Switch to dark mode',
      'theme.toLight': 'Switch to light mode',

      'mega.intro': 'Six connected capabilities, delivered by one team.',
      'mega.all': 'See all solutions',

      'hero.l1': 'Engineering',
      'hero.l2': 'the face of',
      'hero.l3': 'modern architecture',
      'hero.sub': 'Integrated facade and architectural solutions engineered for performance, precision and visual impact.',
      'hero.cta1': 'Explore projects',
      'hero.cta2': 'Start a project',
      'hero.scroll': 'Scroll to explore',

      'intro.kicker': 'Who we are',
      'intro.title': 'We build the face of buildings.',
      'intro.p1': 'EGAC Construction is a specialised construction and architectural solutions company delivering integrated facade systems and building solutions for commercial, residential and industrial projects.',
      'intro.p2': 'With extensive experience in facade execution and architectural materials, the company combines technical expertise, quality materials and precise project execution.',
      'intro.cta': 'Discover EGAC Construction',
      'intro.since': 'Working on facades since',

      'solutions.kicker': 'What we do',
      'solutions.title': 'Our expertise',
      'solutions.sub': 'From the substructure behind the panel to the last fixing on site.',
      'solutions.view': 'Talk to us about this',

      'projects.kicker': 'What we have built',
      'projects.title': 'Selected projects',
      'projects.sub': 'A selection of projects that reflect our capabilities, precision and commitment to quality.',
      'projects.all': 'All',
      'projects.view': 'View project',
      'projects.empty': 'No projects in this category yet. Choose another filter.',
      'projects.demo': '25 project slots are ready. Add the images and details in js/projects.js.',

      'materials.kicker': 'Our materials',
      'materials.title': 'Materials that define the building',
      'materials.sub': 'Finish families we work with. Full catalogue available on request.',

      'why.kicker': 'Why we are different',
      'why.title': 'Why EGAC Construction',

      'strength.l1': 'Built on experience.',
      'strength.l2': 'Driven by precision.',
      'strength.sub': 'Figures shown are demonstration data for this prototype.',

      'clients.title': 'Trusted by',
      'clients.note': 'Placeholder marks. Supply client logos to replace them.',

      'adv.kicker': 'Beyond the facade',
      'adv.title': 'Beyond the facade',
      'adv.text': 'Our capabilities extend beyond building envelopes, delivering advertising materials, signage and visual identity solutions that strengthen the presence of brands and spaces.',

      'cta.l1': "Let's build",
      'cta.l2': 'something distinctive.',
      'cta.text': 'Have a project in mind? Let’s discuss your requirements.',
      'cta.btn1': 'Start a project',
      'cta.btn2': 'Contact us',

      'footer.company': 'Company',
      'footer.solutions': 'Solutions',
      'footer.contact': 'Contact',
      'footer.social': 'Social',
      'footer.about': 'About us',
      'footer.projects': 'Projects',
      'footer.why': 'Why EGAC',
      'footer.contactLink': 'Contact',
      'footer.rights': '© 2026 EGAC Construction. All rights reserved.',
      'footer.demo': 'Company figures shown are demonstration data until confirmed.',
      'footer.hours': 'Working hours',

      'float.whatsapp': 'Chat on WhatsApp',
      'float.inquiry': 'Send an inquiry',

      'form.title': 'Let’s talk',
      'form.sub': 'Tell us about the project. We reply within one working day.',
      'form.name': 'Full name',
      'form.company': 'Company name',
      'form.phone': 'Phone number',
      'form.email': 'Email address',
      'form.service': 'Service required',
      'form.serviceChoose': 'Choose a service',
      'form.type': 'Project type',
      'form.typeChoose': 'Choose a project type',
      'form.typeOther': 'Other',
      'form.location': 'Project location',
      'form.area': 'Estimated project size',
      'form.areaHint': 'e.g. 4,000 sqm',
      'form.message': 'Project details',
      'form.files': 'Attach project files',
      'form.filesHint': 'Drawings, BOQ or references — optional',
      'form.submit': 'Send inquiry',
      'form.sending': 'Sending…',
      'form.close': 'Close',
      'form.required': 'This field is required.',
      'form.emailInvalid': 'Enter a valid email address.',
      'form.phoneInvalid': 'Enter a valid phone number.',
      'form.messageShort': 'Please give us a little more detail.',
      'form.filesTooMany': 'Attach no more than {n} files.',
      'form.filesTooBig': 'Each file must be under {n}MB.',
      'form.successTitle': 'Thank you',
      'form.successText': 'Your request has been submitted successfully. Our team will contact you shortly.',
      'form.successBtn': 'Close',
      'form.errorTitle': 'The request was not sent',
      'form.errorText': 'Something blocked the request. Try again, or reach us on WhatsApp.',
      'form.retry': 'Try again',
      'form.demoNote': 'Demo mode: no endpoint is configured, so nothing is sent or stored.',

      'light.close': 'Close gallery',
      'light.prev': 'Previous image',
      'light.next': 'Next image',
      'light.counter': 'Image',

      'project.back': 'All projects',
      'project.location': 'Location',
      'project.year': 'Year',
      'project.scope': 'Scope',
      'project.about': 'The project',
      'project.work': 'Our scope',
      'project.systems': 'Materials & systems',
      'project.gallery': 'Project gallery',
      'project.next': 'Next project',
      'project.prev': 'Previous project',
      'project.video': 'Project video',
      'project.cta': 'Start a project like this',
      'project.missing': 'That project could not be found.',

      'e404.title': 'Nothing here.',
      'e404.text': 'The page you’re looking for could not be found.',
      'e404.btn': 'Back to home'
    },

    ar: {
      'meta.title': 'إيجيك للمقاولات | حلول الواجهات والتشطيبات المعمارية',

      'nav.about': 'من نحن',
      'nav.solutions': 'حلولنا',
      'nav.projects': 'المشاريع',
      'nav.materials': 'الخامات',
      'nav.why': 'لماذا إيجيك',
      'nav.contact': 'تواصل معنا',
      'nav.cta': 'ابدأ مشروعك',
      'nav.menuOpen': 'فتح القائمة',
      'nav.menuClose': 'إغلاق القائمة',
      'nav.home': 'الرئيسية',
      'nav.langSwitch': 'تغيير اللغة',
      'theme.toDark': 'التبديل إلى الوضع الداكن',
      'theme.toLight': 'التبديل إلى الوضع الفاتح',

      'mega.intro': 'ست قدرات مترابطة، ينفذها فريق واحد.',
      'mega.all': 'كل الحلول',

      'hero.l1': 'نُشكّل',
      'hero.l2': 'واجهات',
      'hero.l3': 'العمارة الحديثة',
      'hero.sub': 'حلول واجهات وتشطيبات معمارية متكاملة، مهندسة للأداء والدقة والأثر البصري.',
      'hero.cta1': 'استعرض المشاريع',
      'hero.cta2': 'ابدأ مشروعك',
      'hero.scroll': 'مرّر للاستكشاف',

      'intro.kicker': 'من نحن',
      'intro.title': 'نصنع وجه المباني.',
      'intro.p1': 'إيجيك للمقاولات شركة متخصصة في المقاولات والحلول المعمارية، تقدم أنظمة واجهات متكاملة وحلول بناء للمشروعات التجارية والسكنية والصناعية.',
      'intro.p2': 'بخبرة واسعة في تنفيذ الواجهات والخامات المعمارية، تجمع الشركة بين الخبرة الفنية وجودة الخامات ودقة التنفيذ.',
      'intro.cta': 'تعرّف على إيجيك للمقاولات',
      'intro.since': 'نعمل في الواجهات منذ',

      'solutions.kicker': 'ماذا نقدم',
      'solutions.title': 'مجالات خبرتنا',
      'solutions.sub': 'من الهيكل الحامل خلف اللوح إلى آخر تثبيت في الموقع.',
      'solutions.view': 'تحدث معنا عن هذا',

      'projects.kicker': 'ماذا نفّذنا',
      'projects.title': 'مشاريع مختارة',
      'projects.sub': 'مجموعة من المشروعات تعكس قدراتنا ودقتنا والتزامنا بالجودة.',
      'projects.all': 'الكل',
      'projects.view': 'عرض المشروع',
      'projects.empty': 'لا توجد مشاريع في هذا التصنيف بعد. اختر تصنيفًا آخر.',
      'projects.demo': '٢٥ موضعًا للمشروعات جاهزة. أضف الصور والبيانات في js/projects.js.',

      'materials.kicker': 'خاماتنا',
      'materials.title': 'خامات تصنع هوية المبنى',
      'materials.sub': 'عائلات التشطيبات التي نعمل بها. الكتالوج الكامل متاح عند الطلب.',

      'why.kicker': 'ما الذي يميّزنا',
      'why.title': 'لماذا إيجيك للمقاولات',

      'strength.l1': 'خبرة راسخة.',
      'strength.l2': 'تنفيذ دقيق.',
      'strength.sub': 'الأرقام المعروضة بيانات توضيحية خاصة بهذا النموذج.',

      'clients.title': 'عملاء يثقون بنا',
      'clients.note': 'شعارات مبدئية. أرسل شعارات العملاء لاستبدالها.',

      'adv.kicker': 'أبعد من الواجهة',
      'adv.title': 'أبعد من الواجهة',
      'adv.text': 'تمتد قدراتنا إلى ما بعد أغلفة المباني، لنقدّم مواد الدعاية واللافتات وحلول الهوية البصرية التي تعزز حضور العلامات والأماكن.',

      'cta.l1': 'لنبنِ معًا',
      'cta.l2': 'شيئًا مميزًا.',
      'cta.text': 'لديك مشروع؟ لنناقش متطلباتك.',
      'cta.btn1': 'ابدأ مشروعك',
      'cta.btn2': 'تواصل معنا',

      'footer.company': 'الشركة',
      'footer.solutions': 'الحلول',
      'footer.contact': 'التواصل',
      'footer.social': 'التواصل الاجتماعي',
      'footer.about': 'من نحن',
      'footer.projects': 'المشاريع',
      'footer.why': 'لماذا إيجيك',
      'footer.contactLink': 'اتصل بنا',
      'footer.rights': '© ٢٠٢٦ إيجيك للمقاولات. جميع الحقوق محفوظة.',
      'footer.demo': 'الأرقام المعروضة بيانات توضيحية إلى أن يتم اعتمادها.',
      'footer.hours': 'مواعيد العمل',

      'float.whatsapp': 'تواصل عبر واتساب',
      'float.inquiry': 'أرسل استفسارًا',

      'form.title': 'لنتحدث',
      'form.sub': 'أخبرنا عن المشروع. نرد خلال يوم عمل واحد.',
      'form.name': 'الاسم بالكامل',
      'form.company': 'اسم الشركة',
      'form.phone': 'رقم الهاتف',
      'form.email': 'البريد الإلكتروني',
      'form.service': 'الخدمة المطلوبة',
      'form.serviceChoose': 'اختر الخدمة المطلوبة',
      'form.type': 'نوع المشروع',
      'form.typeChoose': 'اختر نوع المشروع',
      'form.typeOther': 'أخرى',
      'form.location': 'موقع المشروع',
      'form.area': 'المساحة التقديرية',
      'form.areaHint': 'مثال: ٤٠٠٠ متر مربع',
      'form.message': 'تفاصيل المشروع',
      'form.files': 'إرفاق ملفات المشروع',
      'form.filesHint': 'رسومات أو جداول كميات أو مراجع — اختياري',
      'form.submit': 'إرسال الاستفسار',
      'form.sending': 'جارٍ الإرسال…',
      'form.close': 'إغلاق',
      'form.required': 'هذا الحقل مطلوب.',
      'form.emailInvalid': 'أدخل بريدًا إلكترونيًا صحيحًا.',
      'form.phoneInvalid': 'أدخل رقم هاتف صحيحًا.',
      'form.messageShort': 'من فضلك أضف مزيدًا من التفاصيل.',
      'form.filesTooMany': 'لا تُرفق أكثر من {n} ملفات.',
      'form.filesTooBig': 'يجب ألا يتجاوز حجم كل ملف {n} ميجابايت.',
      'form.successTitle': 'شكرًا لك',
      'form.successText': 'تم إرسال طلبك بنجاح. سيتواصل معك فريقنا قريبًا.',
      'form.successBtn': 'إغلاق',
      'form.errorTitle': 'لم يتم إرسال الطلب',
      'form.errorText': 'حدث ما منع الإرسال. حاول مجددًا أو راسلنا على واتساب.',
      'form.retry': 'حاول مجددًا',
      'form.demoNote': 'وضع العرض: لا يوجد endpoint مُعد، لذا لا يتم إرسال أو تخزين أي بيانات.',

      'light.close': 'إغلاق المعرض',
      'light.prev': 'الصورة السابقة',
      'light.next': 'الصورة التالية',
      'light.counter': 'صورة',

      'project.back': 'كل المشاريع',
      'project.location': 'الموقع',
      'project.year': 'السنة',
      'project.scope': 'نطاق العمل',
      'project.about': 'عن المشروع',
      'project.work': 'ما نفّذناه',
      'project.systems': 'الخامات والأنظمة',
      'project.gallery': 'معرض المشروع',
      'project.next': 'المشروع التالي',
      'project.prev': 'المشروع السابق',
      'project.video': 'فيديو المشروع',
      'project.cta': 'ابدأ مشروعًا مشابهًا',
      'project.missing': 'تعذّر العثور على هذا المشروع.',

      'e404.title': 'لا يوجد شيء هنا.',
      'e404.text': 'الصفحة التي تبحث عنها غير موجودة.',
      'e404.btn': 'العودة للرئيسية'
    }
  };

  var lang = 'en';
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') lang = saved;
  } catch (e) { /* storage blocked — fall back to English */ }

  function t(key) {
    var table = DICT[lang] || DICT.en;
    return (key in table) ? table[key] : (DICT.en[key] || '');
  }

  /** Pick the right side of an { en, ar } pair. */
  function pick(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return value[lang] || value.en || '';
    return value;
  }

  function apply(root) {
    var scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });

    if (!root) {
      document.documentElement.lang = lang;
      document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
      document.documentElement.classList.toggle('is-rtl', lang === 'ar');
      var titleKey = window.PAGE_TITLE_KEY || 'meta.title';
      if (t(titleKey)) document.title = t(titleKey);
      document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
        var isActive = btn.getAttribute('data-lang-btn') === lang;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }
  }

  function set(next, options) {
    if (next !== 'en' && next !== 'ar') return;
    if (next === lang && !(options && options.force)) return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

    document.documentElement.classList.add('is-lang-switching');
    window.setTimeout(function () {
      apply();
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: lang } }));
      window.setTimeout(function () {
        document.documentElement.classList.remove('is-lang-switching');
      }, 60);
    }, 240);
  }

  window.I18N = {
    get lang() { return lang; },
    t: t,
    pick: pick,
    apply: apply,
    set: set,
    isRTL: function () { return lang === 'ar'; }
  };
})();
