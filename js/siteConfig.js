/* ============================================================================
   EGAC CONSTRUCTION — SITE CONFIGURATION
   ----------------------------------------------------------------------------
   EVERYTHING YOU ARE LIKELY TO CHANGE LIVES IN THIS FILE.
   Logos, hero video, phone numbers, e-mail, social links, statistics and the
   contact endpoint.

   Brand colours are NOT here — they are CSS variables in css/main.css (§1),
   taken directly from the official logo:
       EGAC Navy  #0B1C30
       EGAC Gold  #BF882C
   ========================================================================== */

window.SITE_CONFIG = {
  /* ---- identity -------------------------------------------------------- */
  name:        { en: 'EGAC Construction',            ar: 'إيجيك للمقاولات' },
  descriptor:  { en: 'Facade & Architectural Solutions',
                 ar: 'حلول الواجهات والتشطيبات المعمارية' },
  tagline:     { en: 'Engineering the face of modern architecture',
                 ar: 'نُشكّل واجهات العمارة الحديثة' },

  /* Taken from the official logo lock-up ("SINCE 2009"). */
  founded: 2009,

  /* ---- official logo files ----------------------------------------------
     WHITE is used on dark backgrounds (hero, footer, loader, mobile menu).
     NAVY is used on light backgrounds (scrolled navbar, inner pages).
     Replace the files, keep the paths — nothing else needs editing.
     ---------------------------------------------------------------------- */
  logoWhite: 'assets/logos/egac-logo-white.png',
  logoNavy:  'assets/logos/egac-logo-navy.png',

  /* ---- hero video -------------------------------------------------------
     heroVideoMobile is OPTIONAL. Leave it empty ('') to serve the main file
     to every device. heroPoster shows instantly and is also the fallback
     when the visitor has "reduce motion" switched on.
     ---------------------------------------------------------------------- */
  heroVideo:       'assets/videos/hero-video.mp4',
  heroVideoMobile: 'assets/videos/hero-video-mobile.mp4',
  heroPoster:      'assets/images/hero-poster.jpg',
  heroOverlay:     0.68,            // 0 - 1. Higher = darker, more readable text

  /* ---- contact ----------------------------------------------------------
     DEMO VALUES - replace with the real company details before launch.
     ---------------------------------------------------------------------- */
  phone:    '+20 100 000 0000',        // displayed
  phoneRaw: '+201000000000',           // used in tel: links
  whatsapp: '201000000000',            // digits only, country code first
  whatsappMessage: 'Hello EGAC Construction, I would like to discuss a project.',
  email:    'info@egacconstruction.com',
  address:  { en: 'Cairo, Egypt', ar: 'القاهرة، مصر' },
  hours:    { en: 'Saturday – Thursday · 9:00 – 18:00',
              ar: 'السبت – الخميس · ٩:٠٠ – ١٨:٠٠' },

  /* ---- social -----------------------------------------------------------
     Paste the real profile URLs. Any entry left empty is hidden.
     ---------------------------------------------------------------------- */
  social: [
    { label: 'Facebook',  url: '' },
    { label: 'Instagram', url: '' },
    { label: 'LinkedIn',  url: '' },
    { label: 'YouTube',   url: '' },
    { label: 'TikTok',    url: '' }
  ],

  /* ---- statistics -------------------------------------------------------
     DEMO DATA - not verified company figures. Replace or delete.
     `fromFounded: true` makes the counter calculate years automatically
     from `founded` above, so it never goes stale.
     ---------------------------------------------------------------------- */
  statsAreDemo: true,
  stats: [
    { value: 0, fromFounded: true, suffix: '+', label: { en: 'Years of experience', ar: 'سنة من الخبرة' } },
    { value: 150,    suffix: '+', label: { en: 'Completed projects',  ar: 'مشروع مُنفَّذ' } },
    { value: 80,     suffix: '+', label: { en: 'Clients',             ar: 'عميل' } },
    { value: 250000, suffix: '+', label: { en: 'Square metres executed', ar: 'متر مربع مُنفَّذ' } },
    { value: 6,      suffix: '',  label: { en: 'Core solutions',      ar: 'حلول أساسية' } }
  ],

  /* ---- project types ----------------------------------------------------
     Building categories offered in the inquiry form. These describe the
     CLIENT's building; the services list comes from data.js.
     ---------------------------------------------------------------------- */
  projectTypes: [
    { id: 'residential',    label: { en: 'Residential',             ar: 'سكني' } },
    { id: 'commercial',     label: { en: 'Commercial / Retail',     ar: 'تجاري / محلات' } },
    { id: 'administrative', label: { en: 'Administrative / Office', ar: 'إداري / مكاتب' } },
    { id: 'hospitality',    label: { en: 'Hospitality',             ar: 'فندقي' } },
    { id: 'industrial',     label: { en: 'Industrial',              ar: 'صناعي' } },
    { id: 'other',          label: { en: 'Other',                   ar: 'أخرى' } }
  ],

  /* ---- contact form -----------------------------------------------------
     The inquiry form posts here. 'api/submit.php' is the handler included
     with the site - it validates again server-side and writes to MySQL.

     Set it to '' to run the form in DEMO mode (validated and animated, but
     nothing is sent anywhere and nothing is stored).
     ---------------------------------------------------------------------- */
  contactEndpoint: 'api/submit.php',
  contactMethod: 'POST',

  /* Attachment rules - mirrored server-side in api/config.php. */
  uploadMaxFiles: 5,
  uploadMaxMB: 8,

  /* ---- SEO ------------------------------------------------------------- */
  canonical: 'https://www.egacconstruction.com/'
};
