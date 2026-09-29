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
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = menuBtn.getAttribute("aria-expanded") !== "true";
      menuBtn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { menuBtn.click(); menuBtn.focus(); }
    });
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
      track("promo_code_copied", { brand: btn.getAttribute("data-brand") || "", code: code });
    }, function () {
      var codeEl = btn.querySelector(".code");
      if (codeEl && window.getSelection) { var sel = window.getSelection(); sel.removeAllRanges(); var rg = document.createRange(); rg.selectNodeContents(codeEl); sel.addRange(rg); }
      showToast(T.copyFail || "Copy failed, select the code manually");
    });
  });

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
                 (state.region === "all" || it.getAttribute("data-region") === state.region) &&
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
    var norm = function (s) { return (s || "").toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي"); };
    var render = function () {
      var q = norm(input.value.trim());
      active = -1;
      if (!q) { box.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
      var hits = DATA.brands.filter(function (b) { return norm(b.s).indexOf(q) !== -1; }).slice(0, 6);
      box.innerHTML = "";
      if (!hits.length) {
        var li = document.createElement("li");
        li.className = "r-empty"; li.textContent = T.noResults || "No codes found";
        box.appendChild(li);
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
      var body = new URLSearchParams();
      new FormData(vform).forEach(function (v, k) { body.append(k, v); });
      body.append("language", doc.lang);
      fetch(DATA.formUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
        .then(function (r) { return r.text(); })
        .then(function () {
          status.className = "form-status ok"; status.textContent = T.formOk || "Thanks!";
          status.hidden = false; vform.reset();
          track("vendor_application_submitted", {});
        })
        .catch(function () {
          status.className = "form-status err"; status.textContent = T.formErr || "Something went wrong.";
          status.hidden = false;
        })
        .finally(function () { btn.disabled = false; btn.textContent = label; status.focus(); });
    });
  }

  /* ---------- analytics: Clarity always (deferred), Firebase only after consent ---------- */
  var FIREBASE = {
    apiKey: "AIzaSyCvKDqPjERac1yh0O4BcARsuag6hNN9_1A",
    authDomain: "foodidu-website.firebaseapp.com",
    projectId: "foodidu-website",
    storageBucket: "foodidu-website.appspot.com",
    messagingSenderId: "515131692962",
    appId: "1:515131692962:web:5d81b9e165181ec80bc4fb"
  };
  var SDK = "https://www.gstatic.com/firebasejs/9.22.0/";
  var fb = null, fbLoading = null, queue = [];

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

  function loadFirebase() {
    if (fbLoading) return fbLoading;
    fbLoading = loadScript(SDK + "firebase-app-compat.js")
      .then(function () { return Promise.all([loadScript(SDK + "firebase-firestore-compat.js"), loadScript(SDK + "firebase-analytics-compat.js")]); })
      .then(function () {
        window.firebase.initializeApp(FIREBASE);
        fb = { db: window.firebase.firestore(), analytics: window.firebase.analytics() };
        fb.analytics.setUserId(userId());
        fb.analytics.logEvent("page_view", { page_path: location.pathname, page_title: document.title, page_language: doc.lang });
        queue.splice(0).forEach(function (q) { track(q[0], q[1]); });
        return fb;
      })
      .catch(function () { fb = null; });
    return fbLoading;
  }

  function consent() { try { return JSON.parse(LS.get("cookieConsent") || "null"); } catch (e) { return null; } }

  function track(name, params) {
    params = params || {};
    params.page_path = location.pathname;
    params.page_language = doc.lang;
    if (window.clarity) { try { window.clarity("event", name); } catch (e) {} }
    var c = consent();
    if (!c || !c.analytics) return;
    if (!fb) { queue.push([name, params]); return; }
    try { fb.analytics.logEvent(name, params); } catch (e) {}
  }

  function saveConsent(c) {
    LS.set("cookieConsent", JSON.stringify(c));
    if (!c.analytics) return;
    loadFirebase().then(function (f) {
      if (!f) return;
      return ipLocation().then(function (loc) {
        var rec = {
          visitorId: visitorId(), userId: userId(),
          essential: true, analytics: c.analytics, marketing: c.marketing,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          deviceInfo: deviceInfo(), location: loc,
          sessionInfo: { referrer: document.referrer || "direct", path: location.pathname, url: location.href, title: document.title, language: doc.lang }
        };
        return f.db.collection("cookieConsent").doc(rec.visitorId).set(rec, { merge: true }).then(function () {
          return f.db.collection("userSessions").add(Object.assign({}, rec, { sessionId: "session_" + Date.now(), eventType: "consent_given" }));
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
      else if (c.analytics) loadFirebase();
    });
  });
})();
