/* Foodidu dashboard > إدارة المحتوى: add, edit and delete promo codes, restaurant offers, day deals, the featured slot and
   the home code cards. It reads data/*.json from GitHub (main), edits a copy in the browser and saves every change in ONE
   commit; the "Build and deploy" GitHub Action then rebuilds the static site and publishes it (about 2 minutes).
   Brands and restaurants also get their logo tile and share images drawn here (art.js) and committed with the data.
   Writing needs a fine-grained GitHub token (Contents: read and write, Actions: read) that stays in this browser only. */
window.FoodiduAdmin = (() => {
  "use strict";
  const BRANCH = "main", TOKEN_KEY = "fd_gh_token";
  const FILES = { brands: "data/brands.json", rests: "data/restaurant-offers.json", deals: "data/day-deals.json", featured: "data/featured.json", home: "data/home.json", blog: "data/blog.json", firebase: "firebase.json" };
  const DAYS = [["sat", "السبت"], ["sun", "الأحد"], ["mon", "الاتنين"], ["tue", "التلات"], ["wed", "الأربع"], ["thu", "الخميس"], ["fri", "الجمعة"]];
  const ICONS = [["fork", "مطاعم"], ["pizza", "بيتزا"], ["basket", "بقالة"], ["bag", "تسوق"], ["gift", "هدية"], ["tag", "خصم"]];
  const RESERVED = ["ar", "en", "promo-codes", "partners", "day-deals", "privacy-policy", "terms-and-conditions", "dashboard", "blog", "first-order-promo-codes", "img", "css", "js", "pages", "components", "404"];
  // key order in the JSON files, so a saved entry looks like the ones written by hand
  const BRAND_KEYS = ["key", "slug", "name", "logo", "code", "noCode", "category", "region", "regionLabel", "exclusive", "firstOrder", "featured", "priority", "url", "urlLabel", "lastVerified", "badge", "offer", "terms", "where", "steps", "moreCodes", "about", "seo"];
  const REST_KEYS = ["key", "slug", "name", "logo", "category", "region", "menu", "website", "phone", "cuisine", "lastChecked", "validUntil", "about", "seo", "offers"];
  const POST_KEYS = ["key", "slug", "status", "published", "updated", "seasonEnd", "brands", "seo", "h1", "lede", "body", "faq"];
  const DEAL_KEYS = ["id", "brand", "name", "logo", "icon", "region", "url", "featured", "days", "title", "details", "source", "sourceLabel", "lastChecked"];
  let REPO = "", root = null, token = null;
  const S = { loaded: false, base: null, data: {}, dirty: new Set(), blobs: {}, deletes: new Set(), baseFiles: new Set(), changes: [], logos: {}, tab: "brands", view: null };
  const deployBox = document.createElement("div");
  deployBox.className = "adm-deploy";
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: (k) => { try { localStorage.removeItem(k); } catch (e) {} } };

  /* ---------- small helpers (all text goes in with textContent) ---------- */
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else if (k === "value") n.value = v; else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
    return n;
  }
  const btn = (text, onclick, cls) => el("button", { type: "button", class: "dash-btn" + (cls ? " " + cls : ""), onclick, text });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const today = () => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const toast = (msg) => { const t = el("div", { class: "adm-toast", role: "status", text: msg }); document.body.append(t); setTimeout(() => t.remove(), 4500); };
  const ordered = (o, keys) => { const r = {}; for (const k of keys) if (k in o) r[k] = o[k]; for (const k of Object.keys(o)) if (!(k in r)) r[k] = o[k]; return r; };
  const slugify = (s) => String(s || "").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  const entities = () => [...S.data.brands.brands, ...S.data.rests.restaurants];
  const findBrand = (k) => S.data.brands.brands.find((b) => b.key === k);

  // The data files keep short objects on one line (like { "en": "...", "ar": "..." }) and longer ones spread out.
  function toJSON(v) {
    const flat = (x) => (Array.isArray(x) ? "[" + x.map(flat).join(", ") + "]" : x && typeof x === "object" ? (Object.keys(x).length ? "{ " + Object.entries(x).map(([k, y]) => JSON.stringify(k) + ": " + flat(y)).join(", ") + " }" : "{}") : JSON.stringify(x));
    const leaf = (y) => y === null || typeof y !== "object";
    const simple = (x) => (Array.isArray(x) ? x.every(leaf) : Object.values(x).every((y) => leaf(y) || (Array.isArray(y) && y.every(leaf))));
    const rec = (x, ind, used) => {
      if (leaf(x)) return JSON.stringify(x);
      const f = flat(x);
      if (simple(x) && used + f.length <= 200) return f;
      const i2 = ind + "  ";
      if (Array.isArray(x)) return x.length ? "[\n" + x.map((y) => i2 + rec(y, i2, i2.length)).join(",\n") + "\n" + ind + "]" : "[]";
      return "{\n" + Object.entries(x).map(([k, y]) => { const p = i2 + JSON.stringify(k) + ": "; return p + rec(y, i2, p.length); }).join(",\n") + "\n" + ind + "}";
    };
    return rec(v, "", 0) + "\n";
  }

  /* ---------- GitHub ---------- */
  async function gh(path, opts = {}) {
    const headers = { Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (token && !opts.anon) headers.Authorization = "Bearer " + token;
    if (opts.body) headers["Content-Type"] = "application/json";
    const r = await fetch("https://api.github.com" + path, { method: opts.method || "GET", cache: "no-store", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.message || r.statusText); e.status = r.status; throw e; }
    return opts.raw ? r.text() : r.json();
  }
  async function loadData() {
    const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    S.base = ref.object.sha;
    const entries = await Promise.all(Object.entries(FILES).map(async ([k, p]) => [k, JSON.parse(await gh(`/repos/${REPO}/contents/${p}?ref=${S.base}`, { raw: true }))]));
    S.data = Object.fromEntries(entries);
    const files = async (dir) => (await gh(`/repos/${REPO}/contents/${dir}?ref=${S.base}`)).map((f) => f.path);
    S.baseFiles = new Set([...(await files("static/img/brands")), ...(await files("static/img/og"))]);
    S.dirty.clear(); S.blobs = {}; S.deletes.clear(); S.changes = []; S.logos = {}; S.view = null; S.loaded = true;
  }
  const b64text = (s) => { const bytes = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const blobB64 = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(b); });
  const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
  async function publish() {
    const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    if (ref.object.sha !== S.base) throw Object.assign(new Error("conflict"), { conflict: true });
    const commit = await gh(`/repos/${REPO}/git/commits/${S.base}`);
    const blob = async (b64) => (await gh(`/repos/${REPO}/git/blobs`, { method: "POST", body: { content: b64, encoding: "base64" } })).sha;
    const tree = [];
    for (const k of S.dirty) tree.push({ path: FILES[k], mode: "100644", type: "blob", sha: await blob(b64text(toJSON(S.data[k]))) });
    for (const [path, b64] of Object.entries(S.blobs)) tree.push({ path, mode: "100644", type: "blob", sha: await blob(b64) });
    for (const path of S.deletes) if (!S.blobs[path]) tree.push({ path, mode: "100644", type: "blob", sha: null });
    const t = await gh(`/repos/${REPO}/git/trees`, { method: "POST", body: { base_tree: commit.tree.sha, tree } });
    const first = S.changes.length === 1 ? S.changes[0] : `${S.changes.length} changes`;
    const message = `Dashboard: ${first}\n\n${S.changes.map((c) => "- " + c).join("\n")}\n\nSaved from foodidu.com/dashboard/`;
    const c = await gh(`/repos/${REPO}/git/commits`, { method: "POST", body: { message, tree: t.sha, parents: [S.base] } });
    await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: "PATCH", body: { sha: c.sha } });
    return c.sha;
  }
  async function watchDeploy(sha) {
    const show = (cls, text, url) => deployBox.replaceChildren(el("b", { text: "آخر نشر: " }), ...[el("span", { class: "chip-s " + cls, text }), url ? el("a", { href: url, target: "_blank", rel: "noopener", text: "التفاصيل على GitHub" }) : null].filter(Boolean));
    const runs = async () => { const p = `/repos/${REPO}/actions/runs?branch=${BRANCH}&per_page=10`; try { return await gh(p); } catch (e) { if (e.status === 403 || e.status === 401) return gh(p, { anon: true }); throw e; } };
    show("info", "اتحفظ على GitHub، مستني النشر يبدأ...");
    const started = Date.now();
    while (Date.now() - started < 10 * 60e3) {
      await new Promise((r) => setTimeout(r, 10000));
      let run;
      try { run = ((await runs()).workflow_runs || []).find((r) => r.head_sha === sha); } catch (e) { continue; }
      if (!run) continue;
      if (run.status !== "completed") { show("warning", run.status === "queued" ? "في الطابور..." : "بيبني الموقع وبيرفعه...", run.html_url); continue; }
      if (run.conclusion === "success") { show("good", "اتنشر على foodidu.com", run.html_url); toast("التعديلات بقت على الموقع."); }
      else show("critical", "النشر وقف. افتح التفاصيل: لو الغلط في خطوة Deploy يبقى مفتاح Firebase لسه مش متضاف في GitHub.", run.html_url);
      return;
    }
    show("warning", "النشر بياخد وقت أكتر من العادي.", `https://github.com/${REPO}/actions`);
  }
  const same = (a, b, keys) => JSON.stringify(ordered(a, keys)) === JSON.stringify(ordered(b, keys));
  function change(fileKey, msg) { S.dirty.add(fileKey); S.changes.push(msg); renderBar(); }

  /* ---------- form fields: each is { node, get(), set(v), check() -> [error messages] } ---------- */
  const field = (label, input, hint) => el("label", { class: "adm-f" }, el("span", { class: "adm-l", text: label }), input, hint ? el("small", { class: "adm-h", text: hint }) : null);
  function text(label, o = {}) {
    const i = el(o.area ? "textarea" : "input", { type: o.area ? null : o.type || "text", dir: o.dir || "auto", rows: o.area ? o.rows || 3 : null, placeholder: o.ph || null, inputmode: o.type === "number" ? "numeric" : null });
    const counter = o.count ? el("small", { class: "adm-c" }) : null;
    const upd = () => { if (!counter) return; const n = i.value.trim().length; counter.textContent = `${n} حرف (المناسب ${o.count[0]} لـ ${o.count[1]})`; counter.classList.toggle("bad", n > 0 && (n < o.count[0] || n > o.count[1])); };
    i.addEventListener("input", upd);
    const node = field(label, i, o.hint); if (counter) node.append(counter);
    return {
      node, input: i,
      get: () => (o.type === "number" ? (i.value.trim() === "" ? null : +i.value) : i.value.trim()),
      set: (v) => { i.value = v == null ? "" : v; upd(); },
      check: () => {
        const v = i.value.trim();
        if (o.req && !v) return [`${label}: مطلوب`];
        if (v && o.pattern && !o.pattern.test(v)) return [`${label}: ${o.patternMsg || "الصيغة مش مظبوطة"}`];
        if (v && o.type === "url" && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(v)) return [`${label}: لازم يبقى لينك كامل بيبدأ بـ https://`];
        if (v && o.type === "number" && !(+v > 0)) return [`${label}: لازم رقم أكبر من صفر`];
        return [];
      }
    };
  }
  function bi(label, o = {}) {
    const ar = text(label + " (عربي)", { ...o, dir: "rtl", hint: o.hint }), en = text(label + " (English)", { ...o, dir: "ltr", hint: null });
    return {
      node: el("div", { class: "adm-pair" }, ar.node, en.node),
      get: () => ({ en: en.get(), ar: ar.get() }),
      set: (v) => { v = typeof v === "string" ? { en: v, ar: v } : v || {}; en.set(v.en); ar.set(v.ar); },
      check: () => { const e = [...ar.check(), ...en.check()]; if (!o.req && !e.length && !ar.get() !== !en.get()) e.push(`${label}: اكتبه بالعربي والإنجليزي، أو سيب الاتنين فاضيين`); return e; }
    };
  }
  function select(label, options, o = {}) {
    const s = el("select", null, options.map(([v, t]) => el("option", { value: v, text: t })));
    return { node: field(label, s, o.hint), input: s, get: () => s.value, set: (v) => { s.value = v == null ? options[0][0] : v; }, check: () => [] };
  }
  function check(label, hint) {
    const c = el("input", { type: "checkbox" });
    return { node: el("label", { class: "adm-f adm-chk" }, c, el("span", null, el("b", { text: label }), hint ? el("small", { class: "adm-h", text: hint }) : null)), get: () => c.checked, set: (v) => { c.checked = !!v; }, check: () => [] };
  }
  function date(label, o = {}) {
    const i = el("input", { type: "date" });
    return { node: field(label, el("span", { class: "adm-row" }, i, o.today ? btn("النهارده", () => { i.value = today(); }, "ghost sm") : null, !o.req ? btn("فضّي", () => { i.value = ""; }, "ghost sm") : null), o.hint),
      get: () => i.value, set: (v) => { i.value = v || ""; }, check: () => (o.req && !i.value ? [`${label}: مطلوب`] : []) };
  }
  function multi(label, options, o = {}) {
    const boxes = options.map(([v, t]) => [v, el("input", { type: "checkbox", value: v }), t]);
    const get = () => boxes.filter(([, c]) => c.checked).map(([v]) => v);
    return {
      node: el("div", { class: "adm-f", role: "group", "aria-label": label }, el("span", { class: "adm-l", text: label }), el("span", { class: "adm-row wrap" }, boxes.map(([, c, t]) => el("label", { class: "adm-tick" }, c, el("span", { text: t })))), o.hint ? el("small", { class: "adm-h", text: o.hint }) : null),
      get, set: (vs) => { vs = [].concat(vs || []); boxes.forEach(([v, c]) => { c.checked = vs.includes(v); }); },
      check: () => (o.req && !get().length ? [`${label}: اختار واحد على الأقل`] : [])
    };
  }
  function regions() {
    const m = multi("متاح في", [["eg", "مصر"], ["gcc", "الخليج"], ["all", "كل الدول"]], { req: true });
    return { node: m.node, get: () => { const v = m.get(); return v.includes("all") ? "all" : v.length === 1 ? v[0] : v; }, set: (v) => m.set(v), check: () => m.check() };
  }
  function badge(label) {
    const f = { arB: text("الرقم الكبير (عربي)", { req: true, dir: "rtl", ph: "30%" }), arS: text("الكلمة الصغيرة (عربي)", { req: true, dir: "rtl", ph: "خصم" }),
      enB: text("الرقم الكبير (English)", { req: true, dir: "ltr", ph: "30%" }), enS: text("الكلمة الصغيرة (English)", { req: true, dir: "ltr", ph: "off" }) };
    return {
      node: el("fieldset", { class: "adm-set" }, el("legend", { text: label }), el("p", { class: "adm-h", text: "اللي بيظهر كبير على تذكرة الكود، زي 30% خصم أو 100 جنيه خصم. خليه قصير." }), el("div", { class: "adm-grid4" }, f.arB.node, f.arS.node, f.enB.node, f.enS.node)),
      get: () => ({ en: [f.enB.get(), f.enS.get()], ar: [f.arB.get(), f.arS.get()] }),
      set: (v) => { v = v || { en: [], ar: [] }; f.enB.set(v.en[0]); f.enS.set(v.en[1]); f.arB.set(v.ar[0]); f.arS.set(v.ar[1]); },
      check: () => [f.arB, f.arS, f.enB, f.enS].flatMap((x) => x.check())
    };
  }
  function seo() {
    const f = { arT: text("عنوان جوجل (عربي)", { req: true, dir: "rtl", count: [30, 60] }), arD: text("وصف جوجل (عربي)", { req: true, dir: "rtl", area: true, count: [70, 160] }),
      enT: text("Google title (English)", { req: true, dir: "ltr", count: [30, 60] }), enD: text("Google description (English)", { req: true, dir: "ltr", area: true, count: [70, 160] }) };
    return {
      node: el("fieldset", { class: "adm-set" }, el("legend", { text: "الظهور في جوجل (SEO)" }), el("p", { class: "adm-h", text: "العنوان والوصف اللي بيظهروا في نتايج جوجل. حط فيهم اسم البراند والكود والخصم. الموقع بيزوّد على العنوان \"| Foodidu\"." }), f.arT.node, f.arD.node, f.enT.node, f.enD.node),
      get: () => ({ en: { title: f.enT.get(), description: f.enD.get() }, ar: { title: f.arT.get(), description: f.arD.get() } }),
      set: (v) => { v = v || {}; const e = v.en || {}, a = v.ar || {}; f.enT.set(e.title); f.enD.set(e.description); f.arT.set(a.title); f.arD.set(a.description); },
      check: () => {
        const e = [f.arT, f.arD, f.enT, f.enD].flatMap((x) => x.check());
        if (f.arT.get().length > 70 || f.enT.get().length > 70) e.push("عنوان جوجل أطول من 70 حرف، هيتقص في النتايج.");
        if (f.arD.get().length > 170 || f.enD.get().length > 170) e.push("وصف جوجل أطول من 170 حرف، هيتقص في النتايج.");
        return e;
      }
    };
  }
  function list(label, make, o = {}) {
    const items = [], box = el("div", { class: "adm-list" });
    const renumber = () => items.forEach((it, i) => { it.num.textContent = `${o.item} ${i + 1}`; });
    const add = (v) => {
      const f = make(), num = el("b"), it = { f, num };
      const card = el("div", { class: "adm-item" }, el("div", { class: "adm-item-h" }, num, btn("شيل", () => { items.splice(items.indexOf(it), 1); card.remove(); renumber(); }, "ghost sm danger")), f.node);
      if (v) f.set(v); items.push(it); box.append(card); renumber();
    };
    return {
      node: el("fieldset", { class: "adm-set" }, el("legend", { text: label }), o.hint ? el("p", { class: "adm-h", text: o.hint }) : null, box, btn("+ " + o.add, () => add(), "ghost sm")),
      get: () => items.map((it) => it.f.get()), set: (vs) => { items.length = 0; box.replaceChildren(); (vs || []).forEach(add); },
      check: () => { const e = items.flatMap((it, i) => it.f.check().map((m) => `${o.item} ${i + 1}: ${m}`)); if (o.min && items.length < o.min) e.push(`${label}: محتاج ${o.min} على الأقل`); return e; }
    };
  }
  function group(fields) {
    return {
      node: el("div", { class: "adm-group" }, Object.values(fields).map((f) => f.node)),
      get: () => { const o = {}; for (const [k, f] of Object.entries(fields)) o[k] = f.get(); return o; },
      set: (v) => { v = v || {}; for (const [k, f] of Object.entries(fields)) f.set(v[k]); },
      check: () => Object.values(fields).flatMap((f) => f.check())
    };
  }
  const collect = (fields) => { const o = {}; for (const [k, f] of Object.entries(fields)) o[k] = f.get(); return o; };
  function clean(o) {   // drop empty optional values so the JSON stays tidy
    for (const [k, v] of Object.entries(o)) if (v === "" || v == null || (Array.isArray(v) && !v.length) || (v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => x === "" || x == null))) delete o[k];
    return o;
  }

  /* ---------- logos and share images ---------- */
  async function logoImage(e) {
    if (!e) return null;
    if (S.logos[e.key]) return S.logos[e.key];
    if (!e.logo) return null;
    for (const src of ["/img/brands/" + e.logo, `https://raw.githubusercontent.com/${REPO}/${S.base}/static/img/brands/${e.logo}`]) {
      try { return await load(src); } catch (err) { /* not live yet: try the copy on GitHub */ }
    }
    return null;
  }
  // 384 px square tile like the rest of the site: upload, pick the background, padding, and "fill the square".
  function logoField(entity) {
    const SZ = 384, prev = canvas(SZ, SZ);
    let img = null, current = null;
    prev.className = "adm-logo";
    const file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/svg+xml" }), bg = el("input", { type: "color", value: "#ffffff" });
    const pad = el("input", { type: "range", min: 0, max: 30, value: 10 }), cover = el("input", { type: "checkbox" });
    const draw = () => {
      const x = prev.getContext("2d"); x.clearRect(0, 0, SZ, SZ);
      if (!img) { x.fillStyle = "#f4efe2"; x.fillRect(0, 0, SZ, SZ); if (current) x.drawImage(current, 0, 0, SZ, SZ); return; }
      x.fillStyle = bg.value; x.fillRect(0, 0, SZ, SZ); x.imageSmoothingQuality = "high";
      const p = (SZ * pad.value) / 100; fit(x, img, p, p, SZ - 2 * p, SZ - 2 * p, cover.checked);
    };
    file.addEventListener("change", () => {
      const f = file.files[0]; if (!f) return;
      const i = new Image();
      i.onload = () => {
        if (!(i.naturalWidth > 0)) { alert("الصورة دي مش هتنفع. جرّب PNG أو JPG."); return; }
        const c = canvas(8, 8), x = c.getContext("2d"); x.drawImage(i, 0, 0, 8, 8); const d = x.getImageData(0, 0, 1, 1).data;   // guess the background from the corner
        if (d[3] > 200) bg.value = "#" + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, "0")).join("");
        img = i; draw();
      };
      i.onerror = () => alert("ما قدرناش نفتح الصورة دي.");
      i.src = URL.createObjectURL(f);
    });
    [bg, pad, cover].forEach((n) => n.addEventListener("input", draw));
    if (entity) logoImage(entity).then((i) => { current = i; draw(); }); else draw();
    return {
      node: el("fieldset", { class: "adm-set" }, el("legend", { text: "اللوجو" }),
        el("div", { class: "adm-logo-row" }, prev, el("div", { class: "adm-group" },
          field(entity ? "غيّر اللوجو (اختياري)" : "ارفع صورة اللوجو", file, "أحسن حاجة اللوجو الرسمي من موقع البراند أو صفحته، PNG أو SVG بخلفية شفافة."),
          el("div", { class: "adm-row wrap" }, field("لون الخلفية", bg), field("المسافة حوالين اللوجو", pad), el("label", { class: "adm-tick" }, cover, el("span", { text: "يملأ المربع كله" })))))),
      changed: () => !!img, canvas: () => prev
    };
  }
  let art = null;
  function loadArt() {
    if (!art) art = (async () => {
      await Promise.all([document.fonts.load("400 30px 'Readex Pro'", "كود abc"), document.fonts.load("700 30px 'Readex Pro'", "كود abc"), document.fonts.load("92px Lalezar", "كود abc")]);
      return { pattern: await load("/img/pattern.svg"), face: await load("/img/foodidu-logo.svg") };
    })().catch((e) => { art = null; throw e; });
    return art;
  }
  const small = (file) => file.replace(/\.(\w+)$/, "-192.$1");   // the 192 px copy next to each 384 px logo
  function dropFile(path) { delete S.blobs[path]; if (S.baseFiles.has(path)) S.deletes.add(path); }
  async function putCanvas(path, c, type, q) { S.blobs[path] = await blobB64(await toBlob(c, type, q)); S.deletes.delete(path); }
  async function renderImages(e, kind, logoF) {
    const { pattern, face } = await loadArt();
    if (logoF && logoF.changed()) {
      const tile = logoF.canvas(), b = await toBlob(tile, "image/webp", 0.95), b64 = await blobB64(b);
      // a new name for every new logo: browsers keep /img/ files for 30 days. Safari can't write WebP, so PNG there.
      let h = 5381; for (let i = 0; i < b64.length; i++) h = (h * 33 + b64.charCodeAt(i)) >>> 0;
      const file = `${e.key}-${h.toString(36).slice(0, 6)}.${b.type === "image/webp" ? "webp" : "png"}`, old = e.logo;
      S.blobs[`static/img/brands/${file}`] = b64; S.deletes.delete(`static/img/brands/${file}`);
      const sm = canvas(192, 192), sx = sm.getContext("2d"); sx.imageSmoothingQuality = "high"; sx.drawImage(tile, 0, 0, 192, 192);   // small tiles use this copy
      await putCanvas(`static/img/brands/${small(file)}`, sm, b.type, 0.9);
      S.logos[e.key] = tile; e.logo = file;
      if (old && old !== file && !entities().some((x) => x.key !== e.key && x.logo === old)) { dropFile(`static/img/brands/${old}`); dropFile(`static/img/brands/${small(old)}`); }
    }
    const logo = await logoImage(e);
    if (!logo) throw new Error("اللوجو: ارفع صورة.");
    for (const job of ogJobs(e, kind)) await putCanvas(`static/img/og/${job.file}.png`, drawOg(job, pattern, face, { [e.key]: logo }, S.data.brands.categories), "image/png");
  }
  const sectionKeys = () => new Set(sectionJobs(S.data.brands.brands).flatMap((j) => j.items.map((i) => i.key)));
  async function renderSections() {   // the home / codes / partners / day-deals share images show brand tickets too
    const { pattern, face } = await loadArt(), logos = {};
    for (const k of sectionKeys()) logos[k] = await logoImage(findBrand(k));
    for (const job of sectionJobs(S.data.brands.brands)) if (job.items.every((i) => logos[i.key])) await putCanvas(`static/img/og/${job.file}.png`, drawOg(job, pattern, face, logos, S.data.brands.categories), "image/png");
  }

  /* ---------- checks shared by brands and restaurants ---------- */
  function uniqueErrors(v, self) {
    const e = [], others = entities().filter((x) => x.key !== (self && self.key)), low = (s) => String(s).toLowerCase();
    if (!self) {
      if (others.some((x) => x.key === v.key)) e.push("المعرّف (key) ده مستخدم قبل كده. غيّره.");
      if (others.some((x) => low(x.slug) === low(v.slug)) || RESERVED.includes(low(v.slug))) e.push("لينك الصفحة ده مستخدم قبل كده. غيّره.");
    }
    for (const l of ["ar", "en"]) {
      const name = l === "ar" ? "عربي" : "English";
      if (others.some((x) => x.seo && x.seo[l] && x.seo[l].title === v.seo[l].title)) e.push(`عنوان جوجل (${name}) نفس عنوان صفحة تانية. كل صفحة لازم عنوانها مختلف.`);
      if (others.some((x) => x.seo && x.seo[l] && x.seo[l].description === v.seo[l].description)) e.push(`وصف جوجل (${name}) نفس وصف صفحة تانية.`);
    }
    return e;
  }
  // 301s from the lowercase spelling of a URL with capitals (Firebase paths are case-sensitive): to the page, or to the
  // codes page once the page is deleted
  function caseRedirects(slug, gone) {
    const low = slug.toLowerCase(), red = S.data.firebase.hosting.redirects;
    if (low === slug) return;
    for (const ar of ["", "/ar"]) for (const end of ["", "/"]) {
      const source = `${ar}/${low}${end}`, destination = gone ? `${ar}/promo-codes/` : `${ar}/${slug}/`, r = red.find((x) => x.source === source);
      if (r) r.destination = destination; else red.push({ source, destination, type: 301 });
    }
    S.dirty.add("firebase");
  }
  function unredirect(slug) {   // a page that comes back after a delete: drop its 301s, or Firebase would keep redirecting it
    const red = S.data.firebase.hosting.redirects, gone = new Set([`/${slug}`, `/${slug}/`, `/ar/${slug}`, `/ar/${slug}/`]);
    const keep = red.filter((r) => !gone.has(r.source));
    if (keep.length !== red.length) { S.data.firebase.hosting.redirects = keep; S.dirty.add("firebase"); }
  }

  /* ---------- forms ---------- */
  function idFields(isNew, suffix, f) {
    if (!isNew) { f.key.input.disabled = true; f.slug.input.disabled = true; return; }
    f.name.node.addEventListener("input", () => {
      const s = slugify(f.name.get().en);
      if (!f.key.input.dataset.touched) f.key.set(s.toLowerCase());
      if (!f.slug.input.dataset.touched) f.slug.set(s ? s + suffix : "");
    });
    [f.key, f.slug].forEach((x) => x.input.addEventListener("input", () => { x.input.dataset.touched = "1"; }));
  }
  const keyField = (isNew) => text("المعرّف (key)", { req: true, dir: "ltr", pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, patternMsg: "حروف إنجليزي صغيرة وأرقام وشَرطة - بس", hint: isNew ? "بيتكتب لوحده من الاسم الإنجليزي. ما بيتغيرش بعد كده." : "ثابت ما بيتغيرش." });
  const slugField = (isNew, ex) => text("لينك الصفحة", { req: true, dir: "ltr", pattern: /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/, patternMsg: "حروف إنجليزي وأرقام وشَرطة - بس", hint: isNew ? `زي ${ex}. ما بيتغيرش بعد النشر عشان ترتيب جوجل.` : "ثابت عشان ما نخسرش ترتيب الصفحة في جوجل." });
  function brandForm(isNew) {
    const f = {
      key: keyField(isNew), slug: slugField(isNew, "KFC-PromoCode"),
      name: bi("اسم البراند", { req: true }),
      code: text("الكود", { dir: "ltr", pattern: /^\S+$/, patternMsg: "من غير مسافات", hint: "فاضي لو الخصم من غير كود." }),
      noCode: check("خصم من غير كود", "الخصم بيتطبق لوحده من موقع أو تطبيق البراند. لو كتبت لينك البراند التذكرة هتفتحه، ولو مفيش لينك هيظهر \"بدون كود\" بس."),
      category: select("النوع", Object.entries(S.data.brands.categories).map(([k, v]) => [k, v.ar])), region: regions(),
      regionLabel: bi("اسم المنطقة بطريقتك (اختياري)", { hint: "لو عايز يظهر مثلاً \"مصر والسعودية\" بدل اختيار المنطقة." }),
      exclusive: check("كود حصري لـ Foodidu", "بيظهر عليه \"حصري\"."), firstOrder: check("لأول طلب بس", "بيظهر كمان في صفحة أكواد خصم أول طلب."), featured: check("في \"أقوى الأكواد\"", "بيظهر في قسم أقوى الأكواد في الصفحة الرئيسية."),
      priority: select("مكانه في القوايم", [["top", "أولوية أولى (كود بيكسبني)"], ["", "عادي"], ["low", "في الآخر (كود مش من شركائنا)"]], { hint: "جوه كل مجموعة، رتّب بالأسهم في قايمة الأكواد." }),
      url: text("لينك موقع أو تطبيق البراند (اختياري)", { dir: "ltr", type: "url" }), urlLabel: bi("نص زرار اللينك (اختياري)", { hint: "لو فاضي: \"اذهب إلى\" + اسم البراند." }),
      lastVerified: date("آخر مرة جربنا فيها الكود بنفسنا", { today: true, hint: "لو فاضي، الكود بيظهر من غير \"اتحقق منه\"." }),
      badge: badge("الخصم على التذكرة"), offer: bi("العرض في سطر", { req: true, hint: "زي: خصم 30% على أول طلب بحد أقصى 150 جنيه" }),
      terms: bi("الشروط", { req: true, area: true }), where: bi("بيتستخدم فين", { req: true, hint: "زي: تطبيق رابيت" }),
      moreCodes: list("أكواد تانية لنفس البراند (اختياري)", () => group({ code: text("الكود", { dir: "ltr", pattern: /^\S+$/, patternMsg: "من غير مسافات", hint: "فاضي لو العرض من غير كود." }), noCode: check("عرض من غير كود", "بيتطبق لوحده. بيظهر عليه \"بدون كود\" بدل زرار النسخ."), badge: badge("الخصم على التذكرة"), offer: bi("العرض في سطر", { req: true }), terms: bi("الشروط", { req: true, area: true }), exclusive: check("حصري"), firstOrder: check("لأول طلب بس"), lastVerified: date("آخر مرة جربنا الكود ده بنفسنا", { today: true, hint: "لو فاضي، الكود ده بيظهر من غير \"اتحقق منه\"." }) }), { item: "كود", add: "كود تاني" }),
      about: bi("عن البراند", { req: true, area: true, hint: "جملتين عن البراند والكود. بيظهر في صفحة البراند." }), seo: seo()
    };
    idFields(isNew, "-PromoCode", f);
    // removing the main code: the first extra code takes its place (code, ticket, offer, terms, exclusive, checked date)
    const drop = btn("شيل الكود ده (والكود التاني يبقى الأساسي)", () => {
      const extras = f.moreCodes.get();
      if (!extras.length) { alert("ده الكود الوحيد للبراند. ضيف كود تاني الأول، أو امسح البراند كله من القايمة."); return; }
      if (!confirm(`تشيل الكود ${f.code.get()}؟ الكود ${extras[0].code} هيبقى الكود الأساسي.`)) return;
      const [first, ...rest] = extras;
      f.code.set(first.code); f.badge.set(first.badge); f.offer.set(first.offer); f.terms.set(first.terms);
      f.exclusive.set(first.exclusive); f.firstOrder.set(first.firstOrder); f.lastVerified.set(first.lastVerified || "");
      f.moreCodes.set(rest);
      toast("اتشال. راجع عنوان ووصف جوجل و\"عن البراند\" لو فيهم الكود القديم، وبعدين احفظ.");
    }, "ghost sm danger");
    f.code = { ...f.code, node: el("div", { class: "adm-group" }, f.code.node, el("p", null, drop)) };
    return f;
  }
  function restForm(isNew) {
    const f = {
      key: keyField(isNew), slug: slugField(isNew, "Bazooka-Offers"),
      name: bi("اسم المطعم", { req: true }),
      menu: bi("لينك المنيو الرسمي", { req: true, type: "url", hint: "صفحة المنيو أو العروض على موقع المطعم." }),
      website: text("موقع المطعم", { req: true, dir: "ltr", type: "url" }), phone: text("رقم الطلب", { req: true, dir: "ltr", pattern: /^[0-9+ ]{3,}$/, patternMsg: "أرقام بس" }),
      cuisine: text("نوع الأكل بالإنجليزي (افصل بـ ,)", { dir: "ltr", ph: "Burgers, Fried chicken" }),
      lastChecked: date("آخر مرة راجعنا الأسعار", { req: true, today: true }), validUntil: date("العروض سارية لحد (اختياري)"),
      offers: list("العروض", () => group({ name: bi("اسم العرض", { req: true }), items: bi("بيشمل إيه", { req: true }), price: text("السعر بالجنيه", { req: true, type: "number" }), was: text("السعر من غير العرض", { req: true, type: "number", hint: "مجموع أسعار الحاجات دي في المنيو." }) }), { item: "عرض", add: "عرض", min: 1 }),
      about: bi("عن المطعم", { req: true, area: true }), seo: seo()
    };
    idFields(isNew, "-Offers", f);
    return f;
  }
  function dealForm(isNew) {
    const refs = [["", "مطعم أو براند مالوش صفحة عندنا"], ...S.data.brands.brands.map((b) => [b.key, b.name.ar]), ...S.data.rests.restaurants.map((r) => [r.key, r.name.ar + " (عروض مطاعم)"])];
    const f = {
      id: text("المعرّف", { req: true, dir: "ltr", pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, patternMsg: "حروف إنجليزي صغيرة وأرقام وشَرطة - بس", hint: isNew ? "بيتكتب لوحده." : "ثابت." }),
      brand: select("البراند", refs), name: bi("اسم البراند", { hint: "لما يكون مالوش صفحة عندنا." }), icon: select("الأيقونة", ICONS), region: regions(),
      days: multi("الأيام", DAYS, { req: true }), featured: check("العرض الأساسي", "اسمه بيظهر في عنوان صفحة عروض الأيام في جوجل (عرض واحد بس)."),
      title: bi("العرض في سطر", { req: true }), details: bi("التفاصيل", { req: true, area: true }),
      source: text("لينك المصدر الرسمي", { req: true, dir: "ltr", type: "url", hint: "بوست أو صفحة رسمية للبراند فيها العرض." }), sourceLabel: bi("اسم المصدر", { req: true, hint: "زي: صفحة كنتاكي مصر على فيسبوك" }),
      lastChecked: date("آخر مراجعة", { req: true, today: true })
    };
    const sync = () => { const custom = !f.brand.get(); [f.name, f.icon, f.region].forEach((x) => { x.node.hidden = !custom; }); };
    f.brand.input.addEventListener("change", sync);
    if (!isNew) f.id.input.disabled = true;
    else {
      const auto = () => { if (!f.id.input.dataset.touched) f.id.set([f.brand.get() || slugify(f.name.get().en).toLowerCase(), ...f.days.get()].filter(Boolean).join("-")); };
      [f.brand.node, f.days.node, f.name.node].forEach((n) => { n.addEventListener("change", auto); n.addEventListener("input", auto); });
      f.id.input.addEventListener("input", () => { f.id.input.dataset.touched = "1"; });
    }
    return { f, sync };
  }

  /* ---------- blog: articles in data/blog.json; the site builds /blog/<slug>/ (the Markdown is described in tools/build.pl) ---------- */
  const BLOG_MIN = { words: 400, sections: 2, links: 2 };   // the same quality gate as tools/build.pl
  const MD_HELP = "فقرات بينها سطر فاضي. ## عنوان قسم · ### عنوان صغير · - نقطة · 1. خطوة · > نصيحة · **كلام تقيل** · [نص](brand:noon) لينك لصفحة كود · [نص](page:/first-order-promo-codes/) لينك لصفحة في الموقع · [نص](https://...) لينك لموقع تاني · {{code:noon}} الكود نفسه و{{offer:noon}} العرض (بيتحدثوا لوحدهم لو الكود اتغير) · [[codes: noon, iherb]] في سطر لوحده: تذاكر الأكواد.";
  function mdCheck(src, label) {   // -> { words, sections, links, errors }, counted like the build does
    const s = src || "", errors = [];
    let links = 0;
    for (const m of s.matchAll(/\]\(([^)\s]+)\)/g)) {
      const h = m[1], b = /^brand:([a-z0-9-]+)$/.exec(h);
      if (b) { links++; if (!findBrand(b[1])) errors.push(`${label}: مفيش كود اسمه ${b[1]}`); }
      else if (/^page:\/[A-Za-z0-9/-]*$/.test(h)) links++;
      else if (!/^https:\/\//.test(h)) errors.push(`${label}: اللينك ${h} لازم يبدأ بـ brand: أو page:/ أو https://`);
    }
    for (const m of s.matchAll(/\{\{(?:code|offer):([a-z0-9-]+)\}\}/g)) if (!findBrand(m[1])) errors.push(`${label}: مفيش كود اسمه ${m[1]}`);
    for (const m of s.matchAll(/^\[\[codes:\s*([a-z0-9,\s-]+)\]\]\s*$/gm)) for (const k of m[1].split(/[\s,]+/).filter(Boolean)) { links++; if (!findBrand(k)) errors.push(`${label}: مفيش كود اسمه ${k}`); }
    const words = (s.replace(/\[\[codes:[^\]]*\]\]/g, "").replace(/\{\{[^}]*\}\}/g, "x").replace(/\]\([^)]*\)/g, "]").match(/[\p{L}\p{N}]+/gu) || []).length;
    return { words, sections: (s.match(/^## /gm) || []).length, links, errors };
  }
  const postUses = (p, key) => (p.brands || []).includes(key) || [p.body.ar, p.body.en, ...(p.faq || []).flatMap((q) => [q.a.ar, q.a.en])]
    .some((s) => new RegExp(`(?:brand:|\\{\\{(?:code|offer):)${key}(?![a-z0-9-])|\\[\\[codes:[^\\]]*(?<![a-z0-9-])${key}(?![a-z0-9-])`).test(s || ""));
  function blogForm(isNew) {
    return {
      slug: text("لينك المقال", { req: true, dir: "ltr", pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, patternMsg: "حروف إنجليزي صغيرة وأرقام وشَرطة - بس",
        hint: isNew ? "زي white-friday-2026: المقال بيبقى على foodidu.com/ar/blog/white-friday-2026/. ما بيتغيرش بعد كده." : "ثابت عشان ما نخسرش ترتيب المقال في جوجل." }),
      status: select("الحالة", [["draft", "مسودة: مخفية عن جوجل، ومش متلينكة من أي صفحة"], ["published", "منشور: يظهر في المدونة وجوجل"]],
        { hint: `النشر بيرفض المقال لو أقل من ${BLOG_MIN.words} كلمة، أو فيه أقل من ${BLOG_MIN.sections} أقسام (##)، أو أقل من ${BLOG_MIN.links} لينكات لصفحات الأكواد. المسودة بتتحفظ عادي.` }),
      updated: date("آخر تحديث", { today: true, hint: "غيّره لما تحدّث معلومة في المقال. تاريخ النشر بيتحط لوحده أول ما تنشره." }),
      seasonEnd: date("الموسم بيخلص يوم (اختياري)", { hint: "لمقالات المواسم زي الجمعة البيضاء: بعد اليوم ده بيظهر في المقال إن الموسم خلص، لحد ما تحدّثه." }),
      brands: multi("الأكواد اللي في المقال", S.data.brands.brands.map((b) => [b.key, b.name.ar]), { hint: "بتظهر جنب المقال، والمقال بيظهر في صفحة كل كود منهم." }),
      seo: seo(),
      h1: bi("العنوان في الصفحة", { req: true }),
      lede: bi("المقدمة", { req: true, area: true, hint: "سطرين تحت العنوان." }),
      body: bi("المقال", { req: true, area: true, rows: 22, hint: MD_HELP }),
      faq: list("أسئلة شائعة (اختياري)", () => group({ q: bi("السؤال", { req: true }), a: bi("الإجابة", { req: true, area: true }) }), { item: "سؤال", add: "سؤال" })
    };
  }
  function blogEditor(slug) {
    const p = slug && S.data.blog.posts.find((x) => x.slug === slug), isNew = !p, f = blogForm(isNew);
    const cur = p ? clone(p) : { status: "draft", updated: today(), brands: [] };
    for (const [k, x] of Object.entries(f)) x.set(cur[k]);
    if (!isNew) f.slug.input.disabled = true;
    return editor(isNew ? "مقال جديد" : `تعديل ${p.h1.ar}`, f, async () => {
      const v = collect(f);
      if (isNew && S.data.blog.posts.some((x) => x.slug === v.slug)) throw new Error("فيه مقال تاني بنفس اللينك. غيّره.");
      const others = [...entities(), ...S.data.blog.posts.filter((x) => x !== p)];
      for (const l of ["ar", "en"]) {
        if (others.some((x) => x.seo && x.seo[l] && x.seo[l].title === v.seo[l].title)) throw new Error(`عنوان جوجل (${l === "ar" ? "عربي" : "English"}) نفس عنوان صفحة تانية. كل صفحة لازم عنوانها مختلف.`);
        if (others.some((x) => x.seo && x.seo[l] && x.seo[l].description === v.seo[l].description)) throw new Error(`وصف جوجل (${l === "ar" ? "عربي" : "English"}) نفس وصف صفحة تانية.`);
      }
      const next = { ...(isNew ? {} : clone(p)), key: v.slug, slug: v.slug, status: v.status, updated: v.updated || today(), brands: v.brands, seo: v.seo, h1: v.h1, lede: v.lede, body: v.body };
      if (v.seasonEnd) next.seasonEnd = v.seasonEnd; else delete next.seasonEnd;
      if (v.faq.length) next.faq = v.faq; else delete next.faq;
      if (v.status === "published" && (!p || p.status !== "published")) { next.published = today(); next.updated = today(); }   // it goes live today
      if (!isNew && same(next, p, POST_KEYS)) return false;
      if (isNew) {   // an article that comes back after a delete: drop its 301s
        const gone = new Set(["", "/ar"].flatMap((ar) => [`${ar}/blog/${v.slug}`, `${ar}/blog/${v.slug}/`])), red = S.data.firebase.hosting.redirects, keep = red.filter((r) => !gone.has(r.source));
        if (keep.length !== red.length) { S.data.firebase.hosting.redirects = keep; S.dirty.add("firebase"); }
      }
      const arr = S.data.blog.posts, i = arr.findIndex((x) => x.slug === next.slug);
      if (i < 0) arr.push(ordered(next, POST_KEYS)); else arr[i] = ordered(next, POST_KEYS);
      change("blog", `${isNew ? "Add" : "Edit"} article ${next.slug}${next.status === "published" ? "" : " (draft)"}`);
    }, { check: () => {
      const e = [];
      for (const [l, name] of [["ar", "المقال (عربي)"], ["en", "المقال (English)"]]) {
        const r = mdCheck(f.body.get()[l], name);
        e.push(...r.errors);
        if (f.status.get() !== "published") continue;
        if (r.words < BLOG_MIN.words) e.push(`${name}: ${r.words} كلمة بس، والنشر محتاج ${BLOG_MIN.words} على الأقل. احفظه مسودة لحد ما يكمل.`);
        if (r.sections < BLOG_MIN.sections) e.push(`${name}: محتاج ${BLOG_MIN.sections} أقسام على الأقل (سطر بيبدأ بـ ##).`);
        if (r.links < BLOG_MIN.links) e.push(`${name}: محتاج ${BLOG_MIN.links} لينكات على الأقل لصفحات الأكواد (brand: أو page: أو [[codes: ...]]).`);
      }
      f.faq.get().forEach((q, i) => { for (const l of ["ar", "en"]) e.push(...mdCheck(q.a[l], `السؤال ${i + 1}`).errors); });
      return e;
    } });
  }
  function removePost(p) {
    if (!confirm(`تمسح مقال "${p.h1.ar}"؟` + (p.status === "published" ? " لينكه هيحوّل لوحده (301) عشان ما نخسرش زوار جوجل." : ""))) return;
    const arr = S.data.blog.posts;
    arr.splice(arr.indexOf(p), 1);
    if (p.status === "published") {
      const to = arr.some((x) => x.status === "published") ? "/blog/" : "/promo-codes/", red = S.data.firebase.hosting.redirects;
      for (const ar of ["", "/ar"]) for (const end of ["", "/"]) { const source = `${ar}/blog/${p.slug}${end}`; if (!red.some((r) => r.source === source)) red.push({ source, destination: ar + to, type: 301 }); }
      S.dirty.add("firebase");
    }
    change("blog", `Delete article ${p.slug}`);
    render();
  }

  /* ---------- views ---------- */
  function renderBar() {
    const bar = root && root.querySelector(".adm-bar");
    if (!bar) return;
    const n = S.changes.length;
    bar.hidden = !n;
    if (!n) return;
    bar.replaceChildren(
      el("div", { class: "adm-bar-t" }, el("b", { text: n === 1 ? "تغيير واحد لسه ما اتنشرش" : `${n} تغييرات لسه ما اتنشرتش` }), el("span", { text: S.changes.slice(-3).join(" · ") + (n > 3 ? " ..." : "") })),
      el("span", { class: "adm-row" }, btn("انشر على الموقع", onPublish, "sun"), btn("إلغاء", async () => { if (!confirm("هتلغي كل التغييرات اللي ما اتنشرتش؟")) return; await loadData(); render(); }, "ghost")));
  }
  async function onPublish(e) {
    const b = e.currentTarget; b.disabled = true; b.textContent = "بيحفظ...";
    try {
      const sha = await publish();
      await loadData(); render(); watchDeploy(sha);
    } catch (err) {
      b.disabled = false; b.textContent = "انشر على الموقع";
      if (err.conflict || err.status === 422) { alert("في تعديل تاني اتحفظ على GitHub من وقت ما فتحت الصفحة، فمش هينفع نحفظ فوقه. هنحمّل آخر نسخة، وبعدها كرر تعديلك."); await loadData(); render(); }
      else alert("الحفظ ما نجحش: " + err.message + (err.status === 401 ? "\nالمفتاح انتهى أو اتلغى: افصل GitHub واربطه بمفتاح جديد." : err.status === 403 || err.status === 404 ? "\nاتأكد إن مفتاح GitHub ليه صلاحية Contents: Read and write على foodidu_website." : ""));
    }
  }
  function tableOf(cols, rows, actions) {
    return el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" },
      el("thead", null, el("tr", null, cols.map((c) => el("th", { text: c[0] })), el("th", { text: "" }))),
      el("tbody", null, rows.map((r) => el("tr", null, cols.map((c) => { const v = c[1](r); return el("td", { class: c[2] || null }, v && v.nodeType ? v : String(v == null || v === "" ? "–" : v)); }), el("td", { class: "adm-acts" }, actions(r)))))));
  }
  function usage(key) {
    const u = S.data.deals.deals.filter((d) => d.brand === key).map((d) => `عرض الأيام "${d.title.ar}"`);
    if ((S.data.featured.partners || [S.data.featured.partner]).includes(key)) u.push("مساحة العرض المميز");
    if ((S.data.home.heroCodes || []).includes(key)) u.push("كروت أول الصفحة الرئيسية");
    for (const p of S.data.blog.posts) if (postUses(p, key)) u.push(`مقال "${p.h1.ar}"`);
    return u;
  }
  async function removeEntity(kind, e) {
    const u = usage(e.key);
    if (u.length) { alert(`مش هينفع تمسح ${e.name.ar} لأنه مستخدم في: ${u.join("، ")}. غيّر دول الأول.`); return; }
    if (!confirm(`تمسح ${e.name.ar}؟ صفحته هتحوّل لوحدها (301) لصفحة كل الأكواد عشان ما نخسرش زوار جوجل.`)) return;
    const wasSection = kind === "brand" && sectionKeys().has(e.key);
    const arr = kind === "brand" ? S.data.brands.brands : S.data.rests.restaurants;
    arr.splice(arr.findIndex((x) => x.key === e.key), 1);
    const red = S.data.firebase.hosting.redirects;
    for (const [src, dst] of [[`/${e.slug}`, "/promo-codes/"], [`/${e.slug}/`, "/promo-codes/"], [`/ar/${e.slug}`, "/ar/promo-codes/"], [`/ar/${e.slug}/`, "/ar/promo-codes/"]]) if (!red.some((r) => r.source === src)) red.push({ source: src, destination: dst, type: 301 });
    caseRedirects(e.slug, true);
    S.dirty.add("firebase");
    if (e.logo && !entities().some((x) => x.logo === e.logo)) { dropFile(`static/img/brands/${e.logo}`); dropFile(`static/img/brands/${small(e.logo)}`); }
    dropFile(`static/img/og/${e.key}-en.png`); dropFile(`static/img/og/${e.key}-ar.png`);
    delete S.logos[e.key];
    if (wasSection) await renderSections();
    change(kind === "brand" ? "brands" : "rests", `Delete ${e.name.en}`);
    render();
  }
  function editor(title, fields, onSave, o = {}) {
    const errs = el("ul", { class: "adm-errs", hidden: true, role: "alert" });
    const back = () => { S.view = null; render(); };
    const save = btn(o.inline ? "حفظ" : "حفظ وارجع للقايمة", async () => {
      const found = [...Object.values(fields).filter((f) => !f.node.hidden).flatMap((f) => f.check()), ...(o.check ? o.check() : [])];
      errs.replaceChildren(...found.map((m) => el("li", { text: m }))); errs.hidden = !found.length;
      if (found.length) { errs.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      save.disabled = true; save.textContent = o.images ? "بيجهّز الصور..." : "بيحفظ...";
      try { const r = await onSave(); toast(r === false ? "مفيش حاجة اتغيرت." : "اتحفظ. لما تخلص كل تعديلاتك اضغط \"انشر على الموقع\"."); back(); }
      catch (err) { save.disabled = false; save.textContent = "حفظ"; errs.replaceChildren(el("li", { text: err.message })); errs.hidden = false; errs.scrollIntoView({ behavior: "smooth", block: "center" }); }
    });
    return el("div", { class: "adm-editor" },
      el("div", { class: "adm-ed-h" }, el("h3", { text: title }), o.inline ? null : btn("رجوع من غير حفظ", back, "ghost sm")),
      o.top || null, el("div", { class: "adm-group" }, Object.values(fields).map((f) => f.node)), errs,
      el("div", { class: "adm-row adm-ed-f" }, save, o.inline ? null : btn("رجوع من غير حفظ", back, "ghost")));
  }
  function brandEditor(key) {
    const b = key && findBrand(key), isNew = !b, f = brandForm(isNew), logoF = logoField(b);
    const cur = b ? clone(b) : { category: "restaurants", region: "eg", badge: { en: ["", "off"], ar: ["", "خصم"] } };
    const shown = { ...cur, moreCodes: (cur.moreCodes || []).map((m) => ({ ...m, lastVerified: "lastVerified" in m ? m.lastVerified : cur.lastVerified || "" })) };
    for (const [k, x] of Object.entries(f)) x.set(k === "priority" ? cur.priority || "" : shown[k]);
    return editor(isNew ? "كود جديد" : `تعديل ${b.name.ar}`, f, async () => {
      const v = collect(f);
      if (b) {   // a removed code must not stay in the texts Google shows
        const now = new Set([v.code, ...v.moreCodes.map((m) => m.code)].map((c) => c.toLowerCase()));
        const gone = [b.code, ...(b.moreCodes || []).map((m) => m.code)].filter((c) => c && !now.has(c.toLowerCase()));
        const texts = [["عنوان جوجل", v.seo.en.title + " " + v.seo.ar.title], ["وصف جوجل", v.seo.en.description + " " + v.seo.ar.description], ["عن البراند", v.about.en + " " + v.about.ar]];
        const stale = gone.flatMap((c) => texts.filter(([, t]) => new RegExp("(^|[^A-Za-z0-9])" + c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^A-Za-z0-9])", "i").test(t)).map(([n]) => `${n} لسه فيه الكود ${c} اللي اتشال. عدّله.`));
        if (stale.length) throw new Error(stale.join(" "));
      }
      v.moreCodes = v.moreCodes.map((m) => { if (!m.exclusive) delete m.exclusive; if (!m.firstOrder) delete m.firstOrder; if (m.noCode) m.code = ""; else delete m.noCode; if ((m.lastVerified || "") === (v.lastVerified || "")) delete m.lastVerified; return m; });
      const noCode = v.noCode, firstOrder = v.firstOrder;
      clean(v);
      delete v.noCode; delete v.firstOrder;
      const errs = uniqueErrors(v, b); if (errs.length) throw new Error(errs.join(" "));
      const next = Object.assign(isNew ? {} : clone(b), v);
      if (noCode) { next.noCode = true; next.code = ""; } else delete next.noCode;
      if (firstOrder) next.firstOrder = true; else delete next.firstOrder;
      for (const k of ["moreCodes", "regionLabel", "urlLabel", "priority", "lastVerified"]) if (!(k in v)) delete next[k];
      next.url = v.url || "";
      next.logo = cur.logo || "";
      if (!isNew && !logoF.changed() && same(next, b, BRAND_KEYS)) return false;
      await renderImages(next, "brand", logoF);
      const arr = S.data.brands.brands, i = arr.findIndex((x) => x.key === next.key);
      if (i < 0) { arr.push(ordered(next, BRAND_KEYS)); unredirect(next.slug); caseRedirects(next.slug); } else arr[i] = ordered(next, BRAND_KEYS);
      if (sectionKeys().has(next.key)) await renderSections();
      change("brands", `${isNew ? "Add" : "Edit"} ${next.name.en} (${[next.code, ...(next.moreCodes || []).map((m) => m.code)].join(", ")})`);
    }, { top: logoF.node, images: true, check: () => [
      ...(!cur.logo && !logoF.changed() ? ["اللوجو: ارفع صورة"] : []),
      ...(!f.noCode.get() && !f.code.get() ? ["الكود: مطلوب (أو علّم \"خصم من غير كود\")"] : []),
      ...(f.moreCodes.get().some((m) => !m.noCode && !m.code) ? ["الأكواد التانية: الكود مطلوب (أو علّم \"عرض من غير كود\")"] : []),
      ...(f.noCode.get() && f.moreCodes.get().length ? ["الخصم من غير كود ما ينفعش يكون معاه أكواد تانية"] : []),
    ] });
  }
  function restEditor(key) {
    const r = key && S.data.rests.restaurants.find((x) => x.key === key), isNew = !r, f = restForm(isNew), logoF = logoField(r);
    const cur = r ? clone(r) : { offers: [{}] };
    for (const [k, x] of Object.entries(f)) x.set(k === "cuisine" ? (cur.cuisine || []).join(", ") : cur[k]);
    return editor(isNew ? "مطعم جديد" : `تعديل عروض ${r.name.ar}`, f, async () => {
      const v = collect(f);
      v.cuisine = v.cuisine ? v.cuisine.split(",").map((s) => s.trim()).filter(Boolean) : [];
      v.offers = v.offers.map((o) => ({ name: o.name.en === o.name.ar ? o.name.en : o.name, items: o.items, price: o.price, was: o.was }));
      if (v.offers.some((o) => !(o.was > o.price))) throw new Error("العروض: السعر من غير العرض لازم يبقى أكبر من سعر العرض.");
      clean(v);
      const errs = uniqueErrors(v, r); if (errs.length) throw new Error(errs.join(" "));
      const next = Object.assign(isNew ? { category: "restaurants", region: "eg" } : clone(r), v);
      for (const k of ["validUntil", "cuisine"]) if (!(k in v)) delete next[k];
      next.logo = cur.logo || "";
      if (!isNew && !logoF.changed() && same(next, r, REST_KEYS)) return false;
      await renderImages(next, "restaurant", logoF);
      const arr = S.data.rests.restaurants, i = arr.findIndex((x) => x.key === next.key);
      if (i < 0) { arr.push(ordered(next, REST_KEYS)); unredirect(next.slug); caseRedirects(next.slug); } else arr[i] = ordered(next, REST_KEYS);
      change("rests", `${isNew ? "Add" : "Edit"} ${next.name.en} offers`);
    }, { top: logoF.node, images: true, check: () => (!cur.logo && !logoF.changed() ? ["اللوجو: ارفع صورة"] : []) });
  }
  function dealEditor(id) {
    const d = id && S.data.deals.deals.find((x) => x.id === id), isNew = !d, { f, sync } = dealForm(isNew);
    const cur = d ? clone(d) : { region: "eg", icon: "fork", lastChecked: today() };
    for (const [k, x] of Object.entries(f)) x.set(cur[k]);
    sync();
    return editor(isNew ? "عرض يوم جديد" : `تعديل ${d.title.ar}`, f, async () => {
      const v = collect(f), custom = !v.brand;
      if (isNew && S.data.deals.deals.some((x) => x.id === v.id)) throw new Error("المعرّف ده مستخدم قبل كده. غيّره.");
      if (custom && (!v.name.en || !v.name.ar)) throw new Error("اكتب اسم البراند بالعربي والإنجليزي.");
      const next = isNew ? {} : clone(d);
      for (const k of ["brand", "name", "icon", "region", "featured"]) delete next[k];
      if (custom) Object.assign(next, { name: v.name, icon: v.icon, region: v.region }); else next.brand = v.brand;
      if (v.featured) next.featured = true;
      Object.assign(next, { id: v.id, days: DAYS.map(([k]) => k).filter((k) => v.days.includes(k)), title: v.title, details: v.details, source: v.source, sourceLabel: v.sourceLabel, lastChecked: v.lastChecked });
      if (!isNew && same(next, d, DEAL_KEYS)) return false;
      if (v.featured) S.data.deals.deals.forEach((x) => { if (x.id !== v.id) delete x.featured; });   // one deal names the page
      const arr = S.data.deals.deals, i = arr.findIndex((x) => x.id === next.id);
      if (i < 0) arr.push(ordered(next, DEAL_KEYS)); else arr[i] = ordered(next, DEAL_KEYS);
      change("deals", `${isNew ? "Add" : "Edit"} day deal ${next.id}`);
    });
  }
  function featuredEditor() {
    const fe = S.data.featured;
    const partners = [...S.data.rests.restaurants.map((r) => [r.key, r.name.ar + " (عروض مطاعم)"]), ...S.data.brands.brands.map((b) => [b.key, b.name.ar])];
    const f = { active: check("المساحة شغالة", "لو مش متعلّم، المساحة بتختفي من الصفحة الرئيسية."),
      sponsored: check("إعلان مدفوع", "بيكتب \"إعلان\" بدل \"عرض مميز\"، ودي حاجة لازمة لما الشريك يدفع."),
      partners: multi("الشركاء", partners, { req: true, hint: "اختار شريك أو أكتر: كل واحد بيظهر في بانر لوحده جنب التاني." }),
      until: date("تختفي بعد يوم", { hint: "بتختفي لوحدها بعد اليوم ده. سيبه فاضي لو مالهاش نهاية." }),
      title: bi("عنوان بطريقتك (اختياري)", { hint: "لما يكون فيه شريك واحد بس. لو فاضي بيتكتب لوحده من عروض الشريك." }), text: bi("سطر بطريقتك (اختياري)"), cta: bi("نص الزرار (اختياري)"),
      url: text("لينك تاني (اختياري)", { dir: "ltr", hint: "لما يكون فيه شريك واحد بس. لو فاضي بيفتح صفحة الشريك على Foodidu." }) };
    for (const [k, x] of Object.entries(f)) x.set(k === "partners" ? fe.partners || (fe.partner ? [fe.partner] : []) : fe[k]);
    return editor("مساحة \"عرض مميز\" تحت أول الصفحة الرئيسية", f, async () => {
      const v = collect(f), next = { _help: fe._help, active: v.active, sponsored: v.sponsored, partners: v.partners };
      if (v.until) next.until = v.until;
      for (const k of ["title", "text", "cta"]) if (v[k].en || v[k].ar) next[k] = v[k];
      if (v.url) next.url = v.url;
      if (JSON.stringify(next) === JSON.stringify(fe)) return false;
      S.data.featured = next;
      change("featured", `Featured slot: ${v.partners.join(", ")}${v.active ? "" : " (off)"}`);
    }, { inline: true });
  }
  function homeEditor() {
    const opts = S.data.brands.brands.map((b) => [b.key, `${b.name.ar} · ${b.code}`]);
    const f = { a: select("الكارت الأول (فوق)", opts), b: select("الكارت التاني", opts), c: select("الكارت التالت", opts) };
    const cur = S.data.home.heroCodes || [];
    f.a.set(cur[0]); f.b.set(cur[1]); f.c.set(cur[2]);
    return editor("كروت الأكواد في أول الصفحة الرئيسية", f, async () => {
      const v = [f.a.get(), f.b.get(), f.c.get()];
      if (new Set(v).size < 3) throw new Error("اختار 3 أكواد مختلفة.");
      if (v.join() === cur.join()) return false;
      S.data.home.heroCodes = v;
      change("home", `Home cards: ${v.join(", ")}`);
    }, { inline: true });
  }

  // brands as the site lists them: priority "top", then normal, then "low", each in brands.json order
  const siteOrder = () => ["top", "", "low"].flatMap((p) => S.data.brands.brands.filter((b) => (b.priority || "") === p));
  function move(b, step) {   // swap with the next brand of the same priority group in brands.json
    const arr = S.data.brands.brands, same = arr.filter((x) => (x.priority || "") === (b.priority || ""));
    const other = same[same.indexOf(b) + step];
    if (!other) return;
    const i = arr.indexOf(b), j = arr.indexOf(other);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    change("brands", `Move ${b.name.en} ${step < 0 ? "up" : "down"}`);
    render();
  }
  const open = (fn) => () => { S.view = fn; render(); root.scrollIntoView({ behavior: "smooth", block: "start" }); };
  function render() {
    if (!root) return;
    if (!token) return renderConnect();
    if (!S.loaded) { root.replaceChildren(el("p", { class: "dash-note", text: "بيحمّل البيانات من GitHub..." })); return; }
    const tabs = [["brands", `الأكواد (${S.data.brands.brands.length})`], ["rests", `عروض المطاعم (${S.data.rests.restaurants.length})`], ["deals", `عروض الأيام (${S.data.deals.deals.length})`], ["blog", `المدونة (${S.data.blog.posts.length})`], ["featured", "العرض المميز"], ["home", "كروت الرئيسية"]];
    let body;
    if (S.view) body = S.view();
    else if (S.tab === "brands") body = el("div", null, el("p", { class: "adm-add" }, btn("+ كود جديد", open(() => brandEditor(null)))),
      tableOf([["البراند", (b) => b.name.ar], ["الكود", (b) => (b.noCode ? "بدون كود" : el("code", { text: [b.code, ...(b.moreCodes || []).map((m) => m.code || "بدون كود")].join(" · ") }))], ["العرض", (b) => b.offer.ar],
        ["آخر تجربة", (b) => b.lastVerified || "ما اتجربش", "adm-date"], ["الترتيب", (b) => ({ top: "أولوية أولى", low: "في الآخر" })[b.priority] || "عادي"]],
      siteOrder(), (b) => [btn("↑", () => move(b, -1), "ghost sm"), btn("↓", () => move(b, 1), "ghost sm"), btn("تعديل", open(() => brandEditor(b.key)), "ghost sm"),
        b.lastVerified !== today() || (b.moreCodes || []).some((m) => "lastVerified" in m) ? btn(b.moreCodes && b.moreCodes.length ? "جربت أكوادها النهارده" : "جربته النهارده", () => { b.lastVerified = today(); (b.moreCodes || []).forEach((m) => { delete m.lastVerified; }); change("brands", `Checked ${b.name.en} today`); render(); }, "ghost sm") : null,
        btn("حذف", () => removeEntity("brand", b), "ghost sm danger")]));
    else if (S.tab === "rests") body = el("div", null, el("p", { class: "adm-add" }, btn("+ مطعم جديد", open(() => restEditor(null)))),
      tableOf([["المطعم", (r) => r.name.ar], ["العروض", (r) => r.offers.length], ["سارية لحد", (r) => r.validUntil, "adm-date"], ["آخر مراجعة", (r) => r.lastChecked, "adm-date"]],
        S.data.rests.restaurants, (r) => [btn("تعديل", open(() => restEditor(r.key)), "ghost sm"), btn("حذف", () => removeEntity("restaurant", r), "ghost sm danger")]));
    else if (S.tab === "deals") body = el("div", null, el("p", { class: "adm-add" }, btn("+ عرض يوم جديد", open(() => dealEditor(null)))),
      tableOf([["العرض", (d) => d.title.ar], ["البراند", (d) => (d.brand ? (entities().find((x) => x.key === d.brand) || { name: { ar: d.brand } }).name.ar : d.name && d.name.ar)],
        ["الأيام", (d) => d.days.map((k) => (DAYS.find((x) => x[0] === k) || [k, k])[1]).join("، ")], ["آخر مراجعة", (d) => d.lastChecked, "adm-date"]],
      S.data.deals.deals, (d) => [btn("تعديل", open(() => dealEditor(d.id)), "ghost sm"),
        btn("حذف", () => { if (!confirm(`تمسح عرض "${d.title.ar}"؟`)) return; S.data.deals.deals.splice(S.data.deals.deals.findIndex((x) => x.id === d.id), 1); change("deals", `Delete day deal ${d.id}`); render(); }, "ghost sm danger")]));
    else if (S.tab === "blog") body = el("div", null, el("p", { class: "adm-add" }, btn("+ مقال جديد", open(() => blogEditor(null)))),
      tableOf([["المقال", (p) => p.h1.ar], ["الحالة", (p) => el("span", { class: "chip-s " + (p.status === "published" ? "good" : "warning"), text: p.status === "published" ? "منشور" : "مسودة" })],
        ["النشر", (p) => p.published, "adm-date"], ["آخر تحديث", (p) => p.updated, "adm-date"]],
      S.data.blog.posts, (p) => [btn("تعديل", open(() => blogEditor(p.slug)), "ghost sm"),
        el("a", { class: "dash-btn ghost sm", href: `https://foodidu.com/ar/blog/${p.slug}/`, target: "_blank", rel: "noopener", text: p.status === "published" ? "افتحه" : "شوف المسودة" }),
        btn("حذف", () => removePost(p), "ghost sm danger")]));
    else if (S.tab === "featured") body = featuredEditor();
    else body = homeEditor();
    root.replaceChildren(
      el("div", { class: "adm-top" },
        el("span", { class: "adm-row" }, el("span", { class: "chip-s good", text: "متوصل بـ GitHub" }), el("a", { href: `https://github.com/${REPO}/commits/${BRANCH}`, target: "_blank", rel: "noopener", class: "adm-small", text: "سجل التعديلات" })),
        el("span", { class: "adm-row" }, btn("تحديث", async () => { if (S.changes.length && !confirm("هتلغي التغييرات اللي ما اتنشرتش. متأكد؟")) return; await loadData(); render(); }, "ghost sm"),
          btn("فصل GitHub", () => { if (!confirm("هتمسح مفتاح GitHub من المتصفح ده؟")) return; store.del(TOKEN_KEY); token = null; S.loaded = false; render(); }, "ghost sm"))),
      deployBox,
      el("nav", { class: "adm-tabs", "aria-label": "أنواع المحتوى" }, tabs.map(([k, t]) => el("button", { type: "button", "aria-pressed": String(S.tab === k), text: t, onclick: () => { S.tab = k; S.view = null; render(); } }))),
      body, el("div", { class: "adm-bar", hidden: true }));
    renderBar();
  }
  function renderConnect() {
    const input = el("input", { type: "password", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_...", dir: "ltr", "aria-label": "مفتاح GitHub" });
    const go = btn("ربط", async () => {
      const v = input.value.trim(); if (!v) return;
      go.disabled = true; token = v;
      try { await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`); }
      catch (e) { token = null; go.disabled = false; alert("المفتاح ده مش شغال: " + e.message); return; }
      store.set(TOKEN_KEY, v); start();
    });
    root.replaceChildren(el("div", { class: "dash-note adm-connect" },
      el("p", null, el("b", { text: "اربط لوحة التحكم بـ GitHub مرة واحدة على الجهاز ده: " }), "التعديلات بتتحفظ في ملفات الموقع على GitHub، والموقع بيتنشر لوحده بعدها."),
      el("ol", null,
        el("li", null, "افتح ", el("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener", text: "صفحة مفتاح GitHub جديد" }), " وانت داخل بحساب Abdelrahmann1."),
        el("li", { text: "Token name: Foodidu dashboard. Expiration: سنة. Repository access: Only select repositories واختار foodidu_website." }),
        el("li", { text: "Permissions: Contents = Read and write، و Actions = Read-only. وبعدين Generate token." }),
        el("li", { text: "انسخ المفتاح وحطه هنا. بيتحفظ في المتصفح ده بس، وما بيتبعتش لأي حد غير GitHub." })),
      el("div", { class: "adm-row" }, input, go)));
  }
  async function start() {
    S.loaded = false; render();
    try { await loadData(); }
    catch (e) {
      root.replaceChildren(el("div", { class: "dash-note" }, el("p", { text: "ما قدرناش نحمّل البيانات من GitHub: " + e.message }), e.status === 401 ? el("p", { text: "المفتاح انتهى أو اتلغى." }) : null,
        el("p", { class: "adm-row" }, btn("جرّب تاني", start), btn("فصل GitHub", () => { store.del(TOKEN_KEY); token = null; render(); }, "ghost"))));
      return;
    }
    render();
  }
  window.addEventListener("beforeunload", (e) => { if (S.changes.length) { e.preventDefault(); e.returnValue = ""; } });
  return {
    mount(container, repo) { root = container; REPO = repo; token = store.get(TOKEN_KEY); if (token) start(); else render(); },
    _test: { S, toJSON }
  };
})();
