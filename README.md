# Foodidu website

Static, pre-rendered site for [foodidu.com](https://foodidu.com): promo codes for restaurants, groceries and online shopping in Egypt and the GCC. English lives at `/`, Arabic at `/ar/`. Every page is plain HTML generated at build time, so Google reads the full content without running JavaScript.

## Folders

| Path | What it is |
|---|---|
| `data/brands.json` | **All codes and offers** (English + Arabic). Edit this file to change a code. |
| `content/` | Privacy policy and terms, one file per language. |
| `static/` | CSS, JS and images, copied into `public/` on build (CSS/JS get a content hash for long caching). |
| `tools/build.pl` | Generates every page, `sitemap.xml`, `robots.txt` and `site.webmanifest` into `public/`. |
| `tools/seo-audit.pl` | Checks every built page for SEO problems. |
| `tools/serve.pl` | Local preview server that behaves like Firebase Hosting. |
| `tools/assets.html` | Browser tool that renders brand logos, app icons and social-share (Open Graph) images. |
| `tools/banners.html` | Browser tool that renders partner banners and ad creatives into `banners/` (not in git, not deployed). |
| `tools/art.js` | Canvas helpers (tickets, colours, saving) shared by the two browser tools. |
| `public/` | Build output. This is what Firebase deploys. Don't edit by hand. |
| `legacy/` | Snapshot of the old live site, kept for reference only. Not deployed. |

Only Perl is needed (Git for Windows ships it). No Node, no npm packages.

## Everyday workflow

```bash
perl tools/build.pl        # rebuild public/
perl tools/seo-audit.pl    # must say "All checks passed."
perl tools/serve.pl        # preview at http://localhost:5000/
firebase deploy --only hosting
```

### Change or add a code

1. Edit the brand in `data/brands.json` (`code`, `badge`, `offer`, `terms`, `seo` for both `en` and `ar`).
2. When you personally re-check a code, set `"lastVerified": "YYYY-MM-DD"`. For 45 days the page title shows the month (for example "(Sep 2026)") and the page shows "Checked by Foodidu on …". Titles with a current month get more clicks in Google.
3. A new brand needs a unique `key` and `slug` (the URL, e.g. `KFC-PromoCode`), a logo in `static/img/brands/`, and share images. Run `perl tools/serve.pl`, open `http://localhost:5000/__tools/assets.html`, add the logo to the `LOGOS` list and click **Generate all**.
4. Build, audit, preview, deploy. (Or do all of this from foodidu.com/dashboard/ > إدارة المحتوى, see below.)

### Add a day deal (an offer that repeats on a weekday)

Add an entry to `data/day-deals.json`: `days` (`sat sun mon tue wed thu fri`), `brand` (a key from `brands.json`, or `name`/`logo` for a brand without a page), `title`, `details`, the official `source` link and `lastChecked`. The deal shows on the home page, on `/day-deals/` (grouped by day, with FAQ) and on the brand's page, and is highlighted automatically on its day (Cairo time). Only add deals you can link to an official source.

### Amazon picks (affiliate)

`data/amazon-picks.json` lists products the owner chose on amazon.eg (product ID `asin`, `name` and a short `note` in English and Arabic). They show on the Amazon Egypt page and, the first four, on the home page under the featured banners. Every link gets the Associates tag and `rel="nofollow sponsored"`, with an affiliate disclosure above the list. Never add prices: Amazon allows only prices that update from Amazon itself. Edit them from the dashboard (إدارة المحتوى > اختيارات أمازون); the sections are hidden while the list is empty.

`data/business.json` is Foodidu Business, the site for restaurants: the landing page `/business/` (services, the loyalty journey, plans, the application form and FAQ) and one page per service with `"page"` not set to `false` (`/business/loyalty-program/`, `/business/qr-menu/`, `/business/restaurant-website/`). Every text is `{ "en": …, "ar": … }`. Plans carry no prices on purpose ("monthly plan", "custom quote"); only promise what the team can deliver. The form saves to the same Google Sheet and Firestore collection as before; the chosen services and plan are added at the top of `description`. The old `/partners/` URLs redirect here (`firebase.json`). These pages have their own look, like a software company's site rather than the deals site: `layout(skin => 'biz')` swaps in their own header and footer (`biz_chrome`) and loads `static/css/biz.css`. The example pictures of each service (QR menu on a phone, loyalty card, QR stand, ordering website, code on Foodidu) are HTML drawn by `biz_mock` in `tools/build.pl`; the QR code on the stand is real and opens `/business/` (made by `node tools/qr.js`, checked with `node tools/qr.js --test`). The free tool `/business/qr-menu-generator/` (texts in `business.json` under `tool`) makes a code and a table card from any menu link in the browser: `static/js/qr.js` is the QR encoder (versions 1-10, level M, links up to 213 bytes, shared with tools/qr.js) and `static/js/qr-tool.js` draws the card as SVG, saves PNGs and prints 4 cards per A4 page. Nothing is sent to a server. Their share images (`static/img/og/biz-*.png`) and the social post and story for the free tool (`banners/business/`) are drawn by `http://localhost:5000/__tools/biz-art.html`; run it again after changing the business texts. The owner's WhatsApp (`whatsapp` in `business.json`) shows as a floating button, next to the form, in the footer and on the free tool. The landing page hero plays a 30-second explainer of the services (`static/js/biz-anim.js`, drawn on a canvas, Arabic and English: a promo code on Foodidu, the QR menu, online orders, loyalty stamps, real reviews on Google Maps; plays on screen, pause button, reduced motion shows the last scene); `http://localhost:5000/__tools/anim-video.html` shows its scenes and makes an MP4 of it for social media (banners/business/), encoding every frame with the browser's WebCodecs, so nothing extra to install.

The landing hero also has a quick request (business name, contact person, phone) that saves like the full form, with a fixed note in `description`; `firestore.rules` therefore requires only the name, contact and phone (deploy the rules after changing them: `firebase deploy --only firestore:rules`, the GitHub Action deploys hosting only). `audiences` in `business.json` adds one page per kind of place (`/business/cafes/`, `/business/cloud-kitchens/`): what is different about it, which services fit (each `tools` entry names a service key), FAQ and the quick form, which sets `businessType`. Write each one for a real difference; never make near-copies per city or cuisine. `guides` adds an article for restaurant owners at `/business/<key>/`, built from `sections` of these types: `cards` (with an optional `example`), `ideas` (each may link a `service`), `weeks`, `phrases`, `table` and `sheet`; a section with `print` gets a button that prints only that section. A guide with `for` (a service key) is shown as a band on that service page. Guides so far: the restaurant marketing plan and restaurant menu design; the landing page links it from the journey section, the cafés page has its own marketing ideas (`ideas` on an audience). Add a guide only when it answers real searches with real advice. The demo QR menu `/business/menu-demo/` (noindex, not in the sitemap; `data/menu-demo.json`, `static/js/menu-demo.js`, `static/css/menu-demo.css`) is a made-up restaurant, Didu Grill, that shows every QR menu feature: real food photos (free Unsplash photos in `static/img/menu-demo/`, 600×600, no brand logos), dish details, most ordered, prices in Arabic and English, the offer at the top, the table number from `?t=7`, search, a suggestion that completes the order (`suggest` on a dish), a group order with split bill, the waiter screen, loyalty stamps and Rate us. It says at the top that it is a demo. Group orders sync between phones through the Firestore collection `demoGroups` (see `firestore.rules`, deploy them first); when that fails the group lives on one phone. On a computer it shows a QR code to open it on a phone. It uses `layout(bare => 1)`: no site header and footer. Every business page carries Foodidu Business as an `Organization` in its JSON-LD (`biz_org`, logo `static/img/biz/logo.png`); put the Google Business Profile link in `org.gbp` once the profile is verified.

### Featured partner slot (can be sold)

`data/featured.json` puts one partner in a banner right under the home-page hero (English and Arabic). Set `partner` to a restaurant key from `restaurant-offers.json` or a brand key from `brands.json`; wording, logo and link are filled in from that partner, or write your own `title` / `text` / `cta` (`{ "en": …, "ar": … }`) and `url`. Set `"sponsored": true` when the partner pays: the label becomes **Sponsored / إعلان** and outside links get `rel="sponsored"`, as Google requires for paid links. The banner disappears after `until` (Cairo time) even if nobody rebuilds; set `"active": false` to remove it sooner.

### Banners for social media and ads

Run `perl tools/serve.pl`, open `http://localhost:5000/__tools/banners.html`, tick what you need and click **Generate**. Everything is drawn from the data files, so after changing a code or an offer just generate again.

| Folder | Sizes | Use |
|---|---|---|
| `banners/partners/<key>/` | post 1080×1080, story 1080×1920 | "Now on Foodidu" banners to send to a partner to repost; each points to its Foodidu page. |
| `banners/ads/meta/` | feed 1080×1080, portrait 1080×1350, story 1080×1920, link 1200×628 | Facebook and Instagram ads. The story size is also the TikTok size. |
| `banners/ads/google/` | 300×250, 336×280, 728×90, 970×250, 300×600, 160×600, 320×100, 320×50 | Google Display image ads: JPEG under Google's 150 KB limit. |

Story layouts keep text out of the top 250 px and bottom 330 px that Instagram and TikTok cover. The ad tickets only offer partners with an exclusive code (`"exclusive": true` in `brands.json`), Rabbit and noon by default, because ad platforms can reject ads that show another company's logo without permission.

## Firebase: analytics, partner reports and the database

**Events for partner reports** (Google Analytics 4, sent only after the visitor accepts analytics cookies). Each event carries `placement` (`home_hero`, `page_top`, `sidebar`, `featured`, `header`, `footer`, `app_section`, `page`):

| Event | Extra parameters | Use it for |
|---|---|---|
| `promo_code_copied` | `brand`, `code` | Codes copied per brand: the main number for a partner. |
| `brand_link_click` | `brand`, `link_domain` | Visits sent to the brand's own site. |
| `restaurant_order_click`, `restaurant_call_click` | `brand` | Restaurant pages: menu/order clicks and phone calls. |
| `featured_view`, `featured_click` | `brand`, `sponsored` | Views and clicks of the featured banner (proves what the slot is worth). |
| `day_deal_source_click` | `deal` | Clicks to a deal's official source. |
| `app_download_click` | `store` | Google Play button clicks. |
| `search`, `search_no_results` | `search_term` | What people look for; no-result searches are brands worth signing up. |
| `vendor_application_submitted` | `form`, `business_type`, `plan`, `saved_to` | Foodidu Business requests: `form` is `full` (the form at #join) or `quick` (the hero form); `saved_to` is `sheet`, `firestore` or both. |
| `business_form_start` | `form` | Someone started typing in a business form; compare with the requests sent. |
| `business_whatsapp_click` | `placement` | WhatsApp clicks on the business pages (`header`, `page_top`, `floating_button`, `form_section`, `footer`, …). |
| `business_plan_click` | `plan` | "Choose this plan" clicks. |
| `qr_tool_download` | `kind` | The free QR tool: `card`, `code` or `print`. |

One-time setup in Google Analytics (Admin > Data display > Custom definitions > Create custom dimension, scope Event): add `brand`, `placement`, `code`, `sponsored`, `store`, `deal`, `search_term`, `form`, `business_type`, `plan`, `kind`. Then mark `promo_code_copied`, `vendor_application_submitted` and `business_whatsapp_click` as key events (Admin > Events; an event is listed there after it happens once). The dashboard also counts the requests per page from Firestore. A partner's monthly number: Explore > Free form, rows `brand`, values `Event count`, filter `Event name = promo_code_copied`.

**Firestore** keeps three collections, written by `static/js/site.js`: `cookieConsent`, `userSessions` and `vendorApplications` (every partner application, also sent to the Google Sheet, so none is lost). `firestore.rules` lets browsers add those records in the exact shape the site sends and never read anything back; read them in Firebase console > Firestore. Deploy rule changes with `firebase deploy --only firestore:rules`.

**App Check** (blocks writes that don't come from foodidu.com): create a reCAPTCHA v3 key for `foodidu.com` and `www.foodidu.com` at google.com/recaptcha/admin, register the web app with it in Firebase console > App Check (paste the secret key there), put the *site* key in `APP_CHECK_SITE_KEY` in `static/js/site.js`, deploy, and after a few days of clean metrics press **Enforce** for Cloud Firestore.

**Our work:** `static/business/work/` holds concept sites we designed to show restaurants what we can build, copied to the site as they are (their own HTML, CSS and JS). The first is NILO gelato, `/business/work/nilo/` (English) and `/business/work/nilo/ar/` (Arabic): every page is noindex, says in its footer that it is a concept site by Foodidu Business, has a pill back to /business/, and shares with the preview image `og.jpg`. Its newsletter box sends nothing and says so. `work` in `data/business.json` shows it as section 3 "Our work" on the landing page, as an example on the page of the service it belongs to (`service`), and as a live demo link in that service's row. Always present these as concept projects, never as client work.

**Email for every request:** `tools/apps-script-notify.gs` goes into the Apps Script of the "Vendor Requests" sheet (Extensions > Apps Script, a new file, then run `setupNotify` once). Every 5 minutes it emails each new row to the owner, with a WhatsApp link to the restaurant and a link to the dashboard. The dashboard marks requests that came in since the last visit as new.

## Dashboard: foodidu.com/dashboard/

An internal page (noindex, not in the sitemap) built by `tools/build.pl` with `static/js/dashboard.js` and `static/css/dashboard.css`.

- **Overview and Content** come from the data files at build time: every code with its last check (warns after 30 days, flags 45+), restaurant offers and when they end, day deals, the featured slot, and setup warnings. Anyone with the link can see this part; it is the same information the site already shows.
- **Visitors** (Google Analytics 4), **Google** (Search Console) and **Partner applications** (Firestore) load only after signing in with Google. GA and Search Console data are protected by Google's own permissions; applications can be read only by the emails in `isAdmin()` in `firestore.rules`.

One-time setup:
1. Firebase console > Authentication > Get started > Sign-in method > Google > Enable. Then Settings > Authorized domains > Add domain: `foodidu.com`.
2. Enable these APIs for the `foodidu-website` Google Cloud project: Google Analytics Data API, Google Analytics Admin API, Google Search Console API.
3. In Google Analytics, register the custom dimensions listed in the section above, so the per-brand report and searches appear.

Google's sign-in token lasts an hour; after that the dashboard shows "Reconnect Google".

### Manage content (إدارة المحتوى)

Add, edit and delete codes (with extra codes), restaurant offers, day deals, the featured slot and the 3 home code cards from the dashboard, no code editor needed. `static/js/admin.js` reads `data/*.json` and `firebase.json` from GitHub, checks every field (required English and Arabic text, unique key and URL, Google title and description lengths, no duplicate titles), draws the logo tile and the share images in the browser with `static/js/art.js`, and saves all changes as one commit on `main`. The **Build and deploy** GitHub Action (`.github/workflows/deploy.yml`) then builds, runs the SEO audit and deploys; the dashboard shows when it is live (about 2 minutes). If the audit fails, nothing is deployed.

- A page's `key` and URL never change after it is added (Google rankings). Deleting a brand or restaurant adds 301 redirects for its old URLs to the codes page; something still used by a day deal, the featured slot or the home cards cannot be deleted until that is changed.
- Uploaded logos get a new file name each time (`kfc-1a2b3c.webp`), because browsers keep `/img/` files for 30 days.
- The data files are written in one format (short objects on one line). Local edits are fine; **run `git pull` before editing locally**, because the dashboard commits to `main` too.

One-time setup:
1. **Deploy key for GitHub:** Firebase console > Project settings > Service accounts > Generate new private key (a JSON file). In GitHub: the repo > Settings > Secrets and variables > Actions > New repository secret, name `FIREBASE_SERVICE_ACCOUNT`, paste the whole JSON. Then delete the downloaded file.
2. **GitHub token for the dashboard (per browser):** github.com/settings/personal-access-tokens/new, Repository access: only `foodidu_website`, Permissions: Contents = Read and write, Actions = Read-only. Paste it in the dashboard under إدارة المحتوى. It stays in that browser only; **Disconnect GitHub** removes it.

## SEO already in place

- Pre-rendered HTML for all 34 pages (no JS needed to read content).
- English/Arabic pairs linked with `hreflang` (+ `x-default`), canonical URLs, unique titles and descriptions per page and language, Arabic titles that target Arabic searches ("كود خصم كنتاكي").
- JSON-LD: Organization, WebSite, WebPage, BreadcrumbList, FAQPage, ItemList.
- Open Graph + Twitter images (1200×630) for every page in both languages.
- `sitemap.xml` with language alternates, `robots.txt`, real 404 page (no more "every URL returns the home page").
- 301 redirects from the old URLs (`/KFC-PromoCode/index.html`, `/pages/...`) in `firebase.json`.
- Fast: ~20 KB (gzipped) of HTML+CSS+JS on the home page, fingerprinted assets cached for a year, analytics loaded after the page.

## After deploying (one time)

1. **Google Search Console**: add the `foodidu.com` property, then submit `https://foodidu.com/sitemap.xml`. Use "URL inspection → Request indexing" for `/`, `/ar/` and the top brand pages.
2. **Bing Webmaster Tools**: import the site from Search Console (Bing also powers some AI search results).
3. Check a brand page in Google's [Rich Results Test](https://search.google.com/test/rich-results) and the share preview in [opengraph.xyz](https://www.opengraph.xyz/).
4. Share brand pages on Facebook/Instagram/TikTok with their direct links; every page has its own share image.
