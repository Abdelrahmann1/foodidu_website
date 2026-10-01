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
4. Build, audit, preview, deploy.

### Add a day deal (an offer that repeats on a weekday)

Add an entry to `data/day-deals.json`: `days` (`sat sun mon tue wed thu fri`), `brand` (a key from `brands.json`, or `name`/`logo` for a brand without a page), `title`, `details`, the official `source` link and `lastChecked`. The deal shows on the home page, on `/day-deals/` (grouped by day, with FAQ) and on the brand's page, and is highlighted automatically on its day (Cairo time). Only add deals you can link to an official source.

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
| `vendor_application_submitted` | `saved_to` | Partner applications (`sheet`, `firestore` or both). |

One-time setup in Google Analytics (Admin > Data display > Custom definitions > Create custom dimension, scope Event): add `brand`, `placement`, `code`, `sponsored`, `store`, `deal`, `search_term`. Then mark `promo_code_copied` as a key event (Admin > Events). A partner's monthly number: Explore > Free form, rows `brand`, values `Event count`, filter `Event name = promo_code_copied`.

**Firestore** keeps three collections, written by `static/js/site.js`: `cookieConsent`, `userSessions` and `vendorApplications` (every partner application, also sent to the Google Sheet, so none is lost). `firestore.rules` lets browsers add those records in the exact shape the site sends and never read anything back; read them in Firebase console > Firestore. Deploy rule changes with `firebase deploy --only firestore:rules`.

**App Check** (blocks writes that don't come from foodidu.com): create a reCAPTCHA v3 key for `foodidu.com` and `www.foodidu.com` at google.com/recaptcha/admin, register the web app with it in Firebase console > App Check (paste the secret key there), put the *site* key in `APP_CHECK_SITE_KEY` in `static/js/site.js`, deploy, and after a few days of clean metrics press **Enforce** for Cloud Firestore.

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
