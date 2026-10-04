/* Foodidu — site behaviour. No dependencies. Loaded with `defer`. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var DATA = {};
  try { DATA = JSON.parse(document.getElementById("fd-data").textContent); } catch (e) {}
  var T = DATA.t || {};
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- header: menu + scrolled state ---------- */
  var header = document.querySelector(".site-header");
  var menuBtn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  var backdrop = document.querySelector(".nav-backdrop");
  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
    doc.classList.toggle("menu-open", open);
    if (backdrop) {
      if (open) { backdrop.hidden = false; requestAnimationFrame(function () { backdrop.classList.add("show"); }); }
      else { backdrop.classList.remove("show"); setTimeout(function () { if (!nav.classList.contains("open")) backdrop.hidden = true; }, 300); }
    }
    if (open) { var first = nav.querySelector("a"); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50); }
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1060 && nav.classList.contains("open")) setMenu(false); });
  }
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- toast ---------- */
  var toast = document.getElementById("toast");
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.querySelector("span").textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  /* ---------- partner-report events ----------
     Links marked data-track="event" (brand site, restaurant order/call, featured banner, Google Play, deal sources)
     send that event with their data-brand / data-store / data-deal / data-sponsored and where on the page they sit.
     data-track-view="event" sends once when at least half of the element has been on screen. */
  function placement(el) {
    return el.closest(".site-header") ? "header" : el.closest(".site-footer") ? "footer" : el.closest(".feat-slot") ? "featured"
      : el.closest(".hero") ? "home_hero" : el.closest(".page-hero") ? "page_top" : el.closest(".side") ? "sidebar"
      : el.closest(".app-band, .band") ? "app_section" : "page";
  }
  function trackParams(el) {
    var p = { placement: placement(el) };
    ["brand", "store", "deal", "sponsored"].forEach(function (k) { var v = el.getAttribute("data-" + k); if (v) p[k] = v; });
    if (el.host && el.host !== location.host) p.link_domain = el.host;
    return p;
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-track]");
    if (el) track(el.getAttribute("data-track"), trackParams(el));
  });
  var viewed = document.querySelectorAll("[data-track-view]");
  if (viewed.length && "IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        seen.unobserve(en.target);
        track(en.target.getAttribute("data-track-view"), trackParams(en.target));
      });
    }, { threshold: 0.5 });
    viewed.forEach(function (el) { seen.observe(el); });
  }

  /* ---------- copy code ---------- */
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      ok ? resolve() : reject();
    });
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-code]");
    if (!btn) return;
    var code = btn.getAttribute("data-code");
    var label = btn.querySelector(".act-label");
    copyText(code).then(function () {
      btn.classList.add("copied");
      if (label) label.textContent = T.copied || "Copied";
      showToast((T.copiedToast || "Code {code} copied").replace("{code}", code));
      setTimeout(function () { btn.classList.remove("copied"); if (label) label.textContent = T.copy || "Copy"; }, 2400);
      track("promo_code_copied", { brand: btn.getAttribute("data-brand") || "", code: code, placement: placement(btn) });
    }, function () {
      var codeEl = btn.querySelector(".code");
      if (codeEl && window.getSelection) { var sel = window.getSelection(); sel.removeAllRanges(); var rg = document.createRange(); rg.selectNodeContents(codeEl); sel.addRange(rg); }
      showToast(T.copyFail || "Copy failed, select the code manually");
    });
  });

  /* ---------- day deals: mark today's offers (Cairo time) and move them first ---------- */
  var ddCards = document.querySelectorAll(".dday[data-days]");
  if (ddCards.length) {
    var today = "";
    try { today = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Africa/Cairo" }).format(new Date()).toLowerCase().slice(0, 3); }
    catch (e) { today = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()]; }
    ddCards.forEach(function (card) {
      if ((" " + card.getAttribute("data-days") + " ").indexOf(" " + today + " ") === -1) return;
      var dayGroup = card.closest(".group[id]");   // on the day-deals page, only today's group lights up
      if (dayGroup && dayGroup.id !== today) return;
      card.classList.add("is-today");
      var tag = card.querySelector(".today-tag");
      if (tag) tag.hidden = false;
      var li = card.parentElement, list = li && li.parentElement;
      if (list && list.firstElementChild !== li) list.insertBefore(li, list.firstElementChild);
    });
  }

  /* ---------- featured partner slot: gone once its end date has passed (Cairo time), even before a rebuild ---------- */
  var slots = document.querySelectorAll("[data-until]");
  if (slots.length) {
    var ymd = "";
    try { ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { ymd = new Date().toISOString().slice(0, 10); }
    slots.forEach(function (el) { if (ymd > el.getAttribute("data-until")) el.parentNode.removeChild(el); });
  }

  /* ---------- filters (chips) + query ---------- */
  var list = document.querySelector("[data-filterable]");
  if (list) {
    var state = { cat: "all", region: "all", q: "" };
    var items = Array.prototype.slice.call(list.querySelectorAll("[data-cat]"));
    var groups = Array.prototype.slice.call(document.querySelectorAll("[data-group]"));
    var empty = document.querySelector("[data-empty]");
    var params = new URLSearchParams(location.search);
    state.q = (params.get("q") || "").trim().toLowerCase();
    if (state.q) { var qi = document.getElementById("q"); if (qi) qi.value = params.get("q"); }
    var hashCat = location.hash.slice(1);

    var apply = function () {
      var shown = 0;
      items.forEach(function (it) {
        var ok = (state.cat === "all" || it.getAttribute("data-cat") === state.cat) &&
                 (state.region === "all" || /(^| )all( |$)/.test(it.getAttribute("data-region")) ||
                  (" " + it.getAttribute("data-region") + " ").indexOf(" " + state.region + " ") !== -1) &&
                 (!state.q || (it.getAttribute("data-search") || "").indexOf(state.q) !== -1);
        it.hidden = !ok;
        if (ok) shown++;
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector("[data-cat]:not([hidden])"); });
      if (empty) empty.hidden = shown !== 0;
    };
    document.querySelectorAll("[data-filter]").forEach(function (chip) {
      var kind = chip.getAttribute("data-filter");
      var val = chip.getAttribute("data-value");
      if (kind === "cat" && hashCat && val === hashCat) state.cat = val;
      chip.addEventListener("click", function () {
        state[kind] = val;
        if (kind === "cat") state.q = "";
        document.querySelectorAll('[data-filter="' + kind + '"]').forEach(function (c) {
          c.setAttribute("aria-pressed", String(c === chip));
        });
        apply();
      });
    });
    document.querySelectorAll('[data-filter="cat"]').forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.getAttribute("data-value") === state.cat));
    });
    apply();
    window.addEventListener("hashchange", function () {
      var chip = document.querySelector('[data-filter="cat"][data-value="' + location.hash.slice(1).replace(/[^\w-]/g, "") + '"]');
      if (chip) { chip.click(); var t = document.getElementById("codes"); if (t) t.scrollIntoView(); }
    });
    if (hashCat && state.cat !== "all") {
      var target = document.getElementById("codes");
      if (target) setTimeout(function () { target.scrollIntoView(); }, 0);
    }
  }

  /* ---------- search with suggestions ---------- */
  var form = document.querySelector("form.search");
  if (form && DATA.brands) {
    var input = form.querySelector("input");
    var box = form.querySelector(".search-results");
    var active = -1;
    var missTimer, missed = [];
    var norm = function (s) { return (s || "").toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي"); };
    var render = function () {
      var q = norm(input.value.trim());
      active = -1;
      if (!q) { box.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
      var hits = DATA.brands.filter(function (b) { return norm(b.s).indexOf(q) !== -1; }).slice(0, 6);
      box.innerHTML = "";
      clearTimeout(missTimer);
      if (!hits.length) {
        var li = document.createElement("li");
        li.className = "r-empty"; li.textContent = T.noResults || "No codes found";
        box.appendChild(li);
        // brands people look for that we don't have yet = partnership leads (sent once the typing stops)
        var term = input.value.trim();
        if (term.length >= 3) missTimer = setTimeout(function () { if (missed.indexOf(term) === -1) { missed.push(term); track("search_no_results", { search_term: term.slice(0, 80) }); } }, 1500);
      }
      hits.forEach(function (b, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option"); li.id = "sr-" + i;
        var a = document.createElement("a");
        a.href = b.u;
        var img = document.createElement("img");
        img.src = b.l; img.alt = ""; img.width = 38; img.height = 38;
        var wrap = document.createElement("span");
        var n = document.createElement("span"); n.className = "r-name"; n.textContent = b.n;
        var o = document.createElement("span"); o.className = "r-offer"; o.textContent = b.o;
        wrap.appendChild(n); wrap.appendChild(o);
        a.appendChild(img); a.appendChild(wrap); li.appendChild(a); box.appendChild(li);
      });
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };
    var move = function (d) {
      var links = box.querySelectorAll("a");
      if (!links.length) return;
      active = (active + d + links.length) % links.length;
      links.forEach(function (l, i) { l.classList.toggle("active", i === active); });
      input.setAttribute("aria-activedescendant", "sr-" + active);
    };
    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Escape") { box.hidden = true; input.setAttribute("aria-expanded", "false"); }
      else if (e.key === "Enter" && active > -1) { e.preventDefault(); box.querySelectorAll("a")[active].click(); }
    });
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) { box.hidden = true; input.setAttribute("aria-expanded", "false"); } });
    form.addEventListener("submit", function (e) {
      if (input.value.trim()) track("search", { search_term: input.value.trim().slice(0, 80) });
      var q = norm(input.value.trim());
      var exact = DATA.brands.filter(function (b) { return norm(b.s).indexOf(q) !== -1; });
      if (q && exact.length === 1) { e.preventDefault(); location.href = exact[0].u; }
    });
  }

  /* ---------- partner application form ---------- */
  var vform = document.getElementById("vendor-application-form");
  if (vform && DATA.formUrl) {
    vform.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!vform.reportValidity()) return;
      var btn = vform.querySelector('button[type="submit"]');
      var status = document.getElementById("form-status");
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = T.sending || "Sending…";
      status.hidden = true;
      var data = {};
      new FormData(vform).forEach(function (v, k) { data[k] = String(v).trim(); });
      data.language = doc.lang;
      var body = new URLSearchParams();
      Object.keys(data).forEach(function (k) { body.append(k, data[k]); });
      // Two independent copies, so an application is never lost: the Google Sheet (Apps Script) and Firestore.
      var toSheet = fetch(DATA.formUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
        .then(function (r) { if (!r.ok) throw new Error("sheet " + r.status); });
      var toDb = withTimeout(loadCore().then(function (db) {
        return db.collection("vendorApplications").add(Object.assign({}, data, { page: location.pathname, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() }));
      }), 15000);
      settle([toSheet, toDb]).then(function (ok) {
        if (ok[0] || ok[1]) {
          status.className = "form-status ok"; status.textContent = T.formOk || "Thanks!";
          vform.reset();
          track("vendor_application_submitted", { saved_to: [ok[0] ? "sheet" : "", ok[1] ? "firestore" : ""].filter(Boolean).join("+") });
        } else {
          status.className = "form-status err"; status.textContent = T.formErr || "Something went wrong.";
        }
        status.hidden = false;
        btn.disabled = false; btn.textContent = label; status.focus();
      });
    });
  }

  /* ---------- analytics: Clarity always (deferred), Google Analytics only after consent ---------- */
  var FIREBASE = {
    apiKey: "AIzaSyCvKDqPjERac1yh0O4BcARsuag6hNN9_1A",
    authDomain: "foodidu-website.firebaseapp.com",
    projectId: "foodidu-website",
    storageBucket: "foodidu-website.appspot.com",
    messagingSenderId: "515131692962",
    appId: "1:515131692962:web:5d81b9e165181ec80bc4fb"
  };
  // Google Analytics 4 web stream "Foodidu" in the owner's own Analytics account, loaded with gtag.js. (The property
  // linked to this Firebase project is in an account the owner cannot reach, so the Firebase Analytics SDK is not used.)
  var GA_ID = "G-L576K4KB23";
  // App Check (reCAPTCHA v3) proves database writes come from foodidu.com. Paste the reCAPTCHA v3 *site* key here
  // once it is registered in Firebase console > App Check; while empty, App Check stays off.
  var APP_CHECK_SITE_KEY = "";
  var SDK = "https://www.gstatic.com/firebasejs/9.22.0/";
  var gaOn = false, coreLoading = null, queue = [];

  function settle(ps) {   // like Promise.allSettled, as true/false per promise
    return Promise.all(ps.map(function (p) { return p.then(function () { return true; }, function () { return false; }); }));
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, ms); })]);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function whenIdle(fn) { ("requestIdleCallback" in window) ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 2500); }

  function loadClarity() {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", "tpp88vrm19");
  }

  function visitorId() {
    var id = LS.get("visitorId");
    if (!id) {
      var fp = "";
      try { fp = btoa(navigator.userAgent + screen.width + Intl.DateTimeFormat().resolvedOptions().timeZone).replace(/[^a-zA-Z0-9]/g, "").substr(0, 8); } catch (e) {}
      id = "visitor_" + fp + "_" + Date.now();
      LS.set("visitorId", id);
    }
    return id;
  }
  function userId() {
    var data = {};
    try { data = JSON.parse(LS.get("userData") || "{}"); } catch (e) {}
    if (!data.userId) { data.userId = "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(); LS.set("userData", JSON.stringify(data)); }
    return data.userId;
  }
  function deviceInfo() {
    var ua = navigator.userAgent;
    var type = /tablet|ipad|playbook|silk/i.test(ua) ? "tablet" : (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua) ? "mobile" : "desktop");
    var os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "unknown";
    var browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "unknown";
    return {
      type: type, os: os, browser: browser,
      screenWidth: screen.width, screenHeight: screen.height,
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
      language: navigator.language, userAgent: ua
    };
  }
  function ipLocation() {
    return fetch("https://ipapi.co/json/").then(function (r) { return r.json(); }).then(function (d) {
      return { type: "ip_based", country: d.country_name || null, countryCode: d.country_code || null, region: d.region || null, city: d.city || null, timezone: d.timezone || null };
    }).catch(function () { return { type: "none" }; });
  }

  // Firebase app + Firestore (+ App Check): needed by the consent record and the partner form only.
  function loadCore() {
    if (coreLoading) return coreLoading;
    coreLoading = loadScript(SDK + "firebase-app-compat.js")
      .then(function () {
        var more = [loadScript(SDK + "firebase-firestore-compat.js")];
        if (APP_CHECK_SITE_KEY) more.push(loadScript(SDK + "firebase-app-check-compat.js"));
        return Promise.all(more);
      })
      .then(function () {
        window.firebase.initializeApp(FIREBASE);
        if (APP_CHECK_SITE_KEY) window.firebase.appCheck().activate(new window.firebase.appCheck.ReCaptchaV3Provider(APP_CHECK_SITE_KEY), true);
        return window.firebase.firestore();
      });
    coreLoading.catch(function () { coreLoading = null; });   // a failed load (offline) can be retried
    return coreLoading;
  }

  // Google Analytics: only after the visitor accepts analytics cookies. The config call also sends this page's page_view.
  function loadAnalytics() {
    if (gaOn) return;
    gaOn = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { user_id: userId(), page_language: doc.lang });
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + GA_ID).catch(function () {});
    queue.splice(0).forEach(function (q) { track(q[0], q[1]); });
  }

  function consent() { try { return JSON.parse(LS.get("cookieConsent") || "null"); } catch (e) { return null; } }

  function track(name, params) {
    params = params || {};
    params.page_path = location.pathname;
    params.page_language = doc.lang;
    if (window.clarity) { try { window.clarity("event", name); } catch (e) {} }
    var c = consent();
    if (!c || !c.analytics) return;
    if (!gaOn) { queue.push([name, params]); return; }
    try { window.gtag("event", name, params); } catch (e) {}
  }

  function saveConsent(c) {
    LS.set("cookieConsent", JSON.stringify(c));
    if (!c.analytics) return;
    loadAnalytics();
    loadCore().then(function (db) {
      return ipLocation().then(function (loc) {
        var rec = {
          visitorId: visitorId(), userId: userId(),
          essential: true, analytics: c.analytics, marketing: c.marketing,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          deviceInfo: deviceInfo(), location: loc,
          sessionInfo: { referrer: document.referrer || "direct", path: location.pathname, url: location.href, title: document.title, language: doc.lang }
        };
        return db.collection("cookieConsent").doc(rec.visitorId).set(rec, { merge: true }).then(function () {
          return db.collection("userSessions").add(Object.assign({}, rec, { sessionId: "session_" + Date.now(), eventType: "consent_given" }));
        });
      });
    }).catch(function () {});
  }

  var banner = document.getElementById("cookie");
  function showBanner() { if (banner) banner.hidden = false; }
  if (banner) {
    banner.querySelector("[data-accept]").addEventListener("click", function () {
      banner.hidden = true;
      saveConsent({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() });
    });
    banner.querySelector("[data-decline]").addEventListener("click", function () {
      banner.hidden = true;
      saveConsent({ essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() });
    });
  }
  document.querySelectorAll("[data-cookie-settings]").forEach(function (b) {
    b.addEventListener("click", function () { LS.del("cookieConsent"); showBanner(); });
  });

  window.addEventListener("load", function () {
    whenIdle(function () {
      loadClarity();
      var c = consent();
      if (!c) setTimeout(showBanner, 1200);
      else if (c.analytics) loadAnalytics();
    });
  });
})();
