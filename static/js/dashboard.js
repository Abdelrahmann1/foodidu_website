/* Foodidu dashboard (/dashboard/).
   - Content and health: from the data the build embeds (#dash-data), shown to anyone who has the link.
   - Visitors (Google Analytics 4), Google search (Search Console) and partner applications (Firestore): only after the owner
     signs in with Google. Google's own permissions protect GA/GSC data; firestore.rules lets only the admin read applications. */
(() => {
  "use strict";
  const D = JSON.parse(document.getElementById("dash-data").textContent);
  const FIREBASE = {
    apiKey: "AIzaSyCvKDqPjERac1yh0O4BcARsuag6hNN9_1A", authDomain: "foodidu-website.firebaseapp.com", projectId: "foodidu-website",
    storageBucket: "foodidu-website.appspot.com", messagingSenderId: "515131692962", appId: "1:515131692962:web:5d81b9e165181ec80bc4fb"
  };
  const SDK = "https://www.gstatic.com/firebasejs/9.22.0/";
  const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/webmasters.readonly"];
  const PROJECT = "foodidu-website";
  const EVENTS = ["promo_code_copied", "brand_link_click", "restaurant_order_click", "restaurant_call_click", "featured_view", "featured_click",
    "app_download_click", "search", "search_no_results", "vendor_application_submitted", "day_deal_source_click"];
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const store = {
    get: (k, s) => { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: (k, v, s) => { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
    del: (k, s) => { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) {} }
  };

  /* ---------- small helpers (all text goes in with textContent) ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
    return n;
  }
  const num = (n) => (n == null || isNaN(n) ? "–" : Math.round(n).toLocaleString("en-US"));
  const pct = (n) => (n == null || !isFinite(n) ? "–" : (Math.round(n * 1000) / 10).toLocaleString("en-US") + "%");
  const today = () => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const days = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  const arDate = (ymd) => { if (!ymd) return "–"; const [y, m, d] = ymd.split("-"); return `${+d} ${MONTHS[m - 1]} ${y}`; };
  const shiftDate = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const chip = (cls, label) => el("span", { class: "chip-s " + cls, text: label });
  const card = (title, cap, ...body) => el("div", { class: "dash-card" }, el("h3", { text: title }), cap ? el("p", { class: "cap", text: cap }) : null, ...body);
  const head = (id, title, sub) => el("div", { class: "dash-h" }, el("h2", { id: "h-" + id, text: title }), sub ? el("p", { text: sub }) : null);
  const ext = (href, text) => el("a", { href, target: "_blank", rel: "noopener", text });
  function table(cols, rows, opts = {}) {
    if (!rows.length) return el("p", { class: "empty", text: opts.empty || "مفيش بيانات لسه." });
    return el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" },
      el("thead", null, el("tr", null, cols.map((c) => el("th", { class: c.num ? "num" : null, text: c.label })))),
      el("tbody", null, rows.map((r) => el("tr", null, cols.map((c) => { const v = c.get(r); return el("td", { class: c.num ? "num" : null }, v && v.nodeType ? v : String(v ?? "–")); }))))));
  }
  const asTable = (cols, rows) => el("details", { class: "as-table" }, el("summary", { text: "عرض كجدول" }), table(cols, rows));
  function tile(label, value, opts = {}) {
    const t = el("div", { class: "tile" }, el("div", { class: "tile-label", text: label }), el("div", { class: "tile-value", text: value }));
    if (opts.sub) t.append(el("div", { class: "tile-sub", text: opts.sub }));
    if (opts.prev != null && opts.cur != null) {
      const d = opts.prev ? (opts.cur - opts.prev) / opts.prev : (opts.cur ? 1 : 0);
      const dir = Math.abs(d) < 0.005 ? "flat" : d > 0 ? "up" : "down";
      const good = opts.lowerIsBetter ? dir === "down" : dir === "up";
      t.append(el("div", { class: "delta " + (dir === "flat" ? "flat" : good ? "up" : "down"), title: "مقارنة بالفترة اللي قبلها" },
        el("span", { dir: "ltr", text: (dir === "up" ? "▲ " : dir === "down" ? "▼ " : "■ ") + (opts.prev ? pct(Math.abs(d)) : (opts.cur ? "جديد" : "0%")) }), el("span", { class: "delta-c", text: "عن الفترة اللي قبلها" })));
    }
    return t;
  }

  /* ---------- charts ---------- */
  // Horizontal bars for magnitude (one hue). Value at the tip; the table view mirrors it.
  function bars(items, opts = {}) {
    items = items.filter((i) => i.value > 0).slice(0, opts.limit || 12);
    if (!items.length) return el("p", { class: "empty", text: opts.empty || "مفيش بيانات في الفترة دي." });
    const max = Math.max(...items.map((i) => i.value));
    const list = el("ul", { class: "bars" }, items.map((i) => el("li", { title: `${i.label}: ${num(i.value)}` },
      el("span", { class: "bl", text: i.label }),
      el("span", { class: "bt" }, el("span", { class: "bb", style: `width:calc((100% - 56px) * ${i.value / max})` }), el("span", { class: "bv", text: num(i.value) + (i.suffix || "") })))));
    return el("div", null, list, asTable([{ label: opts.labelName || "الاسم", get: (r) => r.label }, { label: opts.valueName || "العدد", num: true, get: (r) => num(r.value) }], items));
  }
  // Single-series line (no legend: the card title names it). Crosshair snaps to the nearest day; tooltip shows value then date.
  function lineChart(points, opts = {}) {
    if (!points.length || points.every((p) => !p.y)) return el("p", { class: "empty", text: "مفيش بيانات في الفترة دي." });
    const box = el("div", { class: "lc" });
    let lastW = 0;
    const redraw = () => { const w = Math.round(box.clientWidth); if (w && w !== lastW) { lastW = w; drawLine(box, points, opts, w); } };
    if ("ResizeObserver" in window) new ResizeObserver(redraw).observe(box);   // drawn at the real width, so text never stretches
    setTimeout(redraw, 0);   // first draw as soon as the card is on the page
    return el("div", null, box, asTable([{ label: "اليوم", get: (r) => r.label }, { label: opts.valueName || "العدد", num: true, get: (r) => num(r.y) }], points));
  }
  function drawLine(box, points, opts, width) {
    const W = width, H = width < 500 ? 180 : 220, L = 38, R = 12, T = 12, B = 26;
    const max = Math.max(...points.map((p) => p.y)), top = niceMax(max);
    const x = (i) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const ns = "http://www.w3.org/2000/svg";
    const s = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": opts.label || "", dir: "ltr" });
    const g = s("g", { class: "grid" }), ax = s("g", { class: "axis" });
    for (let k = 0; k <= 4; k++) {
      const v = (top * k) / 4, yy = y(v);
      g.append(s("line", { x1: L, x2: W - R, y1: yy, y2: yy }));
      const t = s("text", { x: L - 6, y: yy + 4, "text-anchor": "end" }); t.textContent = num(v); ax.append(t);
    }
    const step = Math.max(1, Math.ceil(points.length / 6));
    points.forEach((p, i) => { if (i % step === 0 || i === points.length - 1) { const t = s("text", { x: x(i), y: H - 6, "text-anchor": "middle" }); t.textContent = p.short; ax.append(t); } });
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
    svg.append(g, s("path", { class: "ar", d: `${path}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` }), s("path", { class: "ln", d: path }), ax);
    const xh = s("line", { class: "xh", y1: T, y2: H - B, visibility: "hidden" }), dot = s("circle", { class: "dot", r: 5, visibility: "hidden" });
    svg.append(xh, dot);
    const tip = el("div", { class: "tip", hidden: true });
    box.replaceChildren(svg, tip);
    const show = (i) => {
      const p = points[i], px = x(i), py = y(p.y);
      xh.setAttribute("x1", px); xh.setAttribute("x2", px); xh.setAttribute("visibility", "visible");
      dot.setAttribute("cx", px); dot.setAttribute("cy", py); dot.setAttribute("visibility", "visible");
      const r = svg.getBoundingClientRect(), sx = r.width / W, sy = r.height / H;
      tip.replaceChildren(el("b", { text: num(p.y) + (opts.unit || "") }), el("span", { text: p.label }));
      tip.style.left = Math.min(Math.max(px * sx, 60), r.width - 60) + "px"; tip.style.top = py * sy + "px"; tip.hidden = false;
    };
    const hide = () => { xh.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); tip.hidden = true; };
    svg.addEventListener("pointermove", (e) => { const r = svg.getBoundingClientRect(); const vx = ((e.clientX - r.left) / r.width) * W; let best = 0; points.forEach((_, i) => { if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i; }); show(best); });
    svg.addEventListener("pointerleave", hide);
    svg.setAttribute("tabindex", "0");
    let fi = points.length - 1;
    svg.addEventListener("focus", () => show(fi)); svg.addEventListener("blur", hide);
    svg.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { fi = Math.max(0, Math.min(points.length - 1, fi + (e.key === "ArrowRight" ? 1 : -1))); show(fi); e.preventDefault(); } });
  }
  function niceMax(v) { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }
  function share(parts) {
    const total = parts.reduce((a, p) => a + p.value, 0);
    if (!total) return el("p", { class: "empty", text: "مفيش بيانات في الفترة دي." });
    return el("div", null,
      el("div", { class: "share", role: "img", "aria-label": parts.map((p) => `${p.label} ${pct(p.value / total)}`).join("، ") },
        parts.filter((p) => p.value).map((p) => el("i", { style: `flex:${p.value};background:${p.color}`, title: `${p.label}: ${num(p.value)} (${pct(p.value / total)})` }))),
      el("div", { class: "legend" }, parts.map((p) => el("span", { style: `--k:${p.color}`, text: `${p.label}: ${num(p.value)} (${pct(p.value / total)})` }))));
  }

  /* ---------- 1. overview + 2. content (from the build) ---------- */
  const T0 = today();
  const nameOf = {};
  D.codes.forEach((c) => { nameOf[c.key] = c.brand; });
  D.restaurants.forEach((r) => { nameOf[r.key] = r.name; });
  function codeState(c) {
    if (!c.checked) return { cls: "info", label: "مش متجرب", rank: 3 };
    const age = days(c.checked, T0);
    if (age > 45) return { cls: "serious", label: `من ${age} يوم`, rank: 1 };
    if (age > 30) return { cls: "warning", label: `من ${age} يوم`, rank: 2 };
    return { cls: "good", label: `من ${age} يوم`, rank: 4 };
  }
  function alerts() {
    const out = [];
    const stale = D.codes.filter((c) => c.checked && days(c.checked, T0) > 30);
    if (stale.length) out.push({ s: stale.some((c) => days(c.checked, T0) > 45) ? "serious" : "warning", t: `${stale.length} كود محتاج يتجرب تاني`, d: [...new Set(stale.map((c) => c.brand))].join("، ") + ". بعد 45 يوم من آخر تجربة بتختفي علامة \"تم التحقق\" والشهر من العنوان." });
    const never = D.codes.filter((c) => !c.checked);
    if (never.length) out.push({ s: "info", t: `${never.length} كود ما اتجربش لسه`, d: [...new Set(never.map((c) => c.brand))].join("، ") + ". ظاهرين في آخر القوايم من غير \"تم التحقق\"." });
    D.restaurants.forEach((r) => {
      if (!r.until) return;
      const left = days(T0, r.until);
      if (left < 0) out.push({ s: "critical", t: `عروض ${r.name} انتهت من ${-left} يوم`, d: "لسه ظاهرة على الموقع. حدّثها أو شيلها من data/restaurant-offers.json." });
      else if (left <= 14) out.push({ s: "warning", t: `عروض ${r.name} بتخلص بعد ${left} يوم`, d: `سارية حتى ${arDate(r.until)}.` });
    });
    D.deals.forEach((d) => { const age = days(d.checked, T0); if (age > 30) out.push({ s: "warning", t: `عرض ${d.name} (${d.days.join("/")}) محتاج مراجعة`, d: `آخر مراجعة من ${age} يوم.` }); });
    if (D.featured) {
      const left = D.featured.until ? days(T0, D.featured.until) : null;
      if (!D.featured.active) out.push({ s: "info", t: "مساحة \"عرض مميز\" مقفولة", d: "فعّلها من data/featured.json لما يبقى عندك شريك." });
      else if (left != null && left < 0) out.push({ s: "info", t: "مساحة \"عرض مميز\" فاضية", d: `عرض ${D.featured.partner} خلص في ${arDate(D.featured.until)} واتشال لوحده. المساحة متاحة لشريك جديد.` });
      else if (left != null && left <= 7) out.push({ s: "warning", t: `عرض مميز: ${D.featured.partner} بيخلص بعد ${left} يوم`, d: "جهّز الشريك اللي بعده." });
    }
    if (!D.appCheck) out.push({ s: "warning", t: "حماية App Check لسه مش شغالة", d: "محتاجة مفتاح reCAPTCHA v3. التفاصيل في قسم الأدوات." });
    out.sort((a, b) => ["critical", "serious", "warning", "info", "good"].indexOf(a.s) - ["critical", "serious", "warning", "info", "good"].indexOf(b.s));
    if (!out.length) out.push({ s: "good", t: "كل حاجة تمام", d: "مفيش أكواد قديمة ولا عروض قربت تخلص." });
    return out;
  }
  function renderOverview() {
    const brands = new Set(D.codes.map((c) => c.key)).size;
    const checked = D.codes.filter((c) => c.checked && days(c.checked, T0) <= 45).length;
    const menuOffers = D.restaurants.reduce((a, r) => a + r.offers, 0);
    const icons = { critical: "×", serious: "!", warning: "!", info: "i", good: "✓" };
    const sec = $("#overview");
    sec.replaceChildren(
      head("overview", "نظرة عامة", "كل اللي على الموقع دلوقتي، وإيه اللي محتاج انتباهك."),
      el("div", { class: "tiles" },
        tile("البراندات", num(brands)), tile("الأكواد", num(D.codes.length), { sub: `${checked} متجرب · ${D.codes.length - checked} لأ` }),
        tile("عروض المنيو", num(menuOffers), { sub: `${D.restaurants.length} مطعم` }), tile("عروض الأيام", num(D.deals.length)),
        tile("صفحات الموقع", num(D.pages), { sub: "عربي + إنجليزي" }), el("div", { class: "tile", id: "tile-users" }, el("div", { class: "tile-label", text: "الزوار" }), el("div", { class: "tile-value", text: "–" }), el("div", { class: "tile-sub", text: "سجّل دخول عشان تشوفهم" }))),
      el("h3", { class: "dash-sub", text: "محتاج انتباهك" }),
      el("ul", { class: "alerts" }, alerts().map((a) => el("li", { class: a.s }, el("span", { class: "ic", style: "", "aria-hidden": "true", text: icons[a.s] }), el("div", null, el("b", { text: a.t }), el("span", { text: a.d }))))));
  }
  function renderContent() {
    const sec = $("#content");
    const f = D.featured;
    const fLeft = f && f.until ? days(T0, f.until) : null;
    sec.replaceChildren(
      head("content", "المحتوى", "كل الأكواد والعروض اللي على الموقع. التعديل بيكون من ملفات data/ في المشروع."),
      el("h3", { class: "dash-sub", text: `الأكواد (${D.codes.length})` }),
      table([
        { label: "البراند", get: (c) => el("a", { href: c.page, target: "_blank", rel: "noopener", text: c.brand }) },
        { label: "الكود", get: (c) => el("code", { text: c.code }) },
        { label: "العرض", get: (c) => c.offer },
        { label: "النوع", get: (c) => c.category },
        { label: "المنطقة", get: (c) => c.region },
        { label: "حصري", get: (c) => (c.exclusive ? "✓ حصري" : "–") },
        { label: "آخر تجربة", get: (c) => { const s = codeState(c); return el("span", null, chip(s.cls, s.label), c.checked ? el("span", { class: "tile-sub", text: " " + arDate(c.checked) }) : null); } },
        { label: "الترتيب", get: (c) => (c.low ? "في الآخر" : "عادي") }
      ], D.codes),
      el("div", { class: "dash-grid", style: "margin-top:14px" },
        card("عروض المنيو", "من المنيو الرسمي لكل مطعم.", table([
          { label: "المطعم", get: (r) => el("a", { href: r.page, target: "_blank", rel: "noopener", text: r.name }) },
          { label: "العروض", num: true, get: (r) => num(r.offers) },
          { label: "تبدأ من", num: true, get: (r) => num(r.min) + " ج" },
          { label: "سارية حتى", get: (r) => { if (!r.until) return "–"; const left = days(T0, r.until); return chip(left < 0 ? "critical" : left <= 14 ? "warning" : "good", left < 0 ? "انتهت" : `${left} يوم`); } },
          { label: "آخر مراجعة", get: (r) => arDate(r.checked) }
        ], D.restaurants)),
        card("عروض الأيام", "بتنوّر لوحدها في يومها (بتوقيت القاهرة).", table([
          { label: "البراند", get: (d) => d.name }, { label: "العرض", get: (d) => d.title }, { label: "الأيام", get: (d) => d.days.join("، ") },
          { label: "آخر مراجعة", get: (d) => { const age = days(d.checked, T0); return chip(age > 30 ? "warning" : "good", arDate(d.checked)); } }
        ], D.deals)),
        card("مساحة \"عرض مميز\"", "تحت أول الصفحة الرئيسية. بتتعدل من data/featured.json.", f ? table([
          { label: "الشريك", get: () => el("a", { href: f.page, target: "_blank", rel: "noopener", text: f.partner }) },
          { label: "الحالة", get: () => (!f.active ? chip("info", "مقفولة") : fLeft != null && fLeft < 0 ? chip("info", "خلصت") : chip("good", "شغالة")) },
          { label: "لحد", get: () => (f.until ? arDate(f.until) + (fLeft >= 0 ? ` (${fLeft} يوم)` : "") : "مفتوح") },
          { label: "إعلان مدفوع", get: () => (f.sponsored ? "أيوه" : "لأ") }
        ], [f]) : el("p", { class: "empty", text: "مفيش شريك مختار." }))));
  }

  /* ---------- auth ---------- */
  let fb = null, user = null, token = null;
  try { const t = JSON.parse(store.get("fd_dash_token", true) || "null"); if (t && t.exp > Date.now()) token = t.v; } catch (e) {}
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  async function loadFb() {
    if (fb) return fb;
    await loadScript(SDK + "firebase-app-compat.js");
    await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js")]);
    window.firebase.initializeApp(FIREBASE);
    fb = window.firebase;
    return fb;
  }
  async function signIn() {
    try {
      const f = await loadFb();
      const p = new f.auth.GoogleAuthProvider();
      SCOPES.forEach((s) => p.addScope(s));
      p.setCustomParameters({ prompt: "select_account" });
      const res = await f.auth().signInWithPopup(p);
      token = res.credential && res.credential.accessToken;
      if (token) store.set("fd_dash_token", JSON.stringify({ v: token, exp: Date.now() + 55 * 60e3 }), true);
      user = res.user;
      renderAuth(); loadLive();
    } catch (e) { authError(e); }
  }
  async function signOut() {
    store.del("fd_dash_token", true); token = null;
    if (fb) await fb.auth().signOut();
    user = null; renderAuth(); renderGates();
  }
  function authError(e) {
    const code = (e && e.code) || "";
    const msg = code === "auth/operation-not-allowed" ? "تسجيل الدخول بجوجل لسه مش مفعّل في Firebase. شوف خطوات الإعداد في قسم الأدوات."
      : code === "auth/unauthorized-domain" ? `الدومين ${location.hostname} مش مضاف في Firebase (Authentication > Settings > Authorized domains).`
      : code === "auth/popup-blocked" ? "المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة للموقع ده وجرب تاني."
      : code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ? null
      : "ما قدرناش نسجل دخولك: " + ((e && e.message) || code);
    if (msg) alert(msg);
  }
  function renderAuth() {
    const box = $("#dash-auth");
    if (user && token) box.replaceChildren(el("span", { class: "dash-user", text: user.email }), el("button", { class: "dash-btn ghost", type: "button", onclick: signOut, text: "خروج" }));
    else if (user) box.replaceChildren(el("span", { class: "dash-user", text: user.email }), el("button", { class: "dash-btn", type: "button", onclick: signIn, text: "تحديث الاتصال بجوجل" }));
    else box.replaceChildren(el("button", { class: "dash-btn", type: "button", onclick: signIn, text: "تسجيل الدخول بجوجل" }));
  }
  function gate(id, title, sub, why) {
    $("#" + id).replaceChildren(head(id, title, sub), el("div", { class: "gate" }, el("p", { text: why }), el("button", { class: "dash-btn", type: "button", onclick: signIn, text: user ? "تحديث الاتصال بجوجل" : "تسجيل الدخول بجوجل" })));
  }
  function renderGates() {
    gate("visitors", "الزوار", "من Google Analytics.", "سجّل دخول بحساب جوجل اللي عليه Google Analytics بتاع Foodidu عشان تشوف الزوار ونسخ الأكواد والضغطات على كل براند.");
    gate("google", "جوجل", "من Google Search Console.", "سجّل دخول بنفس الحساب اللي عليه Search Console عشان تشوف كلمات البحث وترتيب صفحاتنا.");
    if (!user) gate("applications", "طلبات الشراكة", "من الفورم في صفحة الشركاء.", "طلبات الشراكة فيها بيانات تواصل، فبتظهر بس لحساب الأدمن بعد تسجيل الدخول.");
  }

  /* ---------- date range ---------- */
  let range = +(store.get("fd_dash_range") || 28);
  function renderRange() {
    $("#dash-range").replaceChildren(el("span", { text: "الفترة:" }), ...[7, 28, 90].map((n) => el("button", {
      type: "button", "aria-pressed": String(n === range), text: `آخر ${n} يوم`,
      onclick: () => { range = n; store.set("fd_dash_range", String(n)); renderRange(); loadLive(); }
    })));
  }

  /* ---------- Google APIs ---------- */
  async function api(url, body) {
    const r = await fetch(url, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || r.statusText); e.status = r.status; e.info = j.error || {}; throw e; }
    return j;
  }
  function apiProblem(e, what) {
    const m = (e && e.message) || "";
    if (e && e.status === 401) { store.del("fd_dash_token", true); token = null; renderAuth(); return el("p", { class: "dash-note", text: "انتهت جلسة جوجل (بتستمر ساعة). اضغط \"تحديث الاتصال بجوجل\" فوق." }); }
    const svc = /analyticsdata/.test(m) || /Analytics Data API/i.test(m) ? "analyticsdata.googleapis.com" : /analyticsadmin|Admin API/i.test(m) ? "analyticsadmin.googleapis.com" : /searchconsole|webmasters|Search Console API/i.test(m) ? "searchconsole.googleapis.com" : null;
    if (/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(m + JSON.stringify(e.info || {}))) {
      const id = svc || (what === "gsc" ? "searchconsole.googleapis.com" : "analyticsdata.googleapis.com");
      return el("div", { class: "dash-note" }, `محتاج تفعّل ${id} في Google Cloud (مرة واحدة): `, ext(`https://console.cloud.google.com/apis/library/${id}?project=${PROJECT}`, "افتح الصفحة واضغط Enable"), "، وبعدين حدّث الصفحة.");
    }
    if (e && e.status === 403) return el("p", { class: "dash-note", text: `الحساب ده مالوش صلاحية على ${what === "gsc" ? "Search Console" : "Google Analytics"} بتاع Foodidu. سجّل دخول بالحساب صاحب الموقع.` });
    return el("p", { class: "dash-note", text: "حصلت مشكلة: " + m });
  }

  /* ---------- 3. visitors: Google Analytics 4 ---------- */
  async function gaProperty() {
    const cached = store.get("fd_ga_property");
    if (cached) return cached;
    const s = await api("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200");
    const props = (s.accountSummaries || []).flatMap((a) => (a.propertySummaries || []).map((p) => p.property));
    for (const p of props) {
      const ds = await api(`https://analyticsadmin.googleapis.com/v1beta/${p}/dataStreams`);
      if ((ds.dataStreams || []).some((d) => d.webStreamData && d.webStreamData.measurementId === D.ga.measurementId)) { store.set("fd_ga_property", p); return p; }
    }
    const e = new Error("no-property"); e.status = 404; throw e;
  }
  const ranges = () => [{ startDate: `${range - 1}daysAgo`, endDate: "today", name: "cur" }, { startDate: `${2 * range - 1}daysAgo`, endDate: `${range}daysAgo`, name: "prev" }];
  const inList = (field, values) => ({ filter: { fieldName: field, inListFilter: { values } } });
  function rows(rep) {
    const dh = (rep.dimensionHeaders || []).map((h) => h.name), mh = (rep.metricHeaders || []).map((h) => h.name);
    return (rep.rows || []).map((r) => { const o = {}; dh.forEach((h, i) => { o[h] = r.dimensionValues[i].value; }); mh.forEach((h, i) => { o[h] = +r.metricValues[i].value; }); return o; });
  }
  async function loadVisitors() {
    const sec = $("#visitors");
    sec.classList.add("dash-loading");
    let prop;
    try { prop = await gaProperty(); } catch (e) {
      sec.classList.remove("dash-loading");
      sec.replaceChildren(head("visitors", "الزوار", "من Google Analytics."), e.message === "no-property" ? el("p", { class: "dash-note", text: `ما لقيناش خاصية Google Analytics فيها ${D.ga.measurementId} على الحساب ده. سجّل دخول بالحساب اللي عليه Analytics بتاع Foodidu.` }) : apiProblem(e, "ga"));
      return;
    }
    const cur = [ranges()[0]];
    const reqA = [
      { dateRanges: ranges(), metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] },
      { dateRanges: ranges(), dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], dimensionFilter: inList("eventName", EVENTS) },
      { dateRanges: cur, dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: 400 },
      { dateRanges: cur, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 200 },
      { dateRanges: cur, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }] }
    ];
    const reqB = [
      { dateRanges: cur, dimensions: [{ name: "deviceCategory" }], metrics: [{ name: "activeUsers" }] },
      { dateRanges: cur, dimensions: [{ name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 8 },
      { dateRanges: cur, dimensions: [{ name: "sessionSource" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 }
    ];
    const reqC = [   // these need the custom dimensions registered in GA (brand, search_term, placement)
      { dateRanges: cur, dimensions: [{ name: "eventName" }, { name: "customEvent:brand" }], metrics: [{ name: "eventCount" }], dimensionFilter: inList("eventName", ["promo_code_copied", "brand_link_click", "restaurant_order_click", "restaurant_call_click", "featured_view", "featured_click"]), limit: 500 },
      { dateRanges: cur, dimensions: [{ name: "eventName" }, { name: "customEvent:search_term" }], metrics: [{ name: "eventCount" }], dimensionFilter: inList("eventName", ["search", "search_no_results"]), orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 60 },
      { dateRanges: cur, dimensions: [{ name: "customEvent:placement" }], metrics: [{ name: "eventCount" }], dimensionFilter: inList("eventName", ["promo_code_copied"]) }
    ];
    const run = (requests) => api(`https://analyticsdata.googleapis.com/v1beta/${prop}:batchRunReports`, { requests }).then((r) => r.reports);
    let A, B, C, cErr = null;
    try { [A, B] = await Promise.all([run(reqA), run(reqB)]); } catch (e) {
      sec.classList.remove("dash-loading");
      if (e.status === 403 || e.status === 404) store.del("fd_ga_property");
      sec.replaceChildren(head("visitors", "الزوار", "من Google Analytics."), apiProblem(e, "ga"));
      return;
    }
    try { C = await run(reqC); } catch (e) { cErr = e; }

    const split = (rs, metric) => { const o = { cur: 0, prev: 0 }; rs.forEach((r) => { o[r.dateRange === "prev" ? "prev" : "cur"] += r[metric] || 0; }); return o; };
    const tot = rows(A[0]);
    const T = (m) => split(tot, m);
    const ev = rows(A[1]);
    const E = (names) => { const o = { cur: 0, prev: 0 }; ev.filter((r) => names.includes(r.eventName)).forEach((r) => { o[r.dateRange === "prev" ? "prev" : "cur"] += r.eventCount; }); return o; };
    const users = T("activeUsers"), sessions = T("sessions"), views = T("screenPageViews");
    const copies = E(["promo_code_copied"]), outs = E(["brand_link_click", "restaurant_order_click"]), calls = E(["restaurant_call_click"]);
    const app = E(["app_download_click"]), apps = E(["vendor_application_submitted"]), fv = E(["featured_view"]), fc = E(["featured_click"]);
    const ut = $("#tile-users"); if (ut) ut.replaceWith(tile("الزوار", num(users.cur), { cur: users.cur, prev: users.prev, sub: `آخر ${range} يوم` }));

    const daily = rows(A[2]).map((r) => { const d = `${r.date.slice(0, 4)}-${r.date.slice(4, 6)}-${r.date.slice(6, 8)}`; return { y: r.activeUsers, label: arDate(d), short: `${+r.date.slice(6, 8)}/${+r.date.slice(4, 6)}` }; });
    const pages = rows(A[3]);
    const arViews = pages.filter((p) => p.pagePath.startsWith("/ar/") || p.pagePath === "/ar").reduce((a, p) => a + p.screenPageViews, 0);
    const allViews = pages.reduce((a, p) => a + p.screenPageViews, 0);
    const label = (k) => nameOf[k] || k || "غير معروف";
    const CH = { "Organic Search": "بحث جوجل وغيره", Direct: "دخول مباشر", "Organic Social": "سوشيال ميديا", Referral: "مواقع تانية", "Paid Search": "إعلانات بحث", "Paid Social": "إعلانات سوشيال", Email: "إيميل", Unassigned: "غير محدد", Display: "إعلانات عرض" };
    const DEV = { mobile: "موبايل", desktop: "كمبيوتر", tablet: "تابلت" };

    const parts = [
      head("visitors", "الزوار", `من Google Analytics · آخر ${range} يوم مقارنة بالـ${range} يوم اللي قبلهم. الأرقام من الزوار اللي وافقوا على الكوكيز بس.`),
      el("div", { class: "tiles" },
        tile("الزوار", num(users.cur), users), tile("الجلسات", num(sessions.cur), sessions), tile("مشاهدات الصفحات", num(views.cur), views),
        tile("نسخ الأكواد", num(copies.cur), copies), tile("زيارات لمواقع البراندات", num(outs.cur), outs), tile("اتصالات بالمطاعم", num(calls.cur), calls),
        tile("تحميل التطبيق", num(app.cur), app), tile("طلبات الشراكة", num(apps.cur), apps)),
      el("div", { class: "dash-grid", style: "margin-top:14px" },
        el("div", { class: "dash-card wide" }, el("h3", { text: "الزوار يومياً" }), el("p", { class: "cap", text: "حرّك الماوس على الخط عشان تشوف كل يوم." }), lineChart(daily, { label: "الزوار يومياً", valueName: "الزوار" })),
        card("مصادر الزيارات", "الجلسات حسب المصدر.", bars(rows(A[4]).map((r) => ({ label: CH[r.sessionDefaultChannelGroup] || r.sessionDefaultChannelGroup, value: r.sessions })), { labelName: "المصدر", valueName: "الجلسات" })),
        card("أهم المواقع اللي بتبعتلنا زوار", "الجلسات حسب الموقع.", bars(rows(B[2]).map((r) => ({ label: r.sessionSource, value: r.sessions })), { labelName: "الموقع", valueName: "الجلسات" })),
        card("الأجهزة", null, bars(rows(B[0]).map((r) => ({ label: DEV[r.deviceCategory] || r.deviceCategory, value: r.activeUsers })), { labelName: "الجهاز", valueName: "الزوار" })),
        card("الدول", null, bars(rows(B[1]).map((r) => ({ label: r.country, value: r.activeUsers })), { labelName: "الدولة", valueName: "الزوار" })),
        card("لغة الصفحات", "مشاهدات الصفحات العربي مقابل الإنجليزي.", share([{ label: "عربي", value: arViews, color: "var(--series-1)" }, { label: "إنجليزي", value: allViews - arViews, color: "var(--series-2)" }])),
        card("مساحة \"عرض مميز\"", "عدد مرات ظهور البانر والضغط عليه.", el("div", { class: "tiles" }, tile("ظهر", num(fv.cur)), tile("اتضغط", num(fc.cur)), tile("نسبة الضغط", fv.cur ? pct(fc.cur / fv.cur) : "–")))),
      el("h3", { class: "dash-sub", text: "أهم الصفحات" }),
      table([{ label: "الصفحة", get: (r) => el("a", { href: r.pagePath, target: "_blank", rel: "noopener", class: "ltr", text: r.pagePath }) }, { label: "المشاهدات", num: true, get: (r) => num(r.screenPageViews) }, { label: "الزوار", num: true, get: (r) => num(r.activeUsers) }], pages.slice(0, 15))
    ];
    // per-brand numbers (the partner report) and searches: need the custom dimensions
    if (cErr) {
      const needs = /customEvent|dimension/i.test(cErr.message || "");
      parts.push(el("h3", { class: "dash-sub", text: "تقرير كل براند وكلمات البحث" }), needs ? el("div", { class: "dash-note" },
        "عشان يظهر عدد نسخ الكود والضغطات لكل براند وكلمات البحث، سجّل الخانات دي مرة واحدة في Google Analytics: ",
        el("b", { text: "Admin > Custom definitions > Create custom dimension" }), " (Scope: Event) بالأسماء: ", el("code", { text: "brand, placement, code, sponsored, store, deal, search_term" }),
        ". الأرقام بتبدأ تتحسب من يوم التسجيل.") : apiProblem(cErr, "ga"));
    } else {
      const byBrand = {};
      rows(C[0]).forEach((r) => { const k = r["customEvent:brand"]; if (!k || k === "(not set)") return; (byBrand[k] = byBrand[k] || { copies: 0, outs: 0, calls: 0, views: 0, clicks: 0 });
        const b = byBrand[k]; if (r.eventName === "promo_code_copied") b.copies += r.eventCount; else if (r.eventName === "restaurant_call_click") b.calls += r.eventCount; else if (r.eventName === "featured_view") b.views += r.eventCount; else if (r.eventName === "featured_click") b.clicks += r.eventCount; else b.outs += r.eventCount; });
      const list = Object.entries(byBrand).map(([k, v]) => ({ key: k, name: label(k), ...v })).sort((a, b) => b.copies + b.outs - (a.copies + a.outs));
      const searches = rows(C[1]);
      const PL = { home_hero: "أول الصفحة الرئيسية", page_top: "أول صفحة الكود", sidebar: "الجنب", page: "وسط الصفحة", featured: "عرض مميز", header: "القايمة", footer: "آخر الصفحة", app_section: "قسم التطبيق" };
      parts.push(
        el("h3", { class: "dash-sub", text: "تقرير كل براند (ده اللي تبعته للشريك)" }),
        el("div", { class: "dash-grid" },
          card("نسخ الأكواد حسب البراند", null, bars(list.map((b) => ({ label: b.name, value: b.copies })), { labelName: "البراند", valueName: "نسخ" })),
          card("الضغط على لينك البراند", "زيارات موقع البراند أو الطلب من المطعم.", bars(list.map((b) => ({ label: b.name, value: b.outs })), { labelName: "البراند", valueName: "ضغطات" })),
          card("الكود اتنسخ منين", "مكان الزرار في الصفحة.", bars(rows(C[2]).map((r) => ({ label: PL[r["customEvent:placement"]] || r["customEvent:placement"], value: r.eventCount })), { labelName: "المكان", valueName: "نسخ" }))),
        table([{ label: "البراند", get: (b) => b.name }, { label: "نسخ الكود", num: true, get: (b) => num(b.copies) }, { label: "ضغطات على لينك البراند", num: true, get: (b) => num(b.outs) },
          { label: "اتصالات", num: true, get: (b) => num(b.calls) }, { label: "ظهور في عرض مميز", num: true, get: (b) => num(b.views) }, { label: "ضغط على عرض مميز", num: true, get: (b) => num(b.clicks) }], list, { empty: "لسه مفيش ضغطات مسجلة لأي براند في الفترة دي." }),
        el("div", { class: "dash-grid", style: "margin-top:14px" },
          card("بيدوّروا على إيه", "أكتر كلمات بحث في الموقع.", bars(searches.filter((r) => r.eventName === "search").map((r) => ({ label: r["customEvent:search_term"], value: r.eventCount })), { labelName: "الكلمة", valueName: "مرات" })),
          card("بحث ما لقاش نتيجة", "براندات الناس عايزاها ومش عندنا: فرص شراكة.", bars(searches.filter((r) => r.eventName === "search_no_results").map((r) => ({ label: r["customEvent:search_term"], value: r.eventCount })), { labelName: "الكلمة", valueName: "مرات" }))));
    }
    sec.replaceChildren(...parts);
    sec.classList.remove("dash-loading");
  }

  /* ---------- 4. Google search: Search Console ---------- */
  async function gscSite() {
    const cached = store.get("fd_gsc_site");
    if (cached) return cached;
    const s = await api("https://searchconsole.googleapis.com/webmasters/v3/sites");
    const list = (s.siteEntry || []).filter((x) => x.permissionLevel !== "siteUnverifiedUser").map((x) => x.siteUrl);
    const pick = list.find((u) => u === D.gsc.site) || list.find((u) => /foodidu\.com/.test(u));
    if (!pick) { const e = new Error("no-site"); e.status = 404; throw e; }
    store.set("fd_gsc_site", pick);
    return pick;
  }
  async function loadGoogle() {
    const sec = $("#google");
    sec.classList.add("dash-loading");
    let site;
    try { site = await gscSite(); } catch (e) {
      sec.classList.remove("dash-loading");
      sec.replaceChildren(head("google", "جوجل", "من Google Search Console."), e.message === "no-site" ? el("p", { class: "dash-note", text: "ما لقيناش foodidu.com في Search Console على الحساب ده." }) : apiProblem(e, "gsc"));
      return;
    }
    const end = today(), start = shiftDate(end, -(range - 1)), pEnd = shiftDate(start, -1), pStart = shiftDate(pEnd, -(range - 1));
    const q = (body) => api(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, body);
    let tot, prev, daily, queries, pagesR, countries;
    try {
      [tot, prev, daily, queries, pagesR, countries] = await Promise.all([
        q({ startDate: start, endDate: end }), q({ startDate: pStart, endDate: pEnd }),
        q({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 500 }),
        q({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 50 }),
        q({ startDate: start, endDate: end, dimensions: ["page"], rowLimit: 50 }),
        q({ startDate: start, endDate: end, dimensions: ["country"], rowLimit: 8 })]);
    } catch (e) {
      sec.classList.remove("dash-loading");
      if (e.status === 403 || e.status === 404) store.del("fd_gsc_site");
      sec.replaceChildren(head("google", "جوجل", "من Google Search Console."), apiProblem(e, "gsc"));
      return;
    }
    const t = (tot.rows || [])[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }, p = (prev.rows || [])[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const pts = (m) => (daily.rows || []).map((r) => ({ y: r[m], label: arDate(r.keys[0]), short: `${+r.keys[0].slice(8, 10)}/${+r.keys[0].slice(5, 7)}` }));
    const qRows = queries.rows || [], pRows = pagesR.rows || [];
    const low = qRows.filter((r) => r.impressions >= 20 && r.ctr < 0.02);
    const COUNTRY = { egy: "مصر", sau: "السعودية", are: "الإمارات", kwt: "الكويت", qat: "قطر", bhr: "البحرين", omn: "عمان", usa: "أمريكا", gbr: "بريطانيا", deu: "ألمانيا" };
    sec.replaceChildren(
      head("google", "جوجل", `من Search Console · آخر ${range} يوم. بيانات جوجل بتتأخر يومين أو تلاتة.`),
      el("div", { class: "tiles" },
        tile("الضغطات من جوجل", num(t.clicks), { cur: t.clicks, prev: p.clicks }), tile("مرات الظهور", num(t.impressions), { cur: t.impressions, prev: p.impressions }),
        tile("نسبة الضغط", pct(t.ctr), { cur: t.ctr, prev: p.ctr }), tile("متوسط الترتيب", t.position ? t.position.toFixed(1) : "–", { cur: t.position, prev: p.position, lowerIsBetter: true, sub: "كل ما يقل أحسن" })),
      el("div", { class: "dash-grid", style: "margin-top:14px" },
        card("الضغطات يومياً", null, lineChart(pts("clicks"), { label: "الضغطات من جوجل يومياً", valueName: "الضغطات" })),
        card("مرات الظهور يومياً", null, lineChart(pts("impressions"), { label: "مرات الظهور يومياً", valueName: "مرات الظهور" })),
        card("الدول", "الضغطات حسب الدولة.", bars((countries.rows || []).map((r) => ({ label: COUNTRY[r.keys[0]] || r.keys[0].toUpperCase(), value: r.clicks })), { labelName: "الدولة", valueName: "الضغطات" }))),
      el("h3", { class: "dash-sub", text: "الناس بيدوّروا بإيه وبيلاقونا" }),
      table([{ label: "كلمة البحث", get: (r) => r.keys[0] }, { label: "ضغطات", num: true, get: (r) => num(r.clicks) }, { label: "ظهور", num: true, get: (r) => num(r.impressions) },
        { label: "نسبة الضغط", num: true, get: (r) => pct(r.ctr) }, { label: "الترتيب", num: true, get: (r) => r.position.toFixed(1) }], qRows.slice(0, 25), { empty: "جوجل لسه ما سجلش كلمات بحث. ارجع بعد كام يوم." }),
      low.length ? el("p", { class: "dash-note", style: "margin-top:10px", text: `${low.length} كلمة بتظهر فيها كتير والناس مش بتضغط (أقل من 2%): ${low.slice(0, 6).map((r) => r.keys[0]).join("، ")}. دي فرصة نحسّن عنوان ووصف الصفحة بتاعتها.` }) : null,
      el("h3", { class: "dash-sub", text: "أكتر صفحات بتجيب زيارات من جوجل" }),
      table([{ label: "الصفحة", get: (r) => { const u = r.keys[0].replace(/^https?:\/\/[^/]+/, ""); return el("a", { href: r.keys[0], target: "_blank", rel: "noopener", class: "ltr", text: u || "/" }); } },
        { label: "ضغطات", num: true, get: (r) => num(r.clicks) }, { label: "ظهور", num: true, get: (r) => num(r.impressions) }, { label: "الترتيب", num: true, get: (r) => r.position.toFixed(1) }], pRows.slice(0, 20)));
    sec.classList.remove("dash-loading");
  }

  /* ---------- 5. partner applications: Firestore (admin only) ---------- */
  async function loadApplications() {
    const sec = $("#applications");
    const f = await loadFb();
    let docs;
    try { docs = (await f.firestore().collection("vendorApplications").orderBy("createdAt", "desc").limit(200).get()).docs.map((d) => d.data()); } catch (e) {
      sec.replaceChildren(head("applications", "طلبات الشراكة", "من الفورم في صفحة الشركاء."),
        el("p", { class: "dash-note", text: e.code === "permission-denied" ? "الحساب ده مش أدمن، فمش مسموح له يشوف طلبات الشراكة. الأدمن بيتحدد في firestore.rules." : "ما قدرناش نجيب الطلبات: " + e.message }));
      return;
    }
    const when = (d) => (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null);
    const fmt = (d) => { const w = when(d); return w ? `${w.getDate()} ${MONTHS[w.getMonth()]} ${w.getFullYear()}` : "–"; };
    const csv = () => {
      const cols = ["createdAt", "businessName", "contactPerson", "phone", "email", "location", "businessType", "website", "language", "description"];
      const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const body = [cols.join(","), ...docs.map((d) => cols.map((c) => q(c === "createdAt" ? (when(d) ? when(d).toISOString() : "") : d[c])).join(","))].join("\r\n");
      const a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" })), download: `foodidu-partner-applications-${today()}.csv` });
      document.body.append(a); a.click(); a.remove();
    };
    sec.replaceChildren(
      head("applications", "طلبات الشراكة", `${docs.length} طلب · نسخة من كل طلب بتروح كمان لشيت Vendor Requests.`),
      docs.length ? el("p", null, el("button", { class: "dash-btn ghost", type: "button", onclick: csv, text: "تحميل الطلبات CSV" })) : null,
      table([{ label: "التاريخ", get: fmt }, { label: "النشاط", get: (d) => d.businessName }, { label: "المسؤول", get: (d) => d.contactPerson },
        { label: "تليفون", get: (d) => el("a", { href: "tel:" + d.phone, class: "ltr", text: d.phone }) }, { label: "إيميل", get: (d) => el("a", { href: "mailto:" + d.email, class: "ltr", text: d.email }) },
        { label: "المكان", get: (d) => d.location }, { label: "النوع", get: (d) => d.businessType }, { label: "تفاصيل", get: (d) => d.description || "–" }], docs, { empty: "مفيش طلبات شراكة لسه." }));
  }

  /* ---------- 6. tools & links ---------- */
  function renderTools() {
    const links = [
      ["Google Search Console", "الظهور في جوجل والفهرسة", "https://search.google.com/search-console?resource_id=" + encodeURIComponent(D.gsc.site)],
      ["Google Analytics", "كل تقارير الزوار", "https://analytics.google.com/"],
      ["Firebase", "الاستضافة والدومينات", `https://console.firebase.google.com/project/${PROJECT}/hosting/sites/${PROJECT}`],
      ["Firestore", "الطلبات وبيانات الموافقة", `https://console.firebase.google.com/project/${PROJECT}/firestore`],
      ["Microsoft Clarity", "تسجيلات الشاشة وخرائط الضغط", "https://clarity.microsoft.com/"],
      ["PageSpeed Insights", "سرعة الموقع على الموبايل", "https://pagespeed.web.dev/analysis?url=" + encodeURIComponent(D.site + "/ar/")],
      ["Google Play", "صفحة التطبيق", D.play],
      ["GitHub", "كود الموقع", "https://github.com/Abdelrahmann1/foodidu_website"]
    ];
    const setup = [
      [!!user, "تسجيل الدخول بجوجل في Firebase", "Authentication > Sign-in method > Google > Enable، وبعدين Settings > Authorized domains > Add domain: foodidu.com"],
      [null, "تفعيل واجهات جوجل (مرة واحدة)", null, ["analyticsdata.googleapis.com", "analyticsadmin.googleapis.com", "searchconsole.googleapis.com"]],
      [null, "خانات تقرير البراندات في Google Analytics", "Admin > Custom definitions: brand, placement, code, sponsored, store, deal, search_term"],
      [D.appCheck, "حماية App Check", "مفتاح reCAPTCHA v3 للدومين foodidu.com، والـ Secret يتحط في Firebase > App Check، والـ Site key يتحط في static/js/site.js"]
    ];
    $("#tools").replaceChildren(
      head("tools", "الأدوات", "روابط سريعة، والأدوات اللي على جهازك، وخطوات الإعداد."),
      el("ul", { class: "links" }, links.map(([t, s, h]) => el("li", null, el("a", { href: h, target: "_blank", rel: "noopener" }, el("b", { text: t }), el("small", { text: s }))))),
      el("div", { class: "dash-grid", style: "margin-top:14px" },
        card("أدوات على جهازك", "بتشتغل من فولدر المشروع بعد ما تشغّل perl tools/serve.pl", el("ul", { class: "check" },
          el("li", null, el("span", null, el("b", { text: "مولّد البانرات: " }), "بوستات وستوريز للشركاء وإعلانات فيسبوك وجوجل. ", el("code", { class: "ltr", text: "localhost:5000/__tools/banners.html" }))),
          el("li", null, el("span", null, el("b", { text: "مولّد الصور: " }), "لوجوهات البراندات وصور المشاركة. ", el("code", { class: "ltr", text: "localhost:5000/__tools/assets.html" }))),
          el("li", null, el("span", null, el("b", { text: "فحص الـ SEO: " }), el("code", { class: "ltr", text: "perl tools/seo-audit.pl" }))))),
        card("خطوات الإعداد", "عشان كل أجزاء لوحة التحكم تشتغل.", el("ul", { class: "check" }, setup.map(([ok, t, d, apis]) => el("li", null,
          ok === true ? chip("good", "تمام") : ok === false ? chip("warning", "لسه") : chip("info", "اتأكد"),
          el("span", null, el("b", { text: t + ": " }), d ? d : null, apis ? apis.map((a, i) => [i ? " · " : "", ext(`https://console.cloud.google.com/apis/library/${a}?project=${PROJECT}`, a)]) : null)))))));
  }

  /* ---------- go ---------- */
  function loadLive() {
    if (!token) { renderGates(); return; }
    loadVisitors().catch((e) => { $("#visitors").classList.remove("dash-loading"); $("#visitors").replaceChildren(head("visitors", "الزوار", ""), apiProblem(e, "ga")); });
    loadGoogle().catch((e) => { $("#google").classList.remove("dash-loading"); $("#google").replaceChildren(head("google", "جوجل", ""), apiProblem(e, "gsc")); });
  }
  renderOverview(); renderContent(); renderRange(); renderTools(); renderAuth(); renderGates();
  loadFb().then((f) => f.auth().onAuthStateChanged((u) => {
    user = u; renderAuth(); renderTools();
    if (u) { loadApplications(); loadLive(); } else renderGates();
  })).catch(() => {});
})();
