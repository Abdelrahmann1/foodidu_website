/* NILO gelato — the owner's dashboard, a demo by Foodidu Business.
   The orders and the numbers are sample data made in this browser (localStorage 'nilo-dash'). The flavors and the
   branches are the site's own (data.js); what the owner changes here is kept in localStorage 'nilo-admin', which
   data.js reads, so the flavors and locations pages show it at once (they reload when it changes).
   Pages (the hash): #overview, #orders (the kitchen board), #history (every order), #order/<number>, #flavors, #branches. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.NILO_ART, D = window.NILO_DATA, AR = D.AR, t = D.t, TODAY = D.today;
  const FL = D.FLAVORS, BR = D.LOCATIONS, byFl = Object.fromEntries(FL.map((f) => [f.key, f])), byBr = Object.fromEntries(BR.map((b) => [b.key, b]));
  const body = document.body, ROOT = body.dataset.root, OTHER = body.dataset.other, BACK = body.dataset.back;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const UI = {
    en: {
      title: 'Owner dashboard', views: { overview: 'Overview', orders: 'Orders', history: 'All orders', flavors: 'Flavors', branches: 'Branches' },
      hi: (h) => (h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'),
      demo: 'A demo by Foodidu Business: the orders and numbers are sample data, and your changes are saved in this browser only.',
      reset: 'Reset the demo', resetDone: 'The demo is back to the start.', site: 'Open the website', back: 'Back to Foodidu Business', lang: 'العربية', live: 'Taking orders',
      kOrders: 'Orders today', kSales: 'Sales today', kAvg: 'Average order', kOpen: 'Open now',
      sOrders: (w, p) => `${w} waiting · ${p} preparing`, sSales: (d) => `${d}% delivery`, sAvg: (s) => `${s} scoops sold today`, sOpen: (n) => `of ${n} branches`,
      cDays: 'Orders, last 14 days', cDaysNote: 'Today is the lighter bar: the day is not over yet.', today: 'Today', soFar: 'so far',
      cTop: 'Best sellers this week', scoops: 'scoops', share: (p) => `${p}% of all scoops`, cBr: 'Orders by branch this week', ordersN: (n) => `${n} orders`, sales: 'sales',
      attention: 'Needs your attention', allGood: 'All good: nothing is waiting.',
      aNew: (n) => `${n} new ${n === 1 ? 'order is' : 'orders are'} waiting`, aOut: (s) => `Sold out today: ${s}`, aClosed: (s) => `Closed today: ${s}`, go: 'Open',
      colNew: 'New', colPrep: 'Preparing', colReady: 'Ready', done: (n) => `${n} orders handed over today`, seeAll: 'See all orders', empty: 'Nothing here right now.',
      next: { new: 'Start preparing', prep: 'Mark as ready', ready: 'Handed over' }, delivery: 'Delivery', pickup: 'Pickup',
      newOrder: (n) => `New order #${n}`, moved: { prep: 'Preparing', ready: 'Ready for the customer', done: 'Handed over', cancel: 'Cancelled' },
      // all orders
      hSub: 'Every order from the last 14 days. Open one to see all of its details.', search: 'Order number or customer',
      fDay: 'Day', fBr: 'Branch', fSt: 'Status', fCh: 'Type',
      days: { today: 'Today', yday: 'Yesterday', d7: 'Last 7 days', d14: 'Last 14 days' }, allBr: 'All branches', allSt: 'All statuses', allCh: 'Delivery and pickup',
      st: { new: 'New', prep: 'Preparing', ready: 'Ready', done: 'Handed over', cancel: 'Cancelled' },
      cols: { id: 'Order', time: 'Time', who: 'Customer', br: 'Branch', ch: 'Type', items: 'Items', total: 'Total', st: 'Status' }, dateL: 'Date',
      sum: (n, s) => `${n} ${n === 1 ? 'order' : 'orders'} · ${s} in sales`, none: 'No orders match these filters.', more: (n) => `Show ${n} more`, csv: 'Download CSV',
      // one order
      orderN: (id) => `Order #${id}`, dItems: 'Items', subtotal: 'Subtotal', feeL: 'Delivery fee', totalL: 'Total', payL: 'Payment',
      pay: { cash: 'Cash', card: 'Card', wallet: 'Mobile wallet' }, cust: 'Customer', nameL: 'Name', phone: 'Phone', pickupAt: 'From the branch', noteL: 'Note',
      notes: ['Extra spoons, please', 'Please call when you are outside', 'It is a birthday: a candle would be lovely', 'No napkins needed, thanks'],
      branchL: 'Branch', stepsL: 'Order steps', stepN: { new: 'Received', prep: 'Preparing', ready: 'Ready', done: 'Handed over', cancel: 'Cancelled' },
      cancelB: 'Cancel the order', cancelSure: 'Tap again to cancel', print: 'Print the receipt', thanks: 'Thank you, and enjoy it cold!',
      notFound: 'This order is not in the last 14 days.', prev: 'Previous order', next2: 'Next order',
      flSub: (a, n) => `${a} of ${n} flavors are available today. What you change here shows on the website right away.`,
      avail: 'Available today', isNew: 'Show as new', seeFl: 'See the flavors page', outBadge: 'Sold out today',
      brSub: 'Opening hours and closures show on the locations page right away.', seeBr: 'See the locations page',
      opens: 'Opens', closes: 'Closes', closedToday: 'Closed today', summer: 'Summer only: June to September',
      saved: 'Saved. The website shows it now.',
      sizes: { cup1: 'Cup, 1 scoop', cup2: 'Cup, 2 scoops', cone: 'Cone, 2 scoops', pint: 'Pint, 500 g' },
      names: ['Mariam', 'Omar', 'Nour', 'Youssef', 'Salma', 'Karim', 'Hana', 'Ali', 'Farida', 'Ziad', 'Laila', 'Hassan', 'Malak', 'Adam'],
      money: (n) => `EGP ${n.toLocaleString('en-US')}`,
    },
    ar: {
      title: 'لوحة التحكم', views: { overview: 'نظرة عامة', orders: 'الطلبات', history: 'كل الطلبات', flavors: 'النكهات', branches: 'الفروع' },
      hi: (h) => (h >= 5 && h < 12 ? 'صباح الخير' : 'مساء الخير'),
      demo: 'نسخة للعرض من فوديدو بيزنس: الطلبات والأرقام بيانات تجريبية، وتعديلاتك بتتحفظ على المتصفح ده بس.',
      reset: 'رجّع الديمو من الأول', resetDone: 'الديمو رجع من الأول.', site: 'افتح الموقع', back: 'رجوع لفوديدو بيزنس', lang: 'English', live: 'بنستقبل طلبات',
      kOrders: 'طلبات النهارده', kSales: 'مبيعات النهارده', kAvg: 'متوسط الطلب', kOpen: 'مفتوح دلوقتي',
      sOrders: (w, p) => `${w} مستني · ${p} بيتحضّر`, sSales: (d) => `${d}% توصيل`, sAvg: (s) => `${s} سكوب اتباع النهارده`, sOpen: (n) => `من ${n} فروع`,
      cDays: 'الطلبات في آخر 14 يوم', cDaysNote: 'النهارده هو العمود الفاتح: اليوم لسه مخلصش.', today: 'النهارده', soFar: 'لحد دلوقتي',
      cTop: 'الأكثر مبيعًا الأسبوع ده', scoops: 'سكوب', share: (p) => `${p}% من كل السكوبات`, cBr: 'الطلبات حسب الفرع الأسبوع ده', ordersN: (n) => `${n} طلب`, sales: 'مبيعات',
      attention: 'محتاج تبص عليه', allGood: 'كله تمام: مفيش حاجة مستنية.',
      aNew: (n) => `${n} ${n === 1 ? 'طلب جديد مستني' : 'طلبات جديدة مستنية'}`, aOut: (s) => `خلصت النهارده: ${s}`, aClosed: (s) => `مقفول النهارده: ${s}`, go: 'افتح',
      colNew: 'جديد', colPrep: 'بيتحضّر', colReady: 'جاهز', done: (n) => `${n} طلب اتسلّم النهارده`, seeAll: 'شوف كل الطلبات', empty: 'مفيش حاجة هنا دلوقتي.',
      next: { new: 'ابدأ التحضير', prep: 'خلّيه جاهز', ready: 'اتسلّم' }, delivery: 'توصيل', pickup: 'استلام',
      newOrder: (n) => `طلب جديد #${n}`, moved: { prep: 'بيتحضّر', ready: 'جاهز للعميل', done: 'اتسلّم', cancel: 'اتلغى' },
      hSub: 'كل الطلبات في آخر 14 يوم. افتح أي طلب تشوف كل تفاصيله.', search: 'رقم الطلب أو اسم العميل',
      fDay: 'اليوم', fBr: 'الفرع', fSt: 'الحالة', fCh: 'النوع',
      days: { today: 'النهارده', yday: 'امبارح', d7: 'آخر 7 أيام', d14: 'آخر 14 يوم' }, allBr: 'كل الفروع', allSt: 'كل الحالات', allCh: 'توصيل واستلام',
      st: { new: 'جديد', prep: 'بيتحضّر', ready: 'جاهز', done: 'اتسلّم', cancel: 'اتلغى' },
      cols: { id: 'الطلب', time: 'الوقت', who: 'العميل', br: 'الفرع', ch: 'النوع', items: 'الأصناف', total: 'الإجمالي', st: 'الحالة' }, dateL: 'التاريخ',
      sum: (n, s) => `${n} طلب · ${s} مبيعات`, none: 'مفيش طلبات بالفلاتر دي.', more: (n) => `اعرض ${n} كمان`, csv: 'نزّل CSV',
      orderN: (id) => `طلب #${id}`, dItems: 'الأصناف', subtotal: 'المجموع', feeL: 'رسوم التوصيل', totalL: 'الإجمالي', payL: 'الدفع',
      pay: { cash: 'كاش', card: 'كارت', wallet: 'محفظة إلكترونية' }, cust: 'العميل', nameL: 'الاسم', phone: 'الموبايل', pickupAt: 'من الفرع', noteL: 'ملاحظة',
      notes: ['معلقة زيادة لو سمحت', 'كلّمني لما توصل تحت', 'عيد ميلاد: لو فيه شمعة يبقى جميل', 'مش محتاج مناديل، شكرًا'],
      branchL: 'الفرع', stepsL: 'مراحل الطلب', stepN: { new: 'وصل', prep: 'بيتحضّر', ready: 'جاهز', done: 'اتسلّم', cancel: 'اتلغى' },
      cancelB: 'الغي الطلب', cancelSure: 'دوس تاني للتأكيد', print: 'اطبع الإيصال', thanks: 'شكرًا، وبالهنا وهو ساقع!',
      notFound: 'الطلب ده مش في آخر 14 يوم.', prev: 'الطلب اللي قبله', next2: 'الطلب اللي بعده',
      flSub: (a, n) => `${a} من ${n} نكهة موجودين النهارده. أي تعديل هنا بيظهر على الموقع على طول.`,
      avail: 'موجودة النهارده', isNew: 'اعرضها كجديدة', seeFl: 'شوف صفحة النكهات', outBadge: 'خلصت النهارده',
      brSub: 'المواعيد وقفل الفروع بيظهروا في صفحة الفروع على طول.', seeBr: 'شوف صفحة الفروع',
      opens: 'بيفتح', closes: 'بيقفل', closedToday: 'مقفول النهارده', summer: 'الصيف بس: من يونيو لسبتمبر',
      saved: 'اتحفظ. الموقع بيعرضه دلوقتي.',
      sizes: { cup1: 'كوباية سكوب واحد', cup2: 'كوباية 2 سكوب', cone: 'كون 2 سكوب', pint: 'علبة 500 جم' },
      names: ['مريم', 'عمر', 'نور', 'يوسف', 'سلمى', 'كريم', 'هنا', 'علي', 'فريدة', 'زياد', 'ليلى', 'حسن', 'ملك', 'آدم'],
      money: (n) => `${n.toLocaleString('en-US')} ج.م`,
    },
  }[D.L];

  /* ---------- the menu prices and the sample orders ---------- */
  const SIZES = { cup1: { p: 75, scoops: 1, n: 1, w: 30 }, cup2: { p: 130, scoops: 2, n: 2, w: 34 }, cone: { p: 135, scoops: 2, n: 2, w: 22 }, pint: { p: 290, scoops: 4, n: 1, w: 14 } };
  const W_FL = { pistachio: 9, mango: 8, roz: 7, chocolate: 7, dates: 6, cookies: 6, karkadeh: 5, coffee: 5, fior: 4, strawberry: 4, guava: 4, lemonmint: 4 };
  const W_BR = { zamalek: 42, maadi: 30, newcairo: 28, sahel: 34 };
  const PAY = { cash: 45, card: 35, wallet: 20 }, FEE = 25;
  const AREAS = {   // where the delivery orders of each branch go, [English, Arabic]
    zamalek: [['Zamalek', 'الزمالك'], ['Garden City', 'جاردن سيتي'], ['Dokki', 'الدقي']],
    maadi: [['Maadi', 'المعادي'], ['Degla', 'دجلة'], ['Zahraa El Maadi', 'زهراء المعادي']],
    newcairo: [['Fifth Settlement', 'التجمع الخامس'], ['Rehab', 'الرحاب'], ['Narges', 'النرجس']],
    sahel: [['Marassi', 'مراسي'], ['Hacienda', 'هاسيندا'], ['Sidi Abdel Rahman', 'سيدي عبد الرحمن']],
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const pickW = (r, keys, w) => { const sum = keys.reduce((s, k) => s + w[k], 0); let x = r() * sum; for (const k of keys) { x -= w[k]; if (x < 0) return k; } return keys[keys.length - 1]; };
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const inSeason = (b, d) => !b.months || b.months.includes(d.getMonth() + 1);

  function makeOrder(r, at, flavors, branches) {
    const nItems = r() < 0.55 ? 1 : r() < 0.72 ? 2 : 3, items = [];
    for (let i = 0; i < nItems; i++) {
      const s = pickW(r, Object.keys(SIZES), Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v.w])));
      items.push({ s, f: Array.from({ length: SIZES[s].n }, () => pickW(r, flavors, W_FL)), q: r() < 0.85 ? 1 : 2 });
    }
    const br = pickW(r, branches, W_BR), ch = r() < 0.58 ? 'delivery' : 'pickup';
    const total = items.reduce((s, it) => s + SIZES[it.s].p * it.q, 0) + (ch === 'delivery' ? FEE : 0);
    return { at, br, ch, items, total, who: Math.floor(r() * UI.names.length), pay: pickW(r, Object.keys(PAY), PAY), area: Math.floor(r() * 3),
      note: r() < 0.12 ? Math.floor(r() * UI.notes.length) : -1, ph: 1000 + Math.floor(r() * 9000) };
  }
  // how many orders a day has: the first number drawn for that date (busier on Thursday to Saturday)
  const countOf = (r, wd) => Math.round((wd === 5 || wd === 6 ? 104 : wd === 4 ? 90 : 68) * (0.86 + r() * 0.28));
  // order numbers run on from the day the orders start (1 September 2026), so an order keeps its number every day
  const EPOCH = new Date(2026, 8, 1), FIRSTS = new Map();
  function firstId(d) {
    const k = dayKey(d);
    if (!FIRSTS.has(k)) {
      let id = 4001;
      for (const x = new Date(EPOCH); x < dayStart(d); x.setDate(x.getDate() + 1)) id += countOf(rng(hash('nilo' + dayKey(x))), x.getDay());
      FIRSTS.set(k, id);
    }
    return FIRSTS.get(k);
  }
  // one day of sample orders, all handed over, the same every time for the same date
  const DAYS = new Map();
  function dayOrders(d) {
    const k = dayKey(d);
    if (DAYS.has(k)) return DAYS.get(k);
    const r = rng(hash('nilo' + k)), n = countOf(r, d.getDay()), r2 = rng(hash('time' + k)), first = firstId(d);
    const brs = BR.filter((b) => inSeason(b, d)).map((b) => b.key), open = dayStart(d).getTime() + 12 * 3600e3, span = 13 * 3600e3;
    const list = Array.from({ length: n }, (_, i) => ({ ...makeOrder(r, open + (span * (i + 0.15 + r2() * 0.7)) / n, FL.map((f) => f.key), brs), id: first + i, st: 'done' }));
    DAYS.set(k, list);
    return list;
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

  // today's orders: the ones from earlier today (how many is fixed on the first visit of the day), then the live ones.
  // st: an order's status once the owner moved it; tm: when each of its steps happened
  let dash = load('nilo-dash');
  const now0 = new Date();
  if (dash.day !== TODAY || dash.v !== 2) {
    const H = now0.getHours() + now0.getMinutes() / 60, h = H < 6 ? H + 24 : H, progress = Math.min(1, Math.max(0, (h - 12) / 13));
    dash = { v: 2, day: TODAY, t0: now0.getTime(), base: Math.max(16, Math.round(dayOrders(now0).length * progress)), live: [], st: {}, tm: {} };
  }
  const saveDash = () => store('nilo-dash', dash);
  const FIRST = firstId(now0);
  const BASE = (() => {
    const list = dayOrders(now0).slice(0, dash.base), span = 8 * 3600e3, end = (dash.t0 || now0.getTime()) - 6 * 60e3;   // the times stay as on the first visit
    return list.map((o, i) => ({ ...o, at: end - span + (span * (i + 1)) / list.length }));
  })();
  // the last few of them are still in the kitchen when the dashboard opens
  const startSt = (i) => { const k = BASE.length - 1 - i; return k === 0 || k === 1 ? 'new' : k === 2 || k === 3 ? 'prep' : k === 4 ? 'ready' : 'done'; };
  const orders = () => [...BASE.map((o, i) => ({ ...o, st: dash.st[o.id] || startSt(i) })), ...dash.live.map((o) => ({ ...o, st: dash.st[o.id] || 'new' }))];
  const valid = (os) => os.filter((o) => o.st !== 'cancel');
  const ACTIVE = ['new', 'prep', 'ready'], NEXT = { new: 'prep', prep: 'ready', ready: 'done' };
  function findOrder(id) {
    if (id >= FIRST) return orders().find((o) => o.id === id) || null;
    for (let i = 1; i < 14; i++) { const d = daysAgo(i); if (id >= firstId(d)) return dayOrders(d).find((o) => o.id === id) || null; }
    return null;
  }
  // when each step happened: saved when the owner moved the order, otherwise worked out from the order (never in the future)
  function steps(o) {
    const m = 60e3, s = dash.tm[o.id] || {}, now = Date.now(), cap = (v) => Math.min(v, now);
    if (o.st === 'cancel') return { new: o.at, ...(s.prep ? { prep: s.prep } : {}), ...(s.ready ? { ready: s.ready } : {}), cancel: s.cancel || now };
    const prep = s.prep || cap(o.at + (2 + (o.id % 4)) * m), ready = s.ready || cap(prep + (6 + (o.id % 7)) * m);
    const done = s.done || cap(ready + (o.ch === 'delivery' ? 16 + (o.id % 14) : 2 + (o.id % 5)) * m);
    return { new: o.at, ...(o.st !== 'new' ? { prep } : {}), ...(o.st === 'ready' || o.st === 'done' ? { ready } : {}), ...(o.st === 'done' ? { done } : {}) };
  }

  /* ---------- small helpers ---------- */
  const LOC = AR ? 'ar-EG-u-nu-latn' : 'en-US';
  const tf = new Intl.DateTimeFormat(LOC, { hour: 'numeric', minute: '2-digit' });
  const df = new Intl.DateTimeFormat(LOC, { weekday: 'long', day: 'numeric', month: 'long' });
  const sf = new Intl.DateTimeFormat(LOC, { weekday: 'short', day: 'numeric', month: 'short' });
  const when = (ts) => { const d = new Date(ts); return (dayKey(d) === TODAY ? '' : `${sf.format(d)} · `) + tf.format(d); };
  const ICON = {
    overview: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    orders: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    history: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    flavors: '<path d="M7 10a5 5 0 0 1 10 0M6 10h12l-6 11z"/>',
    branches: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>', fwd: '<path d="M9 6l6 6-6 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    delivery: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17h7M3 13h9l2-6h3l3 6M12 13V9"/>',
    pickup: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  };
  const ic = (k, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const tubArt = (k, seed) => { const a = A.tub({ flavor: k, seed }); return A.svg(a.vb, a.body); };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const dot = (b) => `<span class="hb-dot" style="--c:${b.c}">${b.num}</span>`;
  const stPill = (s) => `<span class="sp sp-${s}">${UI.st[s]}</span>`;
  const flavorsOf = (it) => [...new Set(it.f)].map((k) => t(byFl[k].name)).join(' + ');
  const sel = (id, label, opts, val) => `<label class="f-sel"><span class="sr">${label}</span><select id="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;

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
  const VIEWS = ['overview', 'orders', 'history', 'flavors', 'branches'], PAGES = [...VIEWS, 'order'];
  const navLinks = () => VIEWS.map((v) => `<a href="#${v}" data-v="${v}">${ic(v)}<span>${UI.views[v]}</span>${v === 'orders' ? '<b class="badge" hidden></b>' : ''}</a>`).join('');
  $('#nav').innerHTML = navLinks();
  $('#tabbar').innerHTML = navLinks();
  $('#sideFoot').innerHTML = `<a href="${ROOT}">${ic('ext')}<span>${UI.site}</span></a><a href="${OTHER}" lang="${AR ? 'en' : 'ar'}">${ic('globe')}<span>${UI.lang}</span></a><a href="${BACK}">${ic('back', 'flip')}<span>${UI.back}</span></a>`;
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
    const n = new Date(), o = view === 'order' && findOrder(orderId);
    $('#top').innerHTML = o
      ? `<div><h1>${UI.orderN(o.id)}</h1><p>${df.format(new Date(o.at))} · ${tf.format(new Date(o.at))}</p></div>${stPill(o.st)}`
      : `<div><h1>${view === 'overview' ? UI.hi(n.getHours()) : UI.views[view === 'order' ? 'history' : view]}</h1><p>${df.format(n)}</p></div><span class="live"><i></i>${UI.live}</span>`;
  }

  /* ---------- overview ---------- */
  function lastDays(n) {
    const out = [];
    for (let i = n - 1; i >= 1; i--) { const d = daysAgo(i), os = dayOrders(d); out.push({ d, os, n: os.length, sales: os.reduce((s, o) => s + o.total, 0) }); }
    const os = valid(orders());
    out.push({ d: new Date(), os, n: os.length, sales: os.reduce((s, o) => s + o.total, 0), today: true });
    return out;
  }
  function brStatus(b) {
    const n = new Date(), H = n.getHours() + n.getMinutes() / 60, h = H < 6 ? H + 24 : H, [o, c] = hours(b);
    if (!inSeason(b, n)) return ['closed', D.UI.backIn];
    if (closedToday(b)) return ['closed', UI.closedToday];
    return h >= o && h < c ? ['open', D.UI.openNow] : ['closed', D.UI.opensAt(D.UI.hour(o))];
  }
  function overview() {
    const all = orders(), os = valid(all), sales = os.reduce((s, o) => s + o.total, 0), wait = all.filter((o) => o.st === 'new').length, prep = all.filter((o) => o.st === 'prep').length;
    const deliv = os.filter((o) => o.ch === 'delivery').length, scoops = os.reduce((s, o) => s + o.items.reduce((a, it) => a + SIZES[it.s].scoops * it.q, 0), 0);
    const openN = BR.filter((b) => brStatus(b)[0] === 'open').length;
    const kpi = (cls, label, value, sub, href) => `<li class="kpi ${cls}"><p class="k-l">${label}</p><p class="k-v">${href ? `<a href="${href}">${value}</a>` : value}</p><p class="k-s">${sub}</p></li>`;
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
      <ul class="kpis">${kpi('k-sun', UI.kOrders, os.length, UI.sOrders(wait, prep), '#history')}${kpi('k-pink', UI.kSales, UI.money(sales), UI.sSales(pct(deliv, os.length)))}
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
          <ul class="hbars">${brs.map((x) => `<li data-tip="${esc(`<b>${t(x.b.name)}</b>${UI.ordersN(x.n)} · ${UI.money(x.s)} ${UI.sales}`)}"><span class="hb-l">${dot(x.b)}${t(x.b.name)}</span>
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

  /* ---------- the kitchen board ---------- */
  const COLS = [['new', 'colNew'], ['prep', 'colPrep'], ['ready', 'colReady']];
  function orderCard(o) {
    const items = o.items.map((it) => `<li><b>${it.q}×</b> ${UI.sizes[it.s]}<span>${flavorsOf(it)}</span></li>`).join('');
    return `<li class="oc" data-id="${o.id}"><div class="oc-h"><a href="#order/${o.id}">#${o.id}</a><span>${UI.names[o.who]}</span><time>${tf.format(new Date(o.at))}</time></div>
      <div class="oc-m">${dot(byBr[o.br])}${t(byBr[o.br].name)}<span class="ch">${ic(o.ch)}${UI[o.ch]}</span></div>
      <ul class="oc-i">${items}</ul><div class="oc-f"><b>${UI.money(o.total)}</b><button type="button" class="btn-next" data-next="${o.id}">${UI.next[o.st]}</button></div></li>`;
  }
  function ordersView() {
    const os = orders(), done = os.filter((o) => o.st === 'done').length;
    $('#v-orders').innerHTML = `<div class="board">${COLS.map(([st, label]) => {
      const list = os.filter((o) => o.st === st).sort((a, b) => a.at - b.at);
      return `<section class="col col-${st}" aria-labelledby="col-${st}"><h3 id="col-${st}">${UI[label]}<span>${list.length}</span></h3>
        ${list.length ? `<ul>${list.map(orderCard).join('')}</ul>` : `<p class="col-empty">${UI.empty}</p>`}</section>`;
    }).join('')}</div><p class="done-n">${UI.done(done)} · <a href="#history">${UI.seeAll}</a></p>`;
  }
  // move an order to its next step, or cancel it (a second tap confirms)
  function setStatus(id, st) {
    dash.st[id] = st; dash.tm[id] = { ...(dash.tm[id] || {}), [st]: Date.now() }; saveDash();
  }
  let armed = null;
  $('#main').addEventListener('click', (e) => {
    const nx = e.target.closest('[data-next]'), cx = e.target.closest('[data-cancel]'), row = e.target.closest('tr[data-id]');
    if (nx) {
      const id = +nx.dataset.next, o = findOrder(id), st = NEXT[o.st], card = nx.closest('.oc');
      setStatus(id, st);
      if (card) card.classList.add('leave');
      setTimeout(() => { render(); badge(); toast(`#${id} · ${UI.moved[st]}`); }, card ? 260 : 0);
    } else if (cx) {
      const id = +cx.dataset.cancel;
      if (armed !== id) {
        armed = id; cx.textContent = UI.cancelSure; cx.classList.add('armed');
        clearTimeout(cx.t); cx.t = setTimeout(() => { armed = null; cx.textContent = UI.cancelB; cx.classList.remove('armed'); }, 3500);
        return;
      }
      const o = findOrder(id), done = steps(o); delete done.new;   // keep the steps it went through
      dash.tm[id] = { ...done, ...(dash.tm[id] || {}) };
      armed = null; setStatus(id, 'cancel'); render(); badge(); toast(`#${id} · ${UI.moved.cancel}`);
    } else if (e.target.closest('[data-print]')) {
      print();
    } else if (row && !e.target.closest('a')) {
      location.hash = `order/${row.dataset.id}`;
    }
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
        if (view === 'history') drawRows();
        badge();
      }
    }
    setTimeout(arrive, 35e3 + Math.random() * 35e3);
  }
  function badge() {
    const n = orders().filter((o) => o.st === 'new').length;
    $$('.badge').forEach((b) => { b.hidden = !n; b.textContent = n; });
  }

  /* ---------- all orders ---------- */
  const STS = ['new', 'prep', 'ready', 'done', 'cancel'], STEP = 30;
  const hf = { q: '', day: 'today', br: '', st: '', ch: '', n: STEP };   // the filters, kept while the owner opens an order and comes back
  function rangeOrders(key) {
    const ds = key === 'today' ? [0] : key === 'yday' ? [1] : Array.from({ length: key === 'd7' ? 7 : 14 }, (_, i) => i);
    return ds.flatMap((i) => (i ? dayOrders(daysAgo(i)) : orders()));
  }
  function filtered() {
    const q = hf.q.trim().toLowerCase().replace(/^#/, '');
    return rangeOrders(hf.day).filter((o) => (!hf.br || o.br === hf.br) && (!hf.st || o.st === hf.st) && (!hf.ch || o.ch === hf.ch)
      && (!q || String(o.id).includes(q) || UI.names[o.who].toLowerCase().includes(q))).sort((a, b) => b.at - a.at);
  }
  const row = (o) => `<tr data-id="${o.id}"><td data-l="${UI.cols.id}"><a href="#order/${o.id}">#${o.id}</a></td><td data-l="${UI.cols.time}">${when(o.at)}</td>
    <td data-l="${UI.cols.who}">${UI.names[o.who]}</td><td data-l="${UI.cols.br}"><span class="cell-br">${dot(byBr[o.br])}${t(byBr[o.br].name)}</span></td>
    <td data-l="${UI.cols.ch}"><span class="cell-ch">${ic(o.ch)}${UI[o.ch]}</span></td><td data-l="${UI.cols.items}">${o.items.map((it) => `${it.q}× ${UI.sizes[it.s]}`).join(AR ? '، ' : ', ')}</td>
    <td data-l="${UI.cols.total}"><b>${UI.money(o.total)}</b></td><td data-l="${UI.cols.st}">${stPill(o.st)}</td></tr>`;
  function historyView() {
    const v = $('#v-history');
    if (!v.firstChild) {   // the frame is drawn once, so typing in the search keeps its focus; drawRows fills the table
      v.innerHTML = `<div class="v-head"><p>${UI.hSub}</p><button type="button" class="v-link" id="hcsv">${ic('download')}${UI.csv}</button></div>
        <div class="filters"><label class="f-q"><span class="sr">${UI.search}</span>${ic('search')}<input type="search" id="hq" placeholder="${UI.search}" autocomplete="off"></label>
          ${sel('hday', UI.fDay, Object.entries(UI.days), hf.day)}${sel('hbr', UI.fBr, [['', UI.allBr], ...BR.map((b) => [b.key, t(b.name)])], hf.br)}
          ${sel('hst', UI.fSt, [['', UI.allSt], ...STS.map((s) => [s, UI.st[s]])], hf.st)}${sel('hch', UI.fCh, [['', UI.allCh], ['delivery', UI.delivery], ['pickup', UI.pickup]], hf.ch)}</div>
        <p class="h-sum" id="hsum" aria-live="polite"></p>
        <table class="otable"><thead><tr>${Object.values(UI.cols).map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody id="hrows"></tbody></table>
        <p class="h-none" id="hnone" hidden>${UI.none}</p><button type="button" class="h-more" id="hmore" hidden></button>`;
      $('#hq').addEventListener('input', (e) => { hf.q = e.target.value; hf.n = STEP; drawRows(); });
      [['hday', 'day'], ['hbr', 'br'], ['hst', 'st'], ['hch', 'ch']].forEach(([id, k]) => $(`#${id}`).addEventListener('change', (e) => { hf[k] = e.target.value; hf.n = STEP; drawRows(); }));
      $('#hmore').addEventListener('click', () => { hf.n += STEP; drawRows(); });
      $('#hcsv').addEventListener('click', csv);
    }
    drawRows();
  }
  function drawRows() {
    const list = filtered(), ok = valid(list), more = $('#hmore');
    $('#hsum').textContent = UI.sum(list.length, UI.money(ok.reduce((s, o) => s + o.total, 0)));
    $('#hrows').innerHTML = list.slice(0, hf.n).map(row).join('');
    $('#hnone').hidden = !!list.length;
    more.hidden = list.length <= hf.n; more.textContent = UI.more(Math.min(STEP, list.length - hf.n));
  }
  // the filtered orders as a spreadsheet file (with a BOM so Excel reads the Arabic)
  function csv() {
    const lines = [[UI.cols.id, UI.dateL, UI.cols.time, UI.cols.who, UI.cols.br, UI.cols.ch, UI.cols.items, UI.cols.total, UI.cols.st, UI.payL]].concat(filtered().map((o) => {
      const d = new Date(o.at);
      return [o.id, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, tf.format(d), UI.names[o.who], t(byBr[o.br].name), UI[o.ch],
        o.items.map((it) => `${it.q}x ${UI.sizes[it.s]} (${flavorsOf(it)})`).join('; '), o.total, UI.st[o.st], UI.pay[o.pay]];
    }));
    const text = '﻿' + lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = `nilo-orders-${TODAY}.csv`;
    body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- one order ---------- */
  let orderId = 0;
  function orderView() {
    const v = $('#v-order'), o = findOrder(orderId), back = `<a class="back-link" href="#history">${ic('back', 'flip')}${UI.views.history}</a>`;
    if (!o) { v.innerHTML = `${back}<p class="all-good">${UI.notFound}</p>`; return; }
    const b = byBr[o.br], sub = o.items.reduce((s, it) => s + SIZES[it.s].p * it.q, 0), tm = steps(o), at = new Date(o.at);
    const flow = o.st === 'cancel' ? ['new', 'prep', 'ready', 'cancel'].filter((k) => tm[k]) : ['new', 'prep', 'ready', 'done'];
    const nowStep = flow.filter((k) => tm[k]).pop();
    const items = o.items.map((it, i) => `<li><span class="od-art">${tubArt(it.f[0], 80 + i)}</span><div><b>${it.q}× ${UI.sizes[it.s]}</b><span>${flavorsOf(it)}</span></div><b class="od-p">${UI.money(SIZES[it.s].p * it.q)}</b></li>`).join('');
    const prev = findOrder(o.id - 1), next = findOrder(o.id + 1);
    v.innerHTML = `${back}<div class="od-grid">
        <section class="card receipt" aria-labelledby="odItems">
          <div class="rc-head"><b>${AR ? 'نيلو جيلاتو' : 'NILO gelato'}</b><span>${t(b.name)} · ${UI.orderN(o.id)}</span><span>${df.format(at)} · ${tf.format(at)}</span></div>
          <h2 id="odItems">${UI.dItems}</h2><ul class="od-list">${items}</ul>
          <dl class="od-sum"><dt>${UI.subtotal}</dt><dd>${UI.money(sub)}</dd>${o.ch === 'delivery' ? `<dt>${UI.feeL}</dt><dd>${UI.money(FEE)}</dd>` : ''}
            <dt class="tot">${UI.totalL}</dt><dd class="tot">${UI.money(o.total)}</dd><dt>${UI.payL}</dt><dd>${UI.pay[o.pay]}</dd></dl>
          <p class="rc-thanks">${UI.thanks}</p></section>
        <div class="od-side">
          <section class="card" aria-labelledby="odCust"><h2 id="odCust">${UI.cust}</h2><dl class="od-dl"><dt>${UI.nameL}</dt><dd>${UI.names[o.who]}</dd><dt>${UI.phone}</dt><dd><span dir="ltr">010 •••• ${o.ph}</span></dd>
            <dt>${UI[o.ch]}</dt><dd>${o.ch === 'delivery' ? AREAS[o.br][o.area][AR ? 1 : 0] : UI.pickupAt}</dd>${o.note >= 0 ? `<dt>${UI.noteL}</dt><dd>${UI.notes[o.note]}</dd>` : ''}</dl></section>
          <section class="card" aria-labelledby="odBr"><h2 id="odBr">${UI.branchL}</h2><p class="od-br">${dot(b)}<span><b>${t(b.name)}</b><small>${t(b.kind)}</small></span></p></section>
          <section class="card" aria-labelledby="odSteps"><h2 id="odSteps">${UI.stepsL}</h2><ol class="tl">${flow.map((k) => `<li class="${tm[k] ? (k === 'cancel' ? 'x' : 'ok') : ''}${k === nowStep ? ' cur' : ''}"><b>${UI.stepN[k]}</b><time>${tm[k] ? when(tm[k]) : '–'}</time></li>`).join('')}</ol></section>
        </div></div>
      <div class="od-actions">${ACTIVE.includes(o.st) ? `<button type="button" class="btn-next" data-next="${o.id}">${UI.next[o.st]}</button><button type="button" class="btn-x" data-cancel="${o.id}">${UI.cancelB}</button>` : ''}
        <button type="button" class="btn-ghost" data-print>${ic('print')}${UI.print}</button></div>
      <nav class="od-pn">${prev ? `<a href="#order/${prev.id}">${ic('back', 'flip')}${UI.prev} #${prev.id}</a>` : '<span></span>'}${next ? `<a href="#order/${next.id}">${UI.next2} #${next.id}${ic('fwd', 'flip')}</a>` : ''}</nav>`;
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
  const VIEW_FN = { overview, orders: ordersView, history: historyView, order: orderView, flavors: flavorsView, branches: branchesView };
  function render() {
    header();
    PAGES.forEach((v) => { $(`#v-${v}`).hidden = v !== view; });
    const nav = view === 'order' ? 'history' : view;
    $$('[data-v]').forEach((a) => (a.dataset.v === nav ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    VIEW_FN[view]();
  }
  function route() {
    const h = location.hash.slice(1), m = h.match(/^order\/(\d+)$/);
    view = m ? 'order' : VIEWS.includes(h) ? h : 'overview';
    if (m) orderId = +m[1];
    hideTip(); render(); badge();
    document.title = `${view === 'order' ? UI.orderN(orderId) : UI.views[view]} · NILO · ${UI.title}`;
  }
  addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (view === 'overview') drawDays($('#chDays'), lastDays(14)); }, 150); });
  addEventListener('scroll', hideTip, { passive: true });
  saveDash();
  route();
  setTimeout(arrive, 12e3);   // the first new order comes soon, so the demo shows it
})();
