# EGAC Construction — corporate website

Static front end (HTML5 / CSS3 / vanilla JS) with a small PHP + MySQL back end
for client requests. No build step, no framework, no Composer. Upload the folder
to Hostinger and it runs.

---

## 1. Where everything lives

```
index.html                  the one-page site
404.html                    error page (wired up in .htaccess)
.htaccess                   404 route, HTTPS, gzip, cache headers
robots.txt  sitemap.xml  site.webmanifest
database.sql                MySQL schema — import this once

/css        main.css · animations.css · responsive.css
/js
    siteConfig.js           ← logos, video, phone, e-mail, statistics, endpoint
    projects.js             ← THE 10 PROJECTS live at the top of this file
    data.js                 solutions, materials, why-EGAC, clients
    language.js             EN/AR dictionary + RTL engine
    theme.js                light / dark mode
    navigation.js  animations.js  contact.js  project-page.js  main.js
/pages
    project.html            project detail template (?project=project-01)
/api
    submit.php              receives the form, validates, writes to MySQL
    admin.php               password-protected list of every request
    export.php              CSV / XLSX download
    config.php              ← YOUR DATABASE CREDENTIALS GO HERE
    config.example.php      pristine template
    lib.php                 shared helpers
    storage/uploads/        attachments (blocked from the web)
/assets
    /logos      egac-logo-white.png · egac-logo-navy.png
    /videos     hero-video.mp4 · hero-video-mobile.mp4
    /images     hero-poster.jpg · section imagery · project-placeholder.svg
    /projects   project-01 … project-25   ← drop project photos here
    /materials  /icons
```

---

## 2. Brand identity

Both official logo files were cropped to their artwork and exported at 1200px.
Nothing about the logo is redrawn, recoloured or reproportioned — the site only
scales it.

| Where | File | Why |
|---|---|---|
| Over the hero, footer, loader, mobile menu | `egac-logo-white.png` | dark background |
| Scrolled navbar, project pages, 404 | `egac-logo-navy.png` | light background |

Both versions sit stacked in the same grid cell in the navbar, so the swap
costs nothing in layout and cannot shift the header. A soft navy scrim sits
behind the transparent navbar so the white logo stays readable over the
brightest frames of the video.

Colours were sampled from the logo artwork and live in `css/main.css` §1:

```css
--egac-navy: #0B1C30;   /* dark surfaces and body text */
--egac-gold: #BF882C;   /* accent only — underlines, numbers, hover states */
```

Gold is never a background or a body colour. To retheme the whole site, change
those two variables.

To swap the logo files, keep the same paths — or change them in
`js/siteConfig.js` (`logoWhite` / `logoNavy`). Both PNG and SVG work.

### 2.1 Light and dark mode

Both themes are built from the same two brand colours. The theme layer lives in
`css/main.css` §1: every rule paints with `--bg`, `--surface`, `--fg`,
`--fg-60/45/12`, `--band`, `--band-fg`, `--btn-solid-bg/fg` and
`--nav-solid-bg`, and `html[data-theme="dark"]` overrides that one block.
There is no second stylesheet.

| Token | Light | Dark |
|---|---|---|
| `--bg` page | `#F6F6F4` | `#0B1C30` (EGAC navy) |
| `--surface` modals, mega menu | `#F6F6F4` | `#13253A` |
| `--fg` text | navy | `#EDF1F5` |
| `--band` footer, strength, advertising | navy | `#06111D` |
| `--accent` | `#BF882C` | `#BF882C` (unchanged) |

Retheming the whole site means editing those tokens — nothing else.

**The logo is never recoloured.** No filter, no invert. Both official files sit
stacked in one grid cell in the navbar, and the theme decides which one is
opaque: in the light theme the scrolled navbar is pale so the navy file shows;
in the dark theme it is navy so the white file stays on. Identical box, so
switching cannot shift the layout.

**Persistence.** `js/theme.js` stores the choice under `egac-theme` in
localStorage. Precedence is: what the visitor last chose → their operating
system preference → light. A four-line inline script in each page's `<head>`
sets `data-theme` before the stylesheets paint, so there is no flash of the
wrong theme, and the choice carries across page navigation. While no choice has
been made the site follows the operating system live.

**The toggle** sits in the navbar next to the EN / AR switch on every page,
including 404. Sun and moon cross-fade inside a fixed 38px circle, so the
button never changes size. It is keyboard reachable, carries `aria-pressed`
and an `aria-label` that updates with both the state and the language.

---

## 3. Hero video

Your footage was encoded for the web and is already in place:

| File | Size | Used for |
|---|---|---|
| `assets/videos/hero-video.mp4` | 1920×1080, ~10MB | desktop and tablet |
| `assets/videos/hero-video-mobile.mp4` | 1080px wide, ~2.5MB | screens ≤900px |
| `assets/images/hero-poster.jpg` | — | first paint, and the fallback |

How it behaves: the poster paints immediately, the video source is attached
afterwards so it never blocks rendering, the smaller file is chosen on narrow
screens, playback pauses when the hero scrolls out of view, and with
"reduce motion" switched on the video is never downloaded at all. Audio was
stripped since the element is muted anyway.

To replace it, overwrite the files, or point `heroVideo` / `heroVideoMobile` at
new paths in `js/siteConfig.js`. Leave `heroVideoMobile` empty to serve one file
everywhere. `heroOverlay` (currently `0.68`) controls how much the footage is
darkened for readability — lower it for darker footage.

Re-encoding a new clip:

```bash
ffmpeg -i source.mov -an -c:v libx264 -crf 26 -preset slow -vf scale=1920:-2 \
       -pix_fmt yuv420p -movflags +faststart hero-video.mp4
```

---

## 4. The twenty-five projects

Twenty-five slots are built and working. Each one needs two things.

**a. The images.** Drop them into the matching folder, using these names:

```
/assets/projects/project-01/
    cover.webp       card image + the large image at the top of the detail page
    01.webp          gallery, in order
    02.webp
    03.webp
    04.webp
    project-video.mp4   optional
```

`.jpg` and `.png` work too — if you use a different extension, change the paths
for that project in `js/projects.js`. Supply two gallery images instead of four
and only those two appear. **A missing file is skipped silently — never a broken
image icon, never an empty box.**

**b. The details.** Open `js/projects.js`. Everything editable is at the top:

```js
{
  id: 'project-01',
  name: 'Nile Tower',                  // or { en: 'Nile Tower', ar: 'برج النيل' }
  location: 'New Cairo, Egypt',
  year: '2024',
  categories: ['cladding', 'curtain-wall'],
  scope: 'Facade cladding and curtain wall',
  description: 'What the project was and what EGAC delivered.',
  materials: ['Aluminium composite panel', 'Structural glazing'],
  cover: 'assets/projects/project-01/cover.webp',
  gallery: [ … ],
  video: 'assets/projects/project-01/project-video.mp4'
}
```

**Any field left as `''` is hidden**, not shown blank. No year, no "Year —" row.

`categories` must use these ids, which drive the filter bar:
`cladding` · `curtain-wall` · `aluminum` · `upvc` · `copista` · `advertising`.
The filter bar only offers a category once a project actually uses it, and stays
hidden while every `categories` array is empty.

**Adding a twenty-sixth project:** create `/assets/projects/project-26/`, copy one
block in `js/projects.js`, change the id and paths. No HTML, CSS or other
JavaScript changes. The grid, filters, detail pages and prev/next all follow.

---

## 5. The client request system

### 5.1 What the form collects

Eight required fields — full name, company, phone, e-mail, service required,
project type, project location, project details — plus optional project size and
attachments. Services come from the site's own solutions list, so the dropdown
can never offer something EGAC does not do.

Validation runs in the browser **and** again in `api/submit.php`. The server is
what decides; the browser only makes it pleasant. Nothing is ever reported as
sent unless the server confirmed it was stored.

### 5.2 Setting it up on Hostinger

1. **Create the database.** hPanel → Databases → MySQL Databases. Note the
   database name, user and password.
2. **Import the schema.** Open phpMyAdmin for that database → Import →
   `database.sql` → Go. It creates `clients` and `submission_log`.
3. **Fill in `api/config.php`:**

   ```php
   'db' => [
       'host' => 'localhost',
       'name' => 'u123456789_egac',
       'user' => 'u123456789_egac',
       'pass' => 'your-password',
   ],
   ```

4. **Set an admin password** in the same file, under `admin.password`. Make it
   long and random — it is the only thing protecting every client's contact
   details.
5. **Test.** Submit the form on the live site, then open
   `https://your-domain.com/api/admin.php` and confirm the row is there.

`api/config.php` is the only file holding credentials. It is blocked from the
web by `api/.htaccess` and listed in `.gitignore`. Never paste it into a chat, a
ticket or a repository.

### 5.3 E-mail notification (optional)

The database is the record; e-mail is a heads-up on top of it. In
`api/config.php`:

```php
'mail' => [
    'enabled' => true,
    'to'      => 'info@egacconstruction.com',
    'from'    => 'no-reply@egacconstruction.com',   // must be on your own domain
],
```

On Hostinger, create that mailbox first (hPanel → Emails) and use an address on
your own domain as the sender. Mail sent "from" a Gmail or Outlook address gets
rejected by SPF and silently disappears. If a message never arrives, the request
is still safely in the database — check the admin page.

### 5.4 The admin page

`https://your-domain.com/api/admin.php` — sign in with the password from the
config. It lists every request, filters by status, searches by name, company,
e-mail, phone or location, lets staff set a status (New → In progress → Quoted →
Won / Lost / Spam) and keep an internal note.

It is deliberately small: one password, no user accounts, nothing to keep
patched. If several people need separate logins, that is the moment to move to a
proper admin application.

### 5.5 Export

From the admin header, or directly:

```
api/export.php                        CSV — opens straight in Excel
api/export.php?format=xlsx            real .xlsx workbook
api/export.php?status=New             only that status
api/export.php?from=2026-01-01&to=2026-03-31
```

The CSV is UTF-8 with a byte-order mark and cells beginning with `=` or `+` are
neutralised, so Arabic names arrive intact and nothing executes as a formula.
XLSX is generated with PHP's own zip extension — no library to install.

### 5.6 Spam and abuse protection

- **Honeypot** — a hidden field only a bot fills in. Those submissions are
  answered with a cheerful success and stored nowhere.
- **Timing** — forms completed faster than a person can read are discarded.
- **Rate limit** — six stored requests per IP per hour (`limits.per_ip_per_hour`).
- **Duplicate guard** — the same person sending the same message within five
  minutes is recorded once, so a double-click never creates two leads.
- **SQL injection** — every query is a prepared statement with bound parameters,
  and the two dropdowns are checked against fixed lists.
- **Uploads** — extension whitelist, size cap, generated filenames, stored
  outside the web root with `.htaccess` denying direct access and PHP execution.

All tunable in `api/config.php` under `limits` and `uploads`.

### 5.7 Running without a backend

Set `contactEndpoint: ''` in `js/siteConfig.js`. The form still validates and
animates, but nothing is sent or stored, and the modal says so.

---

## 6. Company details and figures

`js/siteConfig.js` holds the phone number, WhatsApp number, e-mail, address,
opening hours, social links and statistics.

```js
phone:    '+20 100 000 0000',     // displayed
phoneRaw: '+201000000000',        // tel: links
whatsapp: '201000000000',         // digits only — the floating button
email:    'info@egacconstruction.com',
```

**These are still placeholders.** So are the statistics, which carry
`statsAreDemo: true`. The years-of-experience figure is the exception: it is
calculated from `founded: 2009` (taken from the "SINCE 2009" line in the official
logo) so it never goes stale.

Social links are empty by default and each empty entry is hidden rather than
linking nowhere. Paste the real profile URLs to bring them back.

The client logos in the "Trusted by" section are neutral placeholder marks with
a caption saying so. Supply real logos, or delete the section — do not leave
placeholders reading as real clients.

---

## 6.1 Motion

All of it is CSS transitions on `transform`, `opacity` and `clip-path`, driven
by one shared IntersectionObserver in `js/animations.js`. No animation library
is required: GSAP is used for scrubbed parallax when the CDN is reachable, and
everything else works without it.

- **Logo entrance** — the official file fades in from `blur(8px)`,
  `scale(.955)` and a 9px lift over one second. It runs on the `.brand`
  wrapper, not the images, so it never interferes with the theme swap, and it
  only touches transform/filter/opacity, so the header cannot move.
- **Page transitions** — four panels tile the viewport. On exit they sweep up
  one after another on a 30ms stagger (`clip-path`, 330ms, the last landing at
  420ms) while the page itself pulls back to 0.988, lifts 10px, blurs and
  drops to 45% opacity; the browser navigates at 430ms, so the new document
  paints behind a closed curtain and never flashes white. On arrival the
  panels peel away in the same order over 540ms and the content settles in
  behind them. Both curves are `cubic-bezier(0.76, 0, 0.24, 1)` for the panels
  and `cubic-bezier(0.16, 1, 0.3, 1)` for the content — hard acceleration,
  long glide. Total is around one second, most of it with the new page already
  on screen. Only `#main` is transformed, so the fixed header and floating
  buttons cannot jump and scroll position is untouched. Every step is a CSS
  keyframe with `both` fill, so the curtain clears itself even if JavaScript
  never runs, and the panels are `pointer-events: none` throughout. Coming
  back through history replays the arrival sweep via a `pageshow` handler.
  The blur is desktop-only, since it is the expensive part.
- **Section, text and image reveals** — `data-reveal`, `data-reveal="lines"`,
  `data-reveal="image"` and `data-stagger` in the markup. Add the attribute to
  any element and the observer picks it up.
- **Project cards** reveal with the image mask on scroll. After a filter change
  they appear immediately instead, since the visitor is already looking at the
  grid.
- **Project detail pages** bring in the title, facts, hero image, body,
  gallery, video and pager on the same curve.

`prefers-reduced-motion: reduce` disables the page curtain, the logo movement
and blur, parallax, the custom cursor and every entrance animation; the hero
video is not even downloaded. Nothing is hidden from those visitors — content
renders in its final state immediately.

---

## 7. Language

English is the default. The EN / AR switch sets `dir="rtl"`, swaps the type
family to IBM Plex Sans Arabic, mirrors the layout (all spacing uses logical
properties, so nothing is blindly reversed), keeps figures left-to-right inside
Arabic text, and remembers the choice in `localStorage`.

Interface strings live in one dictionary: `js/language.js`, `DICT.en` and
`DICT.ar`. Content strings are the `{ en, ar }` pairs in `data.js` and
`projects.js` — a project given a plain string shows that string in both
languages.

Have a native speaker review the Arabic before launch.

---

## 8. Deploying

Upload everything to `public_html`, then:

1. `.htaccess` already handles the 404 page, HTTPS, gzip and cache headers.
2. Update the domain in `js/siteConfig.js` (`canonical`), in the `<link
   rel="canonical">` and `og:` tags of `index.html`, and in `sitemap.xml`.
3. Import `database.sql` and fill in `api/config.php` (§5.2).
4. Check `https://your-domain.com/api/config.php` returns 403 — it must never
   render or download.
5. Submit a test request and confirm it appears in `api/admin.php`.

Note: `api/storage/uploads/` must be writable by PHP (755 is normally enough on
Hostinger).

---

## 9. Verified in a real browser

Tested headless at 1440 / 834 / 390px, over `file://` and over HTTP, in both
themes: no console errors, no horizontal overflow at any breakpoint, hero video
autoplays muted and inline, the logo swaps correctly between navbar states and
between themes with no CSS filter and no layout shift, all twenty-five project cards
render (3 / 2 / 1 masonry columns), an empty project slot drops every block it
has no data for instead of showing blanks, gallery lightbox works with arrow keys, ESC and touch swipe,
the Arabic switch flips to RTL across the whole layout, and the form runs
validation → loading → success / error honestly.

Theme specifically: toggling keeps scroll position and does not restart the
hero video, the choice survives a reload and carries from the 404 page to the
home page to a project page, Enter on the focused toggle works, and the
`aria-label` follows both the state and the language.

---

## 10. Before launch

- [ ] Real phone, WhatsApp number, e-mail and address in `siteConfig.js`
- [ ] Real statistics, or delete the ones you cannot verify
- [ ] Projects: images in the folders, details in `js/projects.js`
- [ ] Real client logos, or remove the "Trusted by" section — supply a light
      version for the dark theme, since most client artwork is dark
- [ ] Social profile URLs
- [ ] `api/config.php` filled in, `database.sql` imported, a test request stored
- [ ] Long random admin password set
- [ ] Notification mailbox created on the domain and tested
- [ ] Canonical URL, OG image and sitemap updated to the live domain
- [ ] Arabic copy reviewed by a native speaker
