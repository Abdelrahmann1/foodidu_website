/* OVERFLOW — customer site: header, bag, item builder, and the page scripts (home, menu, checkout, track, locations). */
(() => {
  const D = window.OF_DATA, S = window.OF_STORE;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page = document.body.dataset.page;
  const ROOT = document.body.dataset.root || '';
  const photo = (id, w = 600, h = 450) => `<img src="${D.img(id, w, h)}" alt="" loading="lazy" decoding="async">`;
  const ICON = {
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.5s-7.5-6.6-7.5-12.2a7.5 7.5 0 0 1 15 0c0 5.6-7.5 12.2-7.5 12.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    track: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    box: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 24l24-12 24 12-24 12Z" fill="#fff" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M8 24v18l24 12 24-12V24" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M32 36v18" stroke="currentColor" stroke-width="3"/><circle cx="22" cy="25" r="4" fill="currentColor"/><circle cx="32" cy="20" r="4" fill="currentColor"/><circle cx="42" cy="25" r="4" fill="currentColor"/><circle cx="32" cy="30" r="4" fill="currentColor"/></svg>',
  };

  /* ---------- words (English / Arabic) ---------- */
  const AR = D.AR;
  const T = AR ? {
    cur: (n) => `${Math.round(n).toLocaleString('en-US')} جنيه`, paused: 'الطلب أونلاين متوقف', openNow: 'فاتح دلوقتي', closedNow: 'مقفول دلوقتي',
    added: (n) => `اتضاف: ${n}`, soldOutToast: (n) => `${n} خلص النهارده`, asItComes: 'زي ما هو', emptyBag: 'شنطتك فاضية.', emptyBag2: 'البطاطس هتبرد من غيرك.',
    startOrder: 'ابدأ طلبك', pickup: 'استلام', delivery: 'توصيل', serviceIncl: (r) => `خدمة ${r}% محسوبة`, orderNow: 'اطلب دلوقتي', bag: 'الشنطة', openBag: 'افتح الشنطة',
    track: 'تابع طلبك', viewBag: 'الشنطة', yourOrder: 'طلبك', subtotal: 'المجموع', total: 'الإجمالي', checkout: 'إتمام الطلب', close: 'اقفل', menuLbl: 'القائمة',
    nav: [['menu.html', 'المنيو', 'menu'], ['locations.html', 'الفروع', 'locations'], ['index.html#food', 'عن أكلنا', ''], ['index.html#story', 'حكايتنا', ''], ['index.html#crew', 'الطاقم', ''], ['index.html#toppings', 'الإضافات', '']],
    lang: 'EN', langName: 'English', contact: 'كلّمنا', top: 'لفوق ↑',
    f1: [['menu.html', 'المنيو'], ['locations.html', 'الفروع'], ['index.html#food', 'عن أكلنا'], ['index.html#story', 'حكايتنا'], ['index.html#crew', 'وظائف']],
    f2: [['menu.html', 'الطلب أونلاين'], ['track.html', 'تابع طلب'], ['index.html#toppings', 'الإضافات والحساسية'], ['index.html#group', 'طلبات المجموعات']], staff: 'لوحة تحكم الطاقم',
    fAppH: 'اطلب بدري ومتستناش في الطابور', fTrack: 'تابع طلب', fNewsH: 'إيه الجديد', fNews: 'برجر جديد، فروع جديدة، وأحياناً شيك ببلاش. تابعنا في الفرع أو أونلاين.',
    legal: 'سياسة الخصوصية · الشروط · دليل الحساسية', concept: 'تصميم وتنفيذ فوديدو بيزنس. النسخة دي للعرض: الطلبات بتفضل في متصفحك ومبتتبعتش.', fdBack: '→ رجوع لفوديدو بيزنس', copy: '© 2026 أوفرفلو برجر وبطاطس · القاهرة',
    toppings: 'الإضافات', allFree: 'الـ15 ببلاش', plainBtn: 'سادة', more: 'زوّدها', size: 'الحجم', scoop: 'كل كوباية معاها مغرفة زيادة في الشنطة', mixins: 'إضافات الشيك', mixFree: 'ببلاش. اختار قد ما تحب',
    special: 'تعليمات خاصة', notePh: 'مثلاً: مستوية كويس، مقسومة نصين، مناديل زيادة', addToBag: (p) => `ضيف للشنطة · ${p}`, kcal: 'سعر حراري', less: 'أقل', moreA: 'أكتر',
    tiles: ['برجر', 'بطاطس', 'ميلك شيك', 'الإضافات', 'هوت دوج', 'ساندويتشات', 'مشروبات'], explore: 'اكتشف', fullMenu: 'المنيو كله',
    picked: (n) => `<b>${n}</b> من 15 · <b>0 جنيه</b> زيادة · `, plainWord: 'سادة',
    howOrder: 'هتطلب إزاي؟', pickupOnly: 'الفرع ده استلام بس', closedSuffix: ' (مقفول دلوقتي)', readyIn: (m) => `جاهز في حوالي ${m} دقيقة`,
    customize: 'اختار إضافاتك', add: 'ضيف للشنطة', soldOut: 'خلص', sold: 'خلص النهارده',
    nothingCo: 'مفيش حاجة تتطلب لسه.', nothingCo2: 'اختار برجر وهنولّع الشواية.', goMenu: 'روح للمنيو',
    grab: (m) => `استلمه من الكاشير في حوالي ${m} دقيقة`, toDoor: (m, f) => `لحد بابك في حوالي ${m} دقيقة · ${f}`, notAt: (b) => `مش متاح في ${b}`, pausedSuffix: ' (متوقف)', asap: 'في أسرع وقت',
    promo: 'خصم', deliveryFee: 'التوصيل', service: (r) => `الخدمة (${r}%)`, minDel: (m) => `أقل طلب للتوصيل ${m}`, place: (t) => `اطلب · ${t}`,
    promoOk: (c, p) => `تم تطبيق ${c}: خصم ${p}% على الأكل.`, promoNo: 'الكود ده مش شغال. جرّب OVERFLOW10.',
    notFound: (id) => `مش لاقيين ${id}`, trackTitle: 'تابع طلب', trackNote: 'الطلبات اللي اتعملت من المتصفح ده بتظهر هنا.', cancelled: 'اتلغى', startAn: 'ابدأ طلب',
    sub: { new: 'المطبخ استلم التيكت بتاعك. حد من الطاقم هيبدأ فيه حالاً.', preparing: 'اللحمة على الشواية والبطاطس في الزيت.', ready: 'اتعبّى في الشنطة، ومعاه مغرفة بطاطس زيادة.', out: 'الطيار في الطريق ليك.', done: 'بالهنا. المناديل في الشنطة.', cancelled: 'الفرع لغى الطلب ده. مفيش أي فلوس اتدفعت.' },
    live: 'لايف: الصفحة دي بتتحرك مع المطبخ.', kitchen: 'افتح شاشة المطبخ', store: 'الفرع', phone: 'التليفون', name: 'الاسم', address: 'العنوان', payment: 'الدفع', time: 'الوقت', soon: 'في أسرع وقت',
    again: 'اطلب تاني', minLeft: 'دقيقة فاضلة', doneW: 'تم', closedW: 'اتقفل', cairo: '، القاهرة', hours: 'المواعيد', everyDay: 'كل يوم', seats: 'الكراسي', serviceL: 'الخدمة',
    svc: (d) => `أكل في المكان · استلام${d ? ' · توصيل' : ''}`, orderFrom: (b) => `اطلب من ${b}`, call: 'كلّم الفرع', addr: 'العنوان',
    am: 'ص', pm: 'م',
  } : {
    cur: (n) => `EGP ${Math.round(n).toLocaleString('en-US')}`, paused: 'Online orders paused', openNow: 'Open now', closedNow: 'Closed now',
    added: (n) => `Added: ${n}`, soldOutToast: (n) => `${n} is sold out today`, asItComes: 'As it comes', emptyBag: 'Your bag is empty.', emptyBag2: 'The fries are getting cold without you.',
    startOrder: 'Start your order', pickup: 'Pickup', delivery: 'Delivery', serviceIncl: (r) => `service ${r}% included`, orderNow: 'Order now', bag: 'Bag', openBag: 'Open your bag',
    track: 'Track order', viewBag: 'View bag', yourOrder: 'Your order', subtotal: 'Subtotal', total: 'Total', checkout: 'Checkout', close: 'Close', menuLbl: 'Menu',
    nav: [['menu.html', 'The menu', 'menu'], ['locations.html', 'Locations', 'locations'], ['index.html#food', 'About our food', ''], ['index.html#story', 'Our story', ''], ['index.html#crew', 'The crew', ''], ['index.html#toppings', 'Toppings', '']],
    lang: 'عربي', langName: 'العربية', contact: 'Contact us', top: 'Return to top ↑',
    f1: [['menu.html', 'The menu'], ['locations.html', 'Locations'], ['index.html#food', 'About our food'], ['index.html#story', 'Our story'], ['index.html#crew', 'Careers']],
    f2: [['menu.html', 'Online ordering'], ['track.html', 'Track an order'], ['index.html#toppings', 'Toppings &amp; allergens'], ['index.html#group', 'Group orders']], staff: 'Staff dashboard',
    fAppH: 'Order ahead, skip the line', fTrack: 'Track an order', fNewsH: 'See what’s cooking', fNews: 'New burgers, store openings and the occasional free shake. Follow along in store or online.',
    legal: 'Privacy policy · Terms of service · Allergen guide', concept: 'Website by Foodidu Business. This showcase copy places no real orders: they stay in your browser.', fdBack: '← Back to Foodidu Business', copy: '© 2026 OVERFLOW Burgers &amp; Fries · Cairo',
    toppings: 'Toppings', allFree: 'All 15 are free', plainBtn: 'Plain', more: 'Make it more', size: 'Size', scoop: 'Every cup gets an extra scoop in the bag', mixins: 'Mix-ins', mixFree: 'Free. Pick as many as you like',
    special: 'Special instructions', notePh: 'e.g. well done, cut in half, extra napkins', addToBag: (p) => `Add to bag · ${p}`, kcal: 'kcal', less: 'Less', moreA: 'More',
    tiles: ['Burgers', 'Fries', 'Shakes', 'Toppings', 'Dogs', 'Sandwiches', 'Drinks'], explore: 'Explore', fullMenu: 'Full menu',
    picked: (n) => `<b>${n}</b> of 15 picked · <b>EGP 0</b> extra · `, plainWord: 'plain',
    howOrder: 'How are you ordering?', pickupOnly: 'Pickup only at this store', closedSuffix: ' (closed now)', readyIn: (m) => `Ready in about ${m} min`,
    customize: 'Customize', add: 'Add to bag', soldOut: 'Sold out', sold: 'Sold out today',
    nothingCo: 'Nothing to check out yet.', nothingCo2: 'Pick a burger and we’ll fire up the grill.', goMenu: 'Go to the menu',
    grab: (m) => `Grab it at the counter in ~${m} min`, toDoor: (m, f) => `To your door in ~${m} min · ${f}`, notAt: (b) => `Not available at ${b}`, pausedSuffix: ' (paused)', asap: 'ASAP',
    promo: 'Promo', deliveryFee: 'Delivery', service: (r) => `Service (${r}%)`, minDel: (m) => `Delivery minimum is ${m}`, place: (t) => `Place order · ${t}`,
    promoOk: (c, p) => `${c} applied: ${p}% off your food.`, promoNo: 'That code doesn’t work. Try OVERFLOW10.',
    notFound: (id) => `We couldn’t find ${id}`, trackTitle: 'Track an order', trackNote: 'Orders placed in this browser show up here.', cancelled: 'Cancelled', startAn: 'Start an order',
    sub: { new: 'The kitchen just got your ticket. A crew member will start it in a moment.', preparing: 'Patties are on the grill and the fries are in the fryer.', ready: 'Bagged up, with an extra scoop of fries.', out: 'Your rider is on the way.', done: 'Enjoy. Napkins are in the bag.', cancelled: 'This order was cancelled by the store. Nothing was charged.' },
    live: 'Live: this page moves when the kitchen does.', kitchen: 'Open the kitchen screen', store: 'Store', phone: 'Phone', name: 'Name', address: 'Address', payment: 'Payment', time: 'Time', soon: 'As soon as possible',
    again: 'Order again', minLeft: 'min left', doneW: 'Done', closedW: 'Closed', cairo: ', Cairo', hours: 'Hours', everyDay: 'Sun – Sat', seats: 'Seats', serviceL: 'Service',
    svc: (d) => `Dine-in · Pickup${d ? ' · Delivery' : ''}`, orderFrom: (b) => `Order from ${b}`, call: 'Call store', addr: 'Address',
    am: 'am', pm: 'pm',
  };
  const BASE = document.body.dataset.base || '';
  const clock = (d) => { const h = d.getHours(), m = d.getMinutes(); return AR ? `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? T.pm : T.am}` : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };

  /* ---------- helpers ---------- */
  function isOpen(b, d = new Date()) {
    const h = d.getHours() + d.getMinutes() / 60, [o, c] = b.hours;
    return (h >= o && h < c) || (h + 24 >= o && h + 24 < c);
  }
  const hoursText = (b) => `${fmtH(b.hours[0])} – ${fmtH(b.hours[1])}`;
  function fmtH(h) { const x = h % 24, ap = x >= 12 ? T.pm : T.am, v = x % 12 || 12; return AR ? `${v} ${ap}` : `${v}${ap}`; }
  const money = (n) => T.cur(n);
  const openLabel = (b) => (S.db.settings.paused[b.id] ? ['closed', T.paused] : isOpen(b) ? ['', T.openNow] : ['closed', T.closedNow]);
  let toastT;
  function toast(msg) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function fly(fromEl, itemId) {
    const to = $('#floatBag.on') || $('#bagBtn'); if (reduced || !fromEl || !to) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(), b = to.getBoundingClientRect(), s = Math.min(a.width, a.height, 200) * 0.7;
    const f = document.createElement('div'); f.className = 'fly'; f.innerHTML = photo(itemId, 300, 300);
    Object.assign(f.style, { left: `${a.left + a.width / 2 - s / 2}px`, top: `${a.top + a.height / 2 - s / 2}px`, width: `${s}px`, height: `${s}px` });
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    return f.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 120}px) scale(.6) rotate(-10deg)`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(-20deg)`, opacity: 0.4 }], { duration: 750, easing: 'cubic-bezier(.45,0,.3,1)' }).finished.then(() => f.remove(), () => f.remove());
  }

  /* ---------- bag (kept per browser) ---------- */
  const BAG_KEY = 'overflow-bag';
  let bag = { lines: [], type: 'pickup', branch: D.BRANCHES[0].id };
  try { bag = { ...bag, ...JSON.parse(localStorage.getItem(BAG_KEY) || '{}') }; } catch { /* storage blocked */ }
  const saveBag = () => { try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch { /* storage blocked */ } renderBag(); };
  const uid = () => Math.random().toString(36).slice(2, 9);
  function addLine(line) {
    const key = JSON.stringify([line.item, line.opts, line.note || '']);
    const same = bag.lines.find((l) => JSON.stringify([l.item, l.opts, l.note || '']) === key);
    if (same) same.qty += line.qty; else bag.lines.push({ ...line, id: uid() });
    saveBag();
  }
  function bump() { $$('.bag-btn, #floatBag').forEach((bb) => { bb.classList.remove('bump'); void bb.offsetWidth; bb.classList.add('bump'); }); }
  function linesHTML(lines, editable) {
    return lines.map((l) => {
      const d = S.describe(l), unit = S.unitPrice(l);
      return `<li class="line" data-id="${l.id}"><div class="line-img">${photo(l.item, 160, 160)}</div>
        <div><p class="line-name">${esc(d.name)}</p><p class="line-detail">${esc(d.detail || T.asItComes)}${l.note ? `<br>“${esc(l.note)}”` : ''}</p></div>
        <div class="line-side"><span class="line-price">${money(unit * l.qty)}</span>${editable ? `<div class="qty sm"><button type="button" data-d="-1" aria-label="${T.less}">−</button><span>${l.qty}</span><button type="button" data-d="1" aria-label="${T.moreA}">+</button></div>` : `<span class="line-detail">× ${l.qty}</span>`}</div></li>`;
    }).join('');
  }
  function renderBag() {
    const n = bag.lines.reduce((s, l) => s + l.qty, 0);
    $$('.bag-count').forEach((c) => { c.textContent = n; });
    const fb = $('#floatBag'); if (fb) fb.classList.toggle('on', n > 0 && page !== 'checkout' && floatVisible);
    const list = $('#drawerList'); if (!list) return;
    if (!n) {
      list.innerHTML = `<li class="empty">${photo('fries', 360, 260)}<p><b>${T.emptyBag}</b><br>${T.emptyBag2}</p><a class="btn" href="${ROOT}menu.html">${T.startOrder}</a></li>`;
      $('#drawerFoot').hidden = true; return;
    }
    list.innerHTML = linesHTML(bag.lines, true);
    const t = S.totals(bag.lines, bag.type);
    $('#drawerFoot').hidden = false;
    $('#drawerSub').textContent = money(t.subtotal);
    $('#drawerTotal').textContent = money(t.total);
    $('#drawerNote').textContent = `${bag.type === 'delivery' ? T.delivery : T.pickup} · ${D.branchById[bag.branch].name} · ${T.serviceIncl(Math.round(D.ORDER.serviceRate * 100))}`;
  }
  function setBagOpen(open) {
    document.body.classList.toggle('bag-open', open);
    $('#drawer').setAttribute('aria-hidden', String(!open));
    if (open) $('#drawer .dlg-x').focus();
  }
  let floatVisible = false;

  /* ---------- shared chrome: header, drawer, footer ---------- */
  function chrome() {
    const nav = T.nav, alt = document.body.dataset.alt;
    $('#hdr').innerHTML = `<div class="topbar"><div class="wrap topbar-in"><button class="menu-btn" id="navBtn" type="button" aria-label="${T.menuLbl}" aria-expanded="false">${ICON.menu}</button>
        ${alt ? `<a class="bag-btn lang-btn" href="${alt}" hreflang="${AR ? 'en' : 'ar'}" lang="${AR ? 'en' : 'ar'}" aria-label="${T.langName}">${T.lang}</a>` : ''}<a class="btn" href="${ROOT}menu.html" style="min-height:30px;padding:0 10px;font-size:12.5px">${T.orderNow} ${ICON.bag}</a>
        <button class="bag-btn" id="bagBtn" type="button" aria-label="${T.openBag}"><span class="lbl">${T.bag}</span><span class="bag-count">0</span></button></div></div>
      <a class="logo" href="${ROOT}index.html" aria-label="OVERFLOW home"><span>Over</span><span>flow</span></a>
      <div class="wrap navrow"><nav class="nav" aria-label="Main">${nav.map(([h, t, p]) => `<a href="${ROOT}${h}"${p && p === page ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
        <a class="pill-btn" href="${ROOT}track.html">${T.track} ${ICON.track}</a></div>`;
    document.body.insertAdjacentHTML('beforeend', `<button class="float-bag" id="floatBag" type="button">${ICON.bag} ${T.viewBag} <span class="bag-count">0</span></button><div class="scrim" id="scrim"></div>
      <aside class="drawer" id="drawer" aria-hidden="true" aria-label="${T.yourOrder}"><div class="drawer-head"><h2 class="cap">${T.yourOrder}</h2><button class="dlg-x" type="button" aria-label="${T.close}">×</button></div>
      <ul class="drawer-list" id="drawerList"></ul>
      <div class="drawer-foot" id="drawerFoot"><p class="sum-row"><span>${T.subtotal}</span><span id="drawerSub"></span></p>
      <p class="sum-row total"><span>${T.total}</span><span id="drawerTotal"></span></p><a class="btn btn-lg btn-block" href="${ROOT}checkout.html">${T.checkout}</a><p class="fine" id="drawerNote"></p></div></aside>`);
    $('#bagBtn').addEventListener('click', () => setBagOpen(true));
    $('#floatBag').addEventListener('click', () => setBagOpen(true));
    $('#scrim').addEventListener('click', () => setBagOpen(false));
    $('#drawer .dlg-x').addEventListener('click', () => setBagOpen(false));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { setBagOpen(false); document.body.classList.remove('nav-open'); } });
    $('#drawerList').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-d]'); if (!b) return;
      const l = bag.lines.find((x) => x.id === b.closest('.line').dataset.id);
      l.qty += +b.dataset.d; if (l.qty <= 0) bag.lines = bag.lines.filter((x) => x !== l); saveBag();
    });
    $('#navBtn').addEventListener('click', () => { const open = document.body.classList.toggle('nav-open'); $('#navBtn').setAttribute('aria-expanded', String(open)); });
    $$('.navrow a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
    // the floating bag shows once the header has scrolled away
    new IntersectionObserver(([e]) => { floatVisible = !e.isIntersecting; renderBag(); }).observe($('#hdr'));
    const f = $('#ftr');
    if (f) f.innerHTML = `<div class="ftr-bar"><div class="wrap"><a class="btn" href="${ROOT}locations.html">${T.contact}</a><a class="btn btn-line" href="#top">${T.top}</a></div></div>
      <div class="ftr-main"><div class="wrap"><div class="ftr-grid"><a class="logo" href="${ROOT}index.html" aria-label="OVERFLOW"><span>Over</span><span>flow</span></a>
        <ul>${T.f1.map(([h, t]) => `<li><a href="${ROOT}${h}">${t}</a></li>`).join('')}</ul>
        <ul>${T.f2.map(([h, t]) => `<li><a href="${ROOT}${h}">${t}</a></li>`).join('')}<li><a href="${BASE}dashboard/index.html">${T.staff}</a></li></ul>
        <div class="ftr-app"><h3>${T.fAppH}</h3><div class="btns"><a class="btn" href="${ROOT}menu.html">${T.startOrder}</a><a class="btn btn-ink-line" href="${ROOT}track.html">${T.fTrack}</a></div>
          <h3>${T.fNewsH}</h3><p style="font-size:14px">${T.fNews}</p></div></div>
        <div class="ftr-legal"><span>${T.legal}</span><span>${T.concept}</span></div></div></div>
      <div class="ftr-copy">${T.copy}</div>`;
    renderBag();
    S.subscribe(renderBag);
    document.body.insertAdjacentHTML('beforeend', `<a class="fd-back" href="${AR ? '/ar/business/' : '/business/'}">${T.fdBack}</a>`);
    const back = $('.fd-back'), hideBack = () => { const y = scrollY, e = document.documentElement.scrollHeight - innerHeight; back.classList.toggle('off', y > 220 && y < e - 500); };
    addEventListener('scroll', hideBack, { passive: true }); hideBack();
  }

  /* ---------- the item builder ---------- */
  let cur = null;
  function builderDialog() {
    if ($('#builder')) return;
    document.body.insertAdjacentHTML('beforeend', `<dialog class="dlg" id="builder" aria-labelledby="bTitle"><button class="dlg-x" type="button" id="bClose" aria-label="${T.close}">×</button>
      <div class="dlg-in"><div class="dlg-media" id="bMedia"></div><div class="dlg-body"><div class="dlg-head"><h2 class="cap h-md red" id="bTitle"></h2><p id="bDesc"></p></div>
      <div class="dlg-scroll" id="bOpts"></div><div class="dlg-foot"><div class="qty"><button type="button" id="bLess" aria-label="${T.less}">−</button><span id="bQty">1</span><button type="button" id="bMore" aria-label="${T.moreA}">+</button></div>
      <button class="btn" type="button" id="bAdd"></button></div></div></div></dialog>`);
    const dlg = $('#builder');
    $('#bClose').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('#bLess').addEventListener('click', () => { cur.qty = Math.max(1, cur.qty - 1); paintBuilder(); });
    $('#bMore').addEventListener('click', () => { cur.qty = Math.min(20, cur.qty + 1); paintBuilder(); });
    $('#bOpts').addEventListener('click', (e) => {
      const c = e.target.closest('[data-k]'); if (!c) return;
      const k = c.dataset.k, v = c.dataset.v;
      if (k === 'top') toggle(cur.toppings, v);
      else if (k === 'extra') toggle(cur.extras, v);
      else if (k === 'mix') toggle(cur.mixins, v);
      else if (k === 'size') cur.size = v;
      else if (k === 'atw') { const all = D.ALL_THE_WAY.every((t) => cur.toppings.has(t)); D.ALL_THE_WAY.forEach((t) => (all ? cur.toppings.delete(t) : cur.toppings.add(t))); }
      else if (k === 'clear') { cur.toppings.clear(); cur.mixins.clear(); }
      paintBuilder();
    });
    $('#bOpts').addEventListener('input', (e) => { if (e.target.id === 'bNote') cur.note = e.target.value.slice(0, 140); });
    $('#bAdd').addEventListener('click', () => {
      const line = curLine();
      addLine(line); fly($('#bMedia'), line.item).then(bump, bump);
      toast(T.added(`${D.byId[cur.item].name}${cur.qty > 1 ? ` × ${cur.qty}` : ''}`));
      dlg.close();
    });
  }
  const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));
  function curLine() {
    const it = D.byId[cur.item], opts = {};
    if (it.builder === 'burger') { opts.toppings = D.TOPPINGS.map((t) => t.id).filter((t) => cur.toppings.has(t)); if (it.art === 'burger') opts.extras = D.EXTRAS.map((e) => e.id).filter((e) => cur.extras.has(e)); }
    if (it.builder === 'fries' || it.builder === 'drink') opts.size = cur.size;
    if (it.builder === 'fries') opts.style = it.cajun ? 'Cajun' : 'Classic';
    if (it.builder === 'shake') opts.mixins = D.MIXINS.filter((m) => cur.mixins.has(m));
    return { item: it.id, qty: cur.qty, opts, note: (cur.note || '').trim() };
  }
  const check = (k, v, label, extra, radio) => `<button class="check${radio ? ' radio' : ''}" type="button" data-k="${k}" data-v="${esc(v)}" aria-pressed="false"><span>${esc(label)}</span>${extra ? `<small>${extra}</small>` : ''}</button>`;
  function openBuilder(id, preset) {
    const it = D.byId[id]; if (!it) return;
    if (!S.available(id)) { toast(T.soldOutToast(it.name)); return; }
    builderDialog();
    cur = { item: id, qty: 1, toppings: new Set(preset && preset.toppings ? preset.toppings : it.art === 'burger' ? D.ALL_THE_WAY : []), extras: new Set(), mixins: new Set(), size: 'regular', note: '' };
    $('#bTitle').textContent = it.name; $('#bDesc').textContent = `${it.desc} ${it.kcal} ${T.kcal}.`;
    $('#bMedia').innerHTML = `${it.tag ? `<span class="card-tag">${it.tag}</span>` : ''}${photo(id, 900, 900)}`;
    let h = '';
    if (it.builder === 'burger') {
      h += `<div class="opt-group"><p class="opt-title">${T.toppings} <span>${T.allFree}</span></p><div class="quick"><button class="btn" type="button" data-k="atw" id="bAtw" style="min-height:34px;font-size:12.5px">${D.UI.atw}</button><button class="btn btn-ink-line" type="button" data-k="clear" style="min-height:34px;font-size:12.5px">${T.plainBtn}</button></div>
        <div class="checks">${D.TOPPINGS.map((t) => check('top', t.id, t.name)).join('')}</div></div>`;
      if (it.art === 'burger') h += `<div class="opt-group"><p class="opt-title">${T.more}</p><div class="checks">${D.EXTRAS.map((e) => check('extra', e.id, e.name, `+${money(e.price)}`)).join('')}</div></div>`;
    }
    if (it.builder === 'fries') h += `<div class="opt-group"><p class="opt-title">${T.size} <span>${T.scoop}</span></p><div class="checks">${D.FRY_SIZES.map((s) => check('size', s.id, s.name, money(S.price(it.id) + s.add), 1)).join('')}</div></div>`;
    if (it.builder === 'drink') h += `<div class="opt-group"><p class="opt-title">${T.size}</p><div class="checks">${D.DRINK_SIZES.map((s) => check('size', s.id, s.name, money(S.price(it.id) + s.add), 1)).join('')}</div></div>`;
    if (it.builder === 'shake') h += `<div class="opt-group"><p class="opt-title">${T.mixins} <span>${T.mixFree}</span></p><div class="checks">${D.MIXINS.map((m) => check('mix', m, D.label(m))).join('')}</div></div>`;
    h += `<div class="opt-group"><p class="opt-title">${T.special}</p><textarea class="note" id="bNote" maxlength="140" placeholder="${T.notePh}"></textarea></div>`;
    $('#bOpts').innerHTML = h;
    paintBuilder();
    $('#builder').showModal();
  }
  function paintBuilder() {
    const line = curLine();
    $$('#bOpts [data-k="top"]').forEach((c) => c.setAttribute('aria-pressed', String(cur.toppings.has(c.dataset.v))));
    $$('#bOpts [data-k="extra"]').forEach((c) => c.setAttribute('aria-pressed', String(cur.extras.has(c.dataset.v))));
    $$('#bOpts [data-k="mix"]').forEach((c) => c.setAttribute('aria-pressed', String(cur.mixins.has(c.dataset.v))));
    $$('#bOpts [data-k="size"]').forEach((c) => c.setAttribute('aria-pressed', String(cur.size === c.dataset.v)));
    const atw = $('#bAtw'); if (atw) atw.textContent = D.ALL_THE_WAY.every((t) => cur.toppings.has(t)) ? `${D.UI.atw} ✓` : D.UI.atw;
    $('#bQty').textContent = cur.qty;
    $('#bAdd').textContent = T.addToBag(money(S.unitPrice(line) * cur.qty));
  }
  function quickAdd(id, fromEl) {
    const it = D.byId[id]; if (!S.available(id)) { toast(T.soldOutToast(it.name)); return; }
    addLine({ item: id, qty: 1, opts: {}, note: '' }); fly(fromEl, id).then(bump, bump);
    toast(T.added(it.name));
  }

  /* ---------- reveal on scroll ---------- */
  function reveal() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]:not(.in)').forEach((el) => io.observe(el));
  }

  /* ---------- simple store map (home + locations) ---------- */
  function mapHTML(activeId) {
    const svg = `<svg viewBox="0 0 400 340" preserveAspectRatio="none" aria-hidden="true"><rect width="400" height="340" fill="#ECEAE4"/>
      ${[[20, 30, 70, 50], [250, 40, 90, 60], [60, 220, 80, 60], [270, 230, 100, 70], [185, 120, 50, 40], [300, 140, 70, 50]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#E0DDD5"/>`).join('')}
      <path d="M0 170H400M120 0V340M300 0V340M0 70Q200 100 400 50M0 280Q200 260 400 300" stroke="#fff" stroke-width="10" fill="none"/>
      <path d="M150 -10C170 60 130 130 165 190S190 290 170 350" stroke="#BFD9E6" stroke-width="28" fill="none" stroke-linecap="round"/>
      <circle cx="330" cy="120" r="22" fill="#CFDDBF"/><circle cx="60" cy="130" r="16" fill="#CFDDBF"/></svg>`;
    return svg + D.BRANCHES.map((b) => `<a class="map-pin${b.id === activeId ? ' on' : ''}" href="${ROOT}locations.html#${b.id}" style="left:${b.x * 100}%;top:${b.y * 100}%"><b>${b.name}</b><i></i></a>`).join('');
  }

  /* ================= pages ================= */
  function home() {
    const tiles = [['burgers', 'cheese'], ['fries', 'fries'], ['shakes', 'shake'], ['burgers', 'tomatoes'], ['dogs', 'bacon-dog'], ['sandwiches', 'grilled-cheese'], ['drinks', 'lemonade']].map(([c, ph], i) => [c, T.tiles[i], ph]);
    $('#tiles').innerHTML = tiles.map(([c, t, ph], i) => `<a class="tile" data-reveal href="${ROOT}menu.html#${c}" style="transition-delay:${(i % 3) * 0.06}s"><div class="tile-img">${photo(ph, 600, 450)}</div><span class="btn">${t}</span></a>`).join('') +
      `<a class="tile tile-more" data-reveal href="${ROOT}menu.html"><div><p class="cap h-md red">${T.explore}</p><span class="btn">${T.fullMenu}</span></div></a>`;
    // toppings playground (black section)
    const picked = new Set(['lettuce', 'tomato', 'pickles', 'ketchup']);
    const paint = () => {
      $$('#playChips .chip').forEach((c) => c.setAttribute('aria-pressed', String(picked.has(c.dataset.v))));
      $('#playCount').innerHTML = T.picked(picked.size) + (picked.size ? [...picked].map((t) => D.topById[t].name).join(D.UI.sep) : T.plainWord);
    };
    $('#playChips').innerHTML = D.TOPPINGS.map((t) => `<button class="chip" type="button" data-v="${t.id}" aria-pressed="false">${t.name}</button>`).join('');
    $('#playChips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; toggle(picked, c.dataset.v); paint(); });
    $('#playAll').addEventListener('click', () => { D.ALL_THE_WAY.forEach((t) => picked.add(t)); paint(); });
    $('#playClear').addEventListener('click', () => { picked.clear(); paint(); });
    $('#playOrder').addEventListener('click', () => openBuilder('cheese', { toppings: [...picked] }));
    paint();
    $('#promoBtn').addEventListener('click', () => openBuilder('shake'));
    storesMini();
  }
  function storesMini() {
    const box = $('#miniStores'); if (!box) return;
    box.innerHTML = D.BRANCHES.map((b) => { const [cls, txt] = openLabel(b); return `<a class="mini-store" href="${ROOT}menu.html?branch=${b.id}"><span><b>${b.name}</b> · ${b.area}</span><span class="open-tag ${cls}">${txt}</span></a>`; }).join('');
  }

  function menu() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('branch') && D.branchById[qs.get('branch')]) { bag.branch = qs.get('branch'); saveBag(); }
    const ctx = () => {
      const b = D.branchById[bag.branch];
      if (!b.delivery && bag.type === 'delivery') { bag.type = 'pickup'; saveBag(); }
      $('#ctx').innerHTML = `<div class="ctx-l"><h2 class="cap">${T.howOrder}</h2><div class="seg" role="group" aria-label="${T.howOrder}"><button type="button" data-t="pickup" aria-pressed="${bag.type === 'pickup'}">${T.pickup}</button><button type="button" data-t="delivery" aria-pressed="${bag.type === 'delivery'}"${b.delivery ? '' : ` disabled title="${T.pickupOnly}"`}>${T.delivery}</button></div>
        <label class="select"><span class="sr">${T.store}</span><select id="ctxBranch">${D.BRANCHES.map((x) => `<option value="${x.id}"${x.id === bag.branch ? ' selected' : ''}>${x.name}${isOpen(x) ? '' : T.closedSuffix}</option>`).join('')}</select></label></div>
        <span class="eta-note">${ICON.clock} ${T.readyIn(S.db.settings.prepTarget + (bag.type === 'delivery' ? S.db.settings.deliveryMins : 0))}</span>`;
    };
    $('#ctx').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b || b.disabled) return; bag.type = b.dataset.t; saveBag(); ctx(); });
    $('#ctx').addEventListener('change', (e) => { if (e.target.id === 'ctxBranch') { bag.branch = e.target.value; saveBag(); ctx(); } });
    $('#cats').innerHTML = D.CATS.map((c) => `<a href="#${c.id}" data-c="${c.id}">${c.name}</a>`).join('');
    const render = () => {
      $('#menuBody').innerHTML = D.CATS.map((c) => `<section class="menu-cat" id="${c.id}"><div class="menu-cat-head"><h2 class="cap h-lg">${c.name}</h2><span class="orn"></span><p>${c.blurb}</p></div><div class="grid">
        ${D.ITEMS.filter((i) => i.cat === c.id).map((i) => { const off = !S.available(i.id); return `<article class="card${off ? ' off' : ''}" data-id="${i.id}">
          <div class="card-img" role="button" tabindex="0" aria-label="${i.builder ? T.customize : T.add}: ${i.name}">${photo(i.id, 600, 450)}${i.tag ? `<span class="card-tag">${i.tag}</span>` : ''}</div>
          <div class="card-body"><h3 class="cap card-name">${i.name}</h3><p class="card-desc">${i.desc}</p><p class="card-meta"><span class="price">${money(S.price(i.id))}</span><span>${i.kcal} ${T.kcal}</span></p>
          <button class="btn" type="button" data-act="${i.builder ? 'build' : 'add'}"${off ? ' disabled' : ''}>${off ? T.soldOut : i.builder ? T.customize : T.add}</button></div></article>`; }).join('')}</div></section>`).join('');
    };
    $('#menuBody').addEventListener('click', (e) => {
      const card = e.target.closest('.card'); if (!card) return;
      const it = D.byId[card.dataset.id], btn = e.target.closest('[data-act]');
      if (btn && btn.dataset.act === 'add') quickAdd(it.id, card.querySelector('.card-img'));
      else if (btn || e.target.closest('.card-img')) it.builder ? openBuilder(it.id) : quickAdd(it.id, card.querySelector('.card-img'));
    });
    $('#menuBody').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card-img')) { e.preventDefault(); e.target.click(); } });
    ctx(); render();
    S.subscribe(() => { render(); ctx(); });
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) $$('#cats a').forEach((a) => a.classList.toggle('on', a.dataset.c === en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    $$('.menu-cat').forEach((s) => io.observe(s));
    if (qs.get('item')) openBuilder(qs.get('item'));
  }

  function checkout() {
    const form = $('#coForm');
    if (!bag.lines.length) {
      $('#coWrap').innerHTML = `<div class="panel" style="grid-column:1/-1"><div class="empty">${photo('group', 360, 260)}<p><b>${T.nothingCo}</b><br>${T.nothingCo2}</p><a class="btn btn-lg" href="${ROOT}menu.html">${T.goMenu}</a></div></div>`; return;
    }
    let when = 'asap', promo = '';
    const slots = () => { const out = [], d = new Date(); d.setMinutes(Math.ceil((d.getMinutes() + 30) / 15) * 15, 0, 0); for (let i = 0; i < 8; i++) { out.push(new Date(d)); d.setMinutes(d.getMinutes() + 15); } return out; };
    const fmtT = clock;
    function paintForm() {
      const b = D.branchById[bag.branch];
      $('#coType').innerHTML = [['pickup', T.pickup, T.grab(S.db.settings.prepTarget)], ['delivery', T.delivery, b.delivery ? T.toDoor(S.db.settings.prepTarget + S.db.settings.deliveryMins, money(S.db.settings.deliveryFee)) : T.notAt(b.name)]]
        .map(([v, t, s]) => `<label class="${v === 'delivery' && !b.delivery ? 'disabled' : ''}"><input type="radio" name="type" value="${v}"${bag.type === v ? ' checked' : ''}${v === 'delivery' && !b.delivery ? ' disabled' : ''}><b>${t}</b><span>${s}</span></label>`).join('');
      $('#coBranch').innerHTML = D.BRANCHES.map((x) => `<option value="${x.id}"${x.id === bag.branch ? ' selected' : ''}${S.db.settings.paused[x.id] ? ' disabled' : ''}>${x.name} · ${x.area}${S.db.settings.paused[x.id] ? T.pausedSuffix : isOpen(x) ? '' : T.closedSuffix}</option>`).join('');
      $('#addrFields').hidden = bag.type !== 'delivery';
      $('#coSlots').innerHTML = `<button type="button" class="chip" data-w="asap" aria-pressed="${when === 'asap'}">${T.asap}</button>` + slots().map((d) => `<button type="button" class="chip" data-w="${fmtT(d)}" aria-pressed="${when === fmtT(d)}">${fmtT(d)}</button>`).join('');
      paintSummary();
    }
    function paintSummary() {
      $('#coLines').innerHTML = linesHTML(bag.lines, true);
      const t = S.totals(bag.lines, bag.type, promo);
      $('#coTotals').innerHTML = `<p class="sum-row"><span>${T.subtotal}</span><span>${money(t.subtotal)}</span></p>${t.discount ? `<p class="sum-row" style="color:#127a12"><span>${T.promo} ${esc(promo.toUpperCase())}</span><span>− ${money(t.discount)}</span></p>` : ''}
        ${t.fee ? `<p class="sum-row"><span>${T.deliveryFee}</span><span>${money(t.fee)}</span></p>` : ''}<p class="sum-row"><span>${T.service(Math.round(D.ORDER.serviceRate * 100))}</span><span>${money(t.service)}</span></p><p class="sum-row total"><span>${T.total}</span><span>${money(t.total)}</span></p>`;
      const min = bag.type === 'delivery' && t.subtotal < D.ORDER.minDelivery;
      $('#placeBtn').disabled = min;
      $('#placeBtn').textContent = min ? T.minDel(money(D.ORDER.minDelivery)) : T.place(money(t.total));
    }
    form.addEventListener('change', (e) => {
      if (e.target.name === 'type') { bag.type = e.target.value; saveBag(); paintForm(); }
      if (e.target.id === 'coBranch') { bag.branch = e.target.value; if (!D.branchById[bag.branch].delivery) bag.type = 'pickup'; saveBag(); paintForm(); }
    });
    $('#coSlots').addEventListener('click', (e) => { const c = e.target.closest('[data-w]'); if (!c) return; when = c.dataset.w; paintForm(); });
    $('#coLines').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-d]'); if (!b) return;
      const l = bag.lines.find((x) => x.id === b.closest('.line').dataset.id);
      l.qty += +b.dataset.d; if (l.qty <= 0) bag.lines = bag.lines.filter((x) => x !== l); saveBag();
      if (!bag.lines.length) location.reload(); else paintSummary();
    });
    $('#promoApply').addEventListener('click', () => {
      const v = $('#promoIn').value.trim(), ok = v.toUpperCase() === D.ORDER.promo.code;
      promo = ok ? v : ''; const m = $('#promoMsg'); m.hidden = false; m.className = `promo-msg ${ok ? 'ok' : 'no'}`;
      m.textContent = ok ? T.promoOk(D.ORDER.promo.code, Math.round(D.ORDER.promo.off * 100)) : T.promoNo;
      paintSummary();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const need = ['coName', 'coPhone'].concat(bag.type === 'delivery' ? ['coAddr'] : []);
      let ok = true;
      need.forEach((id) => { const f = $('#' + id), bad = id === 'coPhone' ? !/^\+?[\d\s-]{8,}$/.test(f.value.trim()) : f.value.trim().length < 2; f.closest('.field').classList.toggle('bad', bad); if (bad) ok = false; });
      if (!ok) { $('.field.bad input').focus(); return; }
      const order = S.placeOrder({
        lines: bag.lines, type: bag.type, branch: bag.branch, promo, when,
        customer: { name: $('#coName').value.trim(), phone: $('#coPhone').value.trim(), address: bag.type === 'delivery' ? $('#coAddr').value.trim() : '', notes: $('#coNotes').value.trim() },
        payment: form.querySelector('input[name="pay"]:checked').value,
      });
      bag.lines = []; saveBag();
      location.href = `${ROOT}track.html?id=${encodeURIComponent(order.id)}`;
    });
    paintForm();
  }

  function track() {
    const id = new URLSearchParams(location.search).get('id');
    const box = $('#trkWrap');
    const PIC = { new: 'group', preparing: 'grill', ready: 'group', out: 'group', done: 'table', cancelled: 'diner' };
    const SUB = T.sub;
    let timer;
    function paint() {
      const o = S.get(id);
      if (!o) {
        const mine = S.db.orders.slice(-6).reverse();
        box.innerHTML = `<div class="panel" style="grid-column:1/-1"><div class="panel-b"><h2 class="cap h-md">${id ? T.notFound(esc(id)) : T.trackTitle}</h2><p style="margin:10px 0 20px;color:var(--mute)">${T.trackNote}</p>
          ${mine.length ? `<div class="recent">${mine.map((x) => `<a href="?id=${encodeURIComponent(x.id)}"><span>${esc(x.id)} · ${esc(D.branchById[x.branch].name)}</span><span>${(D.STATUS.find((s) => s.id === x.status) || { name: T.cancelled }).name}</span></a>`).join('')}</div>` : `<a class="btn btn-lg" href="${ROOT}menu.html">${T.startAn}</a>`}</div></div>`;
        return;
      }
      const flow = S.flow(o), idx = flow.indexOf(o.status), st = D.STATUS.find((s) => s.id === o.status) || { name: T.cancelled };
      const b = D.branchById[o.branch], at = (s) => { const e = o.timeline.find((x) => x.status === s); return e ? clock(new Date(e.at)) : ''; };
      box.innerHTML = `<div><div class="panel"><div class="panel-b"><div class="trk-state"><div class="eta" id="eta"></div>
          <div><span class="trk-tag">${esc(o.id)} · ${o.type === 'delivery' ? T.delivery : T.pickup}</span><h1 class="cap trk-title">${o.status === 'cancelled' ? T.cancelled : st.name}</h1><p style="color:var(--mute)">${SUB[o.status] || ''}</p></div></div>
          <ol class="tl" style="--n:${flow.length}">${flow.map((s, i) => `<li class="${o.status === 'done' || i < idx ? 'done' : i === idx ? 'now' : ''}"><div class="bar"><i></i></div><b>${D.STATUS.find((x) => x.id === s).name}</b><small>${at(s) || '&nbsp;'}</small></li>`).join('')}</ol>
          <div class="trk-img">${photo(PIC[o.status] || 'group', 1200, 520)}</div>
          <p class="live">${T.live} <a href="${BASE}dashboard/index.html#/kitchen" target="_blank" rel="noopener">${T.kitchen}</a></p></div></div></div>
        <div><div class="panel"><div class="panel-h"><h2 class="cap">${T.yourOrder}</h2></div><ul class="drawer-list">${linesHTML(o.lines.map((l) => ({ ...l })), false)}</ul>
          <div class="panel-b" style="border-top:1px solid var(--line)"><p class="sum-row"><span>${T.subtotal}</span><span>${money(o.subtotal)}</span></p>${o.discount ? `<p class="sum-row"><span>${T.promo}</span><span>− ${money(o.discount)}</span></p>` : ''}${o.fee ? `<p class="sum-row"><span>${T.deliveryFee}</span><span>${money(o.fee)}</span></p>` : ''}<p class="sum-row"><span>${T.service(Math.round(D.ORDER.serviceRate * 100))}</span><span>${money(o.service)}</span></p><p class="sum-row total"><span>${T.total}</span><span>${money(o.total)}</span></p></div></div>
          <div class="panel"><div class="panel-b"><dl class="kv"><dt>${T.store}</dt><dd>${b.name} · ${b.area}</dd><dt>${T.phone}</dt><dd dir="ltr">${b.phone}</dd><dt>${T.name}</dt><dd>${esc(o.customer.name)}</dd>${o.customer.address ? `<dt>${T.address}</dt><dd>${esc(o.customer.address)}</dd>` : ''}<dt>${T.payment}</dt><dd>${esc(D.label(o.payment))}</dd><dt>${T.time}</dt><dd>${o.when === 'asap' ? T.soon : esc(o.when)}</dd></dl>
          <a class="btn btn-block" style="margin-top:18px" href="${ROOT}menu.html">${T.again}</a></div></div></div>`;
      tick();
    }
    function tick() {
      const o = S.get(id), el = $('#eta'); if (!o || !el) return;
      const total = o.eta * 60000, left = Math.max(0, o.createdAt + total - Date.now()), done = ['done', 'cancelled'].includes(o.status);
      const p = done ? 1 : 1 - left / total, Cc = 2 * Math.PI * 62;
      el.innerHTML = `<svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="62" fill="#fff" stroke="#e7e7e7" stroke-width="8"/><circle cx="70" cy="70" r="62" fill="none" stroke="#D21033" stroke-width="8" stroke-dasharray="${(Cc * p).toFixed(1)} ${Cc.toFixed(1)}"/></svg>
        <div><b>${done ? '✓' : Math.ceil(left / 60000)}</b><span>${done ? (o.status === 'done' ? T.doneW : T.closedW) : T.minLeft}</span></div>`;
    }
    paint(); S.subscribe(paint); clearInterval(timer); timer = setInterval(tick, 1000);
  }

  function locations() {
    $('#locMap').innerHTML = mapHTML(location.hash.slice(1));
    const days = T.everyDay;
    const paint = () => {
      $('#locList').innerHTML = D.BRANCHES.map((b) => {
        const [cls, txt] = openLabel(b);
        return `<article class="panel" id="${b.id}" data-reveal><div class="panel-h" style="justify-content:space-between"><h2 class="cap">${b.name}</h2><span class="open-tag ${cls}">${txt}</span></div>
          <div class="panel-b"><dl class="kv"><dt>${T.addr}</dt><dd>${b.area}${T.cairo}</dd><dt>${T.phone}</dt><dd dir="ltr">${b.phone}</dd><dt>${T.hours}</dt><dd>${days}: ${hoursText(b)}</dd><dt>${T.seats}</dt><dd>${b.seats}</dd><dt>${T.serviceL}</dt><dd>${T.svc(b.delivery)}</dd></dl>
          <div class="btns" style="margin-top:18px"><a class="btn" href="${ROOT}menu.html?branch=${b.id}">${T.orderFrom(b.name)}</a></div></div></article>`;
      }).join('');
      reveal();
    };
    paint(); S.subscribe(paint);
  }

  /* ---------- boot ---------- */
  chrome();
  ({ home, menu, checkout, track, locations }[page] || (() => {}))();
  if (page === 'home') S.subscribe(storesMini);
  reveal();
  window.OF_SITE = { openBuilder };
})();
