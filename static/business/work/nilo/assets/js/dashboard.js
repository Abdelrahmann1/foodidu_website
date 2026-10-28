/* NILO gelato — the owner's dashboard, a demo by Foodidu Business.
   The orders and the numbers are sample data made in this browser (localStorage 'nilo-dash'). The flavors and the
   branches are the site's own (data.js); what the owner changes here is kept in localStorage 'nilo-admin', which
   data.js reads, so the flavors and locations pages show it at once (they reload when it changes). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.NILO_ART, D = window.NILO_DATA, AR = D.AR, t = D.t, TODAY = D.today;
  const FL = D.FLAVORS, BR = D.LOCATIONS, byFl = Object.fromEntries(FL.map((f) => [f.key, f])), byBr = Object.fromEntries(BR.map((b) => [b.key, b]));
  const body = document.body, ROOT = body.dataset.root, OTHER = body.dataset.other, BACK = body.dataset.back;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const UI = {
    en: {
      title: 'Owner dashboard', views: { overview: 'Overview', orders: 'Orders', flavors: 'Flavors', branches: 'Branches' },
      hi: (h) => (h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'),
      demo: 'A demo by Foodidu Business: the orders and numbers are sample data, and your changes are saved in this browser only.',
      reset: 'Reset the demo', resetDone: 'The demo is back to the start.', site: 'Open the website', back: 'Back to Foodidu Business', lang: 'العربية', live: 'Taking orders',
      kOrders: 'Orders today', kSales: 'Sales today', kAvg: 'Average order', kOpen: 'Open now',
      sOrders: (w, p) => `${w} waiting · ${p} preparing`, sSales: (d) => `${d}% delivery`, sAvg: (s) => `${s} scoops sold today`, sOpen: (n) => `of ${n} branches`,
      cDays: 'Orders, last 14 days', cDaysNote: 'Today is the lighter bar: the day is not over yet.', today: 'Today', soFar: 'so far',
      cTop: 'Best sellers this week', scoops: 'scoops', share: (p) => `${p}% of all scoops`, cBr: 'Orders by branch this week', ordersN: (n) => `${n} orders`, sales: 'sales',
      attention: 'Needs your attention', allGood: 'All good: nothing is waiting.',
      aNew: (n) => `${n} new ${n === 1 ? 'order is' : 'orders are'} waiting`, aOut: (s) => `Sold out today: ${s}`, aClosed: (s) => `Closed today: ${s}`, go: 'Open',
      colNew: 'New', colPrep: 'Preparing', colReady: 'Ready', done: (n) => `${n} orders handed over today`, empty: 'Nothing here right now.',
      next: { new: 'Start preparing', prep: 'Mark as ready', ready: 'Handed over' }, delivery: 'Delivery', pickup: 'Pickup', fee: 'delivery',
      newOrder: (n) => `New order #${n}`, moved: { prep: 'Preparing', ready: 'Ready for the customer', done: 'Handed over' },
      flSub: (a, n) => `${a} of ${n} flavors are available today. What you change here shows on the website right away.`,
      avail: 'Available today', isNew: 'Show as new', seeFl: 'See the flavors page', outBadge: 'Sold out today',
      brSub: 'Opening hours and closures show on the locations page right away.', seeBr: 'See the locations page',
      opens: 'Opens', closes: 'Closes', closedToday: 'Closed today', summer: 'Summer only: June to September',
      saved: 'Saved. The website shows it now.',
      sizes: { cup1: 'Cup, 1 scoop', cup2: 'Cup, 2 scoops', cone: 'Cone, 2 scoops', pint: 'Pint, 500 g' },
      names: ['Mariam', 'Omar', 'Nour', 'Youssef', 'Salma', 'Karim', 'Hana', 'Ali', 'Farida', 'Ziad', 'Laila', 'Hassan', 'Malak', 'Adam'],
      money: (n) => `EGP ${n.toLocaleString('en-US')}`, table: 'Data table',
    },
    ar: {
      title: 'لوحة التحكم', views: { overview: 'نظرة عامة', orders: 'الطلبات', flavors: 'النكهات', branches: 'الفروع' },
      hi: (h) => (h >= 5 && h < 12 ? 'صباح الخير' : 'مساء الخير'),
      demo: 'نسخة للعرض من فوديدو بيزنس: الطلبات والأرقام بيانات تجريبية، وتعديلاتك بتتحفظ على المتصفح ده بس.',
      reset: 'رجّع الديمو من الأول', resetDone: 'الديمو رجع من الأول.', site: 'افتح الموقع', back: 'رجوع لفوديدو بيزنس', lang: 'English', live: 'بنستقبل طلبات',
      kOrders: 'طلبات النهارده', kSales: 'مبيعات النهارده', kAvg: 'متوسط الطلب', kOpen: 'مفتوح دلوقتي',
      sOrders: (w, p) => `${w} مستني · ${p} بيتحضّر`, sSales: (d) => `${d}% توصيل`, sAvg: (s) => `${s} سكوب اتباع النهارده`, sOpen: (n) => `من ${n} فروع`,
      cDays: 'الطلبات في آخر 14 يوم', cDaysNote: 'النهارده هو العمود الفاتح: اليوم لسه مخلصش.', today: 'النهارده', soFar: 'لحد دلوقتي',
      cTop: 'الأكثر مبيعًا الأسبوع ده', scoops: 'سكوب', share: (p) => `${p}% من كل السكوبات`, cBr: 'الطلبات حسب الفرع الأسبوع ده', ordersN: (n) => `${n} طلب`, sales: 'مبيعات',
      attention: 'محتاج تبص عليه', allGood: 'كله تمام: مفيش حاجة مستنية.',
      aNew: (n) => `${n} ${n === 1 ? 'طلب جديد مستني' : 'طلبات جديدة مستنية'}`, aOut: (s) => `خلصت النهارده: ${s}`, aClosed: (s) => `مقفول النهارده: ${s}`, go: 'افتح',
      colNew: 'جديد', colPrep: 'بيتحضّر', colReady: 'جاهز', done: (n) => `${n} طلب اتسلّم النهارده`, empty: 'مفيش حاجة هنا دلوقتي.',
      next: { new: 'ابدأ التحضير', prep: 'خلّيه جاهز', ready: 'اتسلّم' }, delivery: 'توصيل', pickup: 'استلام', fee: 'توصيل',
      newOrder: (n) => `طلب جديد #${n}`, moved: { prep: 'بيتحضّر', ready: 'جاهز للعميل', done: 'اتسلّم' },
      flSub: (a, n) => `${a} من ${n} نكهة موجودين النهارده. أي تعديل هنا بيظهر على الموقع على طول.`,
      avail: 'موجودة النهارده', isNew: 'اعرضها كجديدة', seeFl: 'شوف صفحة النكهات', outBadge: 'خلصت النهارده',
      brSub: 'المواعيد وقفل الفروع بيظهروا في صفحة الفروع على طول.', seeBr: 'شوف صفحة الفروع',
      opens: 'بيفتح', closes: 'بيقفل', closedToday: 'مقفول النهارده', summer: 'الصيف بس: من يونيو لسبتمبر',
      saved: 'اتحفظ. الموقع بيعرضه دلوقتي.',
      sizes: { cup1: 'كوباية سكوب واحد', cup2: 'كوباية 2 سكوب', cone: 'كون 2 سكوب', pint: 'علبة 500 جم' },
      names: ['مريم', 'عمر', 'نور', 'يوسف', 'سلمى', 'كريم', 'هنا', 'علي', 'فريدة', 'زياد', 'ليلى', 'حسن', 'ملك', 'آدم'],
      money: (n) => `${n.toLocaleString('en-US')} ج.م`, table: 'جدول البيانات',
    },
  }[D.L];

  /* ---------- the menu prices and the sample orders ---------- */
  const SIZES = { cup1: { p: 75, scoops: 1, n: 1, w: 30 }, cup2: { p: 130, scoops: 2, n: 2, w: 34 }, cone: { p: 135, scoops: 2, n: 2, w: 22 }, pint: { p: 290, scoops: 4, n: 1, w: 14 } };
  const W_FL = { pistachio: 9, mango: 8, roz: 7, chocolate: 7, dates: 6, cookies: 6, karkadeh: 5, coffee: 5, fior: 4, strawberry: 4, guava: 4, lemonmint: 4 };
  const W_BR = { zamalek: 42, maadi: 30, newcairo: 28, sahel: 34 };
  const FEE = 25;
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const pickW = (r, keys, w) => { const sum = keys.reduce((s, k) => s + w[k], 0); let x = r() * sum; for (const k of keys) { x -= w[k]; if (x < 0) return k; } return keys[keys.length - 1]; };
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const inSeason = (b, d) => !b.months || b.months.includes(d.getMonth() + 1);

  function makeOrder(r, at, flavors, branches) {
    const nItems = r() < 0.55 ? 1 : r() < 0.72 ? 2 : 3, items = [];
    for (let i = 0; i < nItems; i++) {
      const s = pickW(r, Object.keys(SIZES), Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v.w])));
      items.push({ s, f: Array.from({ length: SIZES[s].n }, () => pickW(r, flavors, W_FL)), q: r() < 0.85 ? 1 : 2 });
    }
    const br = pickW(r, branches, W_BR), ch = r() < 0.58 ? 'delivery' : 'pickup';
    const total = items.reduce((s, it) => s + SIZES[it.s].p * it.q, 0) + (ch === 'delivery' ? FEE : 0);
    return { at, br, ch, items, total, who: Math.floor(r() * UI.names.length) };
  }
  // one day of sample orders, the same every time for the same date
  function dayOrders(d) {
    const r = rng(hash('nilo' + dayKey(d))), wd = d.getDay();
    const n = Math.round((wd === 5 || wd === 6 ? 104 : wd === 4 ? 90 : 68) * (0.86 + r() * 0.28));
    const brs = BR.filter((b) => inSeason(b, d)).map((b) => b.key);
    return Array.from({ length: n }, () => makeOrder(r, 0, FL.map((f) => f.key), brs));
  }

  /* ---------- what is saved in this browser ---------- */
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked: the demo still works until reload */ } };
  const admin = load('nilo-admin'); admin.flavors = admin.flavors || {}; admin.branches = admin.branches || {};
  const saveAdmin = () => store('nilo-admin', admin);
  const fa = (k) => admin.flavors[k] || {}, ba = (k) => admin.branches[k] || {};
  const soldOut = (k) => fa(k).soldOut === TODAY;
  const isNewF = (f) => (typeof fa(f.key).isNew === 'boolean' ? fa(f.key).isNew : !!f.isNew);
  const hours = (b) => { const a = ba(b.key); return a.open >= 0 && a.close > a.open ? [a.open, a.close] : [b.open, b.close]; };
  const closedToday = (b) => ba(b.key).closedOn === TODAY;

  // today's orders: the ones from earlier today (how many is fixed on the first visit of the day), then the live ones
  let dash = load('nilo-dash');
  const now0 = new Date();
  if (dash.day !== TODAY) {
    const H = now0.getHours() + now0.getMinutes() / 60, h = H < 6 ? H + 24 : H, progress = Math.min(1, Math.max(0, (h - 12) / 13));
    const full = dayOrders(now0).length;
    dash = { day: TODAY, base: Math.max(16, Math.round(full * progress)), live: [], st: {} };
  }
  const saveDash = () => store('nilo-dash', dash);
  const FIRST = 1001;
  function earlier() {
    const list = dayOrders(now0).slice(0, dash.base), span = 8 * 3600e3, end = now0.getTime() - 6 * 60e3;
    return list.map((o, i) => ({ ...o, id: FIRST + i, at: end - span + (span * (i + 1)) / list.length }));
  }
  const BASE = earlier();
  // the last few of them are still in the kitchen when the dashboard opens
  const startSt = (i) => { const k = BASE.length - 1 - i; return k === 0 || k === 1 ? 'new' : k === 2 || k === 3 ? 'prep' : k === 4 ? 'ready' : 'done'; };
  const orders = () => [...BASE.map((o, i) => ({ ...o, st: dash.st[o.id] || startSt(i) })), ...dash.live.map((o) => ({ ...o, st: dash.st[o.id] || 'new' }))];

  /* ---------- small helpers ---------- */
  const tf = new Intl.DateTimeFormat(AR ? 'ar-EG-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  const df = new Intl.DateTimeFormat(AR ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const sf = new Intl.DateTimeFormat(AR ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const ICON = {
    overview: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    orders: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    flavors: '<path d="M7 10a5 5 0 0 1 10 0M6 10h12l-6 11z"/>',
    branches: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    delivery: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17h7M3 13h9l2-6h3l3 6M12 13V9"/>',
    pickup: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
  };
  const ic = (k, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const tubArt = (k, seed) => { const a = A.tub({ flavor: k, seed }); return A.svg(a.vb, a.body); };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2800);
  }
  // one tooltip for every chart
  const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('aria-hidden', 'true'); body.appendChild(tip);
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.min(innerWidth - w - 8, Math.max(8, x - w / 2))}px`;
    tip.style.top = `${Math.max(8, y - h - 12)}px`;
  }
  const hideTip = () => tip.classList.remove('on');

  /* ---------- the frame: side bar, phone tab bar, demo note ---------- */
  const VIEWS = ['overview', 'orders', 'flavors', 'branches'];
  const navLinks = () => VIEWS.map((v) => `<a href="#${v}" data-v="${v}">${ic(v)}<span>${UI.views[v]}</span>${v === 'orders' ? '<b class="badge" hidden></b>' : ''}</a>`).join('');
  $('#nav').innerHTML = navLinks();
  $('#tabbar').innerHTML = navLinks();
  const links = `<a href="${ROOT}">${ic('ext')}<span>${UI.site}</span></a><a href="${OTHER}" lang="${AR ? 'en' : 'ar'}">${ic('globe')}<span>${UI.lang}</span></a><a href="${BACK}">${ic('back', 'flip')}<span>${UI.back}</span></a>`;
  $('#sideFoot').innerHTML = links;
  $('#mtop').innerHTML = `<a class="d-logo" href="#overview"><span class="d-mark" data-art="cone" data-scoops="mango" data-seed="4"></span><span><b>nilo</b><small>${UI.title}</small></span></a>`
    + `<span class="mtop-links"><a href="${OTHER}" lang="${AR ? 'en' : 'ar'}" aria-label="${UI.lang}">${ic('globe')}</a><a href="${ROOT}" aria-label="${UI.site}">${ic('ext')}</a></span>`;
  $('#sideLogo small').textContent = UI.title;
  $('#demo').innerHTML = `<p>${UI.demo}</p><button type="button" id="reset">${ic('reset')}${UI.reset}</button><a class="demo-back" href="${BACK}">${UI.back}</a>`;
  $$('[data-art]').forEach((el) => A.render(el));
  $('#reset').addEventListener('click', () => {
    try { localStorage.removeItem('nilo-admin'); localStorage.removeItem('nilo-dash'); } catch (e) { /* nothing saved */ }
    sessionStorage.setItem('nilo-reset', '1'); location.reload();
  });
  if (sessionStorage.getItem('nilo-reset')) { sessionStorage.removeItem('nilo-reset'); setTimeout(() => toast(UI.resetDone), 400); }

  function header() {
    const n = new Date();
    $('#top').innerHTML = `<div><h1>${view === 'overview' ? UI.hi(n.getHours()) : UI.views[view]}</h1><p>${df.format(n)}</p></div><span class="live"><i></i>${UI.live}</span>`;
  }

  /* ---------- overview ---------- */
  function lastDays(n) {
    const out = [];
    for (let i = n - 1; i >= 1; i--) { const d = new Date(now0); d.setDate(d.getDate() - i); const os = dayOrders(d); out.push({ d, os, n: os.length, sales: os.reduce((s, o) => s + o.total, 0) }); }
    const os = orders();
    out.push({ d: new Date(now0), os, n: os.length, sales: os.reduce((s, o) => s + o.total, 0), today: true });
    return out;
  }
  function brStatus(b) {
    const n = new Date(), H = n.getHours() + n.getMinutes() / 60, h = H < 6 ? H + 24 : H, [o, c] = hours(b);
    if (!inSeason(b, n)) return ['closed', D.UI.backIn];
    if (closedToday(b)) return ['closed', UI.closedToday];
    return h >= o && h < c ? ['open', D.UI.openNow] : ['closed', D.UI.opensAt(D.UI.hour(o))];
  }
  function overview() {
    const os = orders(), sales = os.reduce((s, o) => s + o.total, 0), wait = os.filter((o) => o.st === 'new').length, prep = os.filter((o) => o.st === 'prep').length;
    const deliv = os.filter((o) => o.ch === 'delivery').length, scoops = os.reduce((s, o) => s + o.items.reduce((a, it) => a + SIZES[it.s].scoops * it.q, 0), 0);
    const openN = BR.filter((b) => brStatus(b)[0] === 'open').length;
    const kpi = (cls, label, value, sub) => `<li class="kpi ${cls}"><p class="k-l">${label}</p><p class="k-v">${value}</p><p class="k-s">${sub}</p></li>`;
    const days = lastDays(14), week = days.slice(-7);
    // best sellers and branches over the last 7 days
    const fs = {}, bs = {};
    week.forEach((d) => d.os.forEach((o) => {
      bs[o.br] = bs[o.br] || { n: 0, s: 0 }; bs[o.br].n++; bs[o.br].s += o.total;
      o.items.forEach((it) => it.f.forEach((k) => { fs[k] = (fs[k] || 0) + (SIZES[it.s].scoops / it.f.length) * it.q; }));
    }));
    const allScoops = Object.values(fs).reduce((a, b) => a + b, 0);
    const top = Object.entries(fs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ k, v: Math.round(v) }));
    const brs = BR.map((b) => ({ b, n: (bs[b.key] || {}).n || 0, s: (bs[b.key] || {}).s || 0 })).sort((a, b) => b.n - a.n);
    // what needs the owner
    const outs = FL.filter((f) => soldOut(f.key)).map((f) => t(f.name)), shut = BR.filter((b) => closedToday(b)).map((b) => t(b.name));
    const att = [];
    if (wait) att.push(['sun', UI.aNew(wait), '#orders']);
    if (outs.length) att.push(['pink', UI.aOut(outs.join(AR ? '، ' : ', ')), '#flavors']);
    if (shut.length) att.push(['peach', UI.aClosed(shut.join(AR ? '، ' : ', ')), '#branches']);

    $('#v-overview').innerHTML = `<h2 class="sr">${UI.views.overview}</h2>
      <ul class="kpis">${kpi('k-sun', UI.kOrders, os.length, UI.sOrders(wait, prep))}${kpi('k-pink', UI.kSales, UI.money(sales), UI.sSales(pct(deliv, os.length)))}
        ${kpi('k-pista', UI.kAvg, UI.money(Math.round(sales / Math.max(1, os.length))), UI.sAvg(scoops))}${kpi('k-peach', UI.kOpen, openN, UI.sOpen(BR.length))}</ul>
      <div class="ov-grid">
        <section class="card c-days" aria-labelledby="cDays"><div class="c-head"><h3 id="cDays">${UI.cDays}</h3><p>${UI.cDaysNote}</p></div><div class="chart" id="chDays"></div>
          <table class="sr"><caption>${UI.cDays}</caption>${days.map((d) => `<tr><th>${sf.format(d.d)}</th><td>${d.n}</td><td>${UI.money(d.sales)}</td></tr>`).join('')}</table></section>
        <section class="card c-att" aria-labelledby="cAtt"><div class="c-head"><h3 id="cAtt">${UI.attention}</h3></div>
          ${att.length ? `<ul class="att">${att.map(([c, txt, href]) => `<li class="a-${c}"><span>${esc(txt)}</span><a href="${href}">${UI.go}</a></li>`).join('')}</ul>` : `<p class="all-good">${UI.allGood}</p>`}</section>
        <section class="card" aria-labelledby="cTop"><div class="c-head"><h3 id="cTop">${UI.cTop}</h3></div>
          <ul class="hbars">${top.map((x, i) => `<li data-tip="${esc(`<b>${t(byFl[x.k].name)}</b>${x.v} ${UI.scoops} · ${UI.share(pct(x.v, allScoops))}`)}"><span class="hb-l"><span class="hb-ic">${tubArt(x.k, 40 + i)}</span>${t(byFl[x.k].name)}</span>
            <span class="hb-t"><span class="hb-b" style="width:${((x.v / top[0].v) * 100).toFixed(1)}%"></span></span><b class="hb-v">${x.v}</b></li>`).join('')}</ul></section>
        <section class="card" aria-labelledby="cBr"><div class="c-head"><h3 id="cBr">${UI.cBr}</h3></div>
          <ul class="hbars">${brs.map((x) => `<li data-tip="${esc(`<b>${t(x.b.name)}</b>${UI.ordersN(x.n)} · ${UI.money(x.s)} ${UI.sales}`)}"><span class="hb-l"><span class="hb-dot" style="--c:${x.b.c}">${x.b.num}</span>${t(x.b.name)}</span>
            <span class="hb-t"><span class="hb-b" style="width:${brs[0].n ? ((x.n / brs[0].n) * 100).toFixed(1) : 0}%"></span></span><b class="hb-v">${x.n || '–'}</b></li>`).join('')}</ul>
          ${brs.some((x) => !x.n) ? `<p class="c-note">${t(byBr.sahel.name)}: ${D.UI.backIn}</p>` : ''}</section>
      </div>`;
    drawDays($('#chDays'), days);
    $$('#v-overview .hbars li').forEach((li) => {
      li.addEventListener('pointerenter', () => { const r = li.querySelector('.hb-b').getBoundingClientRect(); showTip(li.dataset.tip, AR ? r.left : r.right, r.top); });
      li.addEventListener('pointerleave', hideTip);
    });
  }

  // orders per day as columns; today (not over yet) is lighter
  function drawDays(el, days) {
    const W = Math.max(280, el.clientWidth), H = 230, m = { l: 34, r: 6, t: 10, b: 26 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = Math.ceil(Math.max(...days.map((d) => d.n)) / 20) * 20, y = (v) => m.t + ih - (v / max) * ih;
    const band = iw / days.length, bw = Math.min(26, band - 6);
    const grid = [0, max / 2, max].map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="${v ? 'g' : 'base'}"/><text x="${m.l - 8}" y="${y(v) + 4}" class="yl">${v}</text>`).join('');
    const bars = days.map((d, i) => {
      const x = m.l + band * i + (band - bw) / 2, top = y(d.n), h = m.t + ih - top, r = Math.min(4, h);
      const path = `M${x} ${m.t + ih}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + bw - r}Q${x + bw} ${top} ${x + bw} ${top + r}V${m.t + ih}Z`;
      const lab = d.today ? UI.today : i % 2 === (days.length - 1) % 2 ? d.d.getDate() : '';
      return `<g class="bar${d.today ? ' now' : ''}" data-i="${i}"><path d="${path}"/><rect class="hit" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}"/>`
        + (lab !== '' ? `<text x="${x + bw / 2}" y="${H - 8}" class="xl">${lab}</text>` : '') + '</g>';
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${UI.cDays}" direction="ltr">${grid}${bars}</svg>`;
    $$('.bar', el).forEach((g) => {
      g.addEventListener('pointerenter', () => {
        const d = days[+g.dataset.i], r = g.querySelector('path').getBoundingClientRect();
        el.classList.add('hov'); g.classList.add('on');
        showTip(`<b>${d.today ? `${UI.today} · ${UI.soFar}` : sf.format(d.d)}</b>${UI.ordersN(d.n)} · ${UI.money(d.sales)}`, r.left + r.width / 2, r.top);
      });
      g.addEventListener('pointerleave', () => { el.classList.remove('hov'); g.classList.remove('on'); hideTip(); });
    });
  }

  /* ---------- orders ---------- */
  const COLS = [['new', 'colNew'], ['prep', 'colPrep'], ['ready', 'colReady']];
  const NEXT = { new: 'prep', prep: 'ready', ready: 'done' };
  function orderCard(o) {
    const items = o.items.map((it) => `<li><b>${it.q}×</b> ${UI.sizes[it.s]}<span>${[...new Set(it.f)].map((k) => t(byFl[k].name)).join(' + ')}</span></li>`).join('');
    return `<li class="oc" data-id="${o.id}"><div class="oc-h"><b>#${o.id}</b><span>${UI.names[o.who]}</span><time>${tf.format(new Date(o.at))}</time></div>
      <div class="oc-m"><span class="hb-dot" style="--c:${byBr[o.br].c}">${byBr[o.br].num}</span>${t(byBr[o.br].name)}<span class="ch">${ic(o.ch)}${UI[o.ch]}</span></div>
      <ul class="oc-i">${items}</ul><div class="oc-f"><b>${UI.money(o.total)}</b><button type="button" class="btn-next" data-next="${o.id}">${UI.next[o.st]}</button></div></li>`;
  }
  function ordersView() {
    const os = orders(), done = os.filter((o) => o.st === 'done').length;
    $('#v-orders').innerHTML = `<div class="board">${COLS.map(([st, label]) => {
      const list = os.filter((o) => o.st === st).sort((a, b) => a.at - b.at);
      return `<section class="col col-${st}" aria-labelledby="col-${st}"><h3 id="col-${st}">${UI[label]}<span>${list.length}</span></h3>
        ${list.length ? `<ul>${list.map(orderCard).join('')}</ul>` : `<p class="col-empty">${UI.empty}</p>`}</section>`;
    }).join('')}</div><p class="done-n">${UI.done(done)}</p>`;
  }
  $('#main').addEventListener('click', (e) => {
    const b = e.target.closest('[data-next]');
    if (!b) return;
    const id = +b.dataset.next, o = orders().find((x) => x.id === id), st = NEXT[o.st];
    dash.st[id] = st; saveDash();
    const card = b.closest('.oc');
    card.classList.add('leave');
    setTimeout(() => { render(); toast(`#${id} · ${UI.moved[st]}`); }, 260);
  });

  // a new sample order every 35 to 70 seconds while the dashboard is open
  function arrive() {
    if (document.visibilityState === 'visible') {
      const r = rng(Date.now() & 0xffffffff), av = FL.map((f) => f.key).filter((k) => !soldOut(k)), brs = BR.filter((b) => inSeason(b, new Date()) && !closedToday(b)).map((b) => b.key);
      if (av.length && brs.length) {
        const id = FIRST + BASE.length + dash.live.length;
        dash.live.push({ ...makeOrder(r, Date.now(), av, brs), id }); saveDash();
        toast(UI.newOrder(id));
        if (view === 'orders' || view === 'overview') render();
        badge();
      }
    }
    setTimeout(arrive, 35e3 + Math.random() * 35e3);
  }
  function badge() {
    const n = orders().filter((o) => o.st === 'new').length;
    $$('.badge').forEach((b) => { b.hidden = !n; b.textContent = n; });
  }

  /* ---------- flavors ---------- */
  function flavorsView() {
    const avail = FL.filter((f) => !soldOut(f.key)).length;
    $('#v-flavors').innerHTML = `<div class="v-head"><p>${UI.flSub(avail, FL.length)}</p><a class="v-link" href="${ROOT}flavors.html" target="_blank" rel="noopener">${UI.seeFl}${ic('ext')}</a></div>
      <ul class="fl-list">${FL.map((f, i) => `<li class="fl${soldOut(f.key) ? ' out' : ''}"><span class="fl-ic" style="--c:${f.bg}">${tubArt(f.key, 60 + i)}</span>
        <div class="fl-t"><h3>${t(f.name)}</h3><p>${t(f.short)}</p>${soldOut(f.key) ? `<span class="pill-out">${UI.outBadge}</span>` : ''}</div>
        <div class="fl-sw">${sw(`av-${f.key}`, UI.avail, !soldOut(f.key), `data-av="${f.key}"`)}${sw(`nw-${f.key}`, UI.isNew, isNewF(f), `data-nw="${f.key}"`)}</div></li>`).join('')}</ul>`;
  }
  const sw = (id, label, on, data) => `<label class="sw" for="${id}"><input type="checkbox" role="switch" id="${id}" ${on ? 'checked' : ''} ${data}><span class="sw-ui" aria-hidden="true"></span><span>${label}</span></label>`;
  $('#main').addEventListener('change', (e) => {
    const el = e.target, k = el.dataset.av || el.dataset.nw, bk = el.dataset.br;
    if (k) {
      const a = { ...fa(k) };
      if (el.dataset.av) { if (el.checked) delete a.soldOut; else a.soldOut = TODAY; }
      else a.isNew = el.checked;
      admin.flavors[k] = a;
    } else if (bk) {
      const b = byBr[bk], a = { ...ba(bk) }, [o, c] = hours(b);
      if (el.dataset.f === 'closed') { if (el.checked) a.closedOn = TODAY; else delete a.closedOn; }
      else {
        a.open = el.dataset.f === 'open' ? +el.value : o; a.close = el.dataset.f === 'close' ? +el.value : c;
        if (a.close <= a.open) a.close = a.open + 1;
      }
      admin.branches[bk] = a;
    } else return;
    const keep = el.id || `${bk}-${el.dataset.f}`;   // the view is drawn again: give the focus back to the same control
    saveAdmin(); render(); badge(); toast(UI.saved);
    (document.getElementById(keep) || $(`[data-br="${bk}"][data-f="${el.dataset.f}"]`) || body).focus();
  });

  /* ---------- branches ---------- */
  function branchesView() {
    const n = new Date();
    $('#v-branches').innerHTML = `<div class="v-head"><p>${UI.brSub}</p><a class="v-link" href="${ROOT}locations.html" target="_blank" rel="noopener">${UI.seeBr}${ic('ext')}</a></div>
      <ul class="br-list">${BR.map((b) => {
        const [o, c] = hours(b), [st, txt] = brStatus(b), season = inSeason(b, n);
        const opt = (from, to, sel) => Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => `<option value="${h}"${h === sel ? ' selected' : ''}>${D.UI.hour(h)}</option>`).join('');
        return `<li class="br" style="--c:${b.c}"><div class="br-h"><span class="hb-dot">${b.num}</span><div><p>${t(b.kind)}</p><h3>${t(b.name)}</h3></div><span class="st ${st}">${txt}</span></div>
          ${season ? '' : `<p class="br-note">${UI.summer}</p>`}
          <div class="br-hours"><label>${UI.opens}<select data-br="${b.key}" data-f="open">${opt(8, 20, o)}</select></label><label>${UI.closes}<select data-br="${b.key}" data-f="close">${opt(o + 1, 27, c)}</select></label></div>
          ${season ? sw(`cl-${b.key}`, UI.closedToday, closedToday(b), `data-br="${b.key}" data-f="closed"`) : ''}</li>`;
      }).join('')}</ul>`;
  }

  /* ---------- routing ---------- */
  let view = 'overview';
  const VIEW_FN = { overview, orders: ordersView, flavors: flavorsView, branches: branchesView };
  function render() {
    header();
    VIEWS.forEach((v) => { $(`#v-${v}`).hidden = v !== view; });
    $$('[data-v]').forEach((a) => (a.dataset.v === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    VIEW_FN[view]();
  }
  function route() {
    const v = location.hash.slice(1);
    view = VIEWS.includes(v) ? v : 'overview';
    hideTip(); render(); badge();
    document.title = `${UI.views[view]} · NILO · ${UI.title}`;
  }
  addEventListener('hashchange', () => { route(); $('#main').scrollIntoView({ block: 'start' }); });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (view === 'overview') drawDays($('#chDays'), lastDays(14)); }, 150); });
  addEventListener('scroll', hideTip, { passive: true });
  saveDash();
  route();
  setTimeout(arrive, 12e3);   // the first new order comes soon, so the demo shows it
})();
