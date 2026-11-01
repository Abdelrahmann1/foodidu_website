/* OVERFLOW Ops — operations dashboard. Live orders come from the customer site through OF_STORE (same browser);
   60 days of history come from OF_SEED. Views: overview, orders, kitchen, menu, customers, analytics, stores, settings. */
(() => {
  const D = window.OF_DATA, S = window.OF_STORE, C = window.OF_CHARTS, SEED = window.OF_SEED;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => `EGP ${Math.round(n).toLocaleString('en-US')}`;
  const moneyC = (n) => `EGP ${C.compact(n)}`;
  const int = (n) => Math.round(n).toLocaleString('en-US');
  const HOUR = 36e5, DAY = 864e5;
  const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } return v; };
  const ic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I = {
    overview: ic('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    orders: ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
    kitchen: ic('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9Z"/>'),
    menu: ic('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19V5M9 8h6M9 12h6"/>'),
    customers: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
    analytics: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    stores: ic('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>'),
    settings: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'), bell: ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: ic('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'), plus: ic('<path d="M12 5v14M5 12h14"/>'), print: ic('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6Z"/>'),
    ext: ic('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), alert: ic('<path d="M12 3l10 18H2Z"/><path d="M12 10v4M12 17.5v.5"/>'),
    burger: ic('<path d="M3 7h18M3 12h18M3 17h18"/>'), x: ic('<path d="M6 6l12 12M18 6L6 18"/>'), down: ic('<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>'), bolt: ic('<path d="M13 2L4 14h7l-1 8 9-12h-7Z"/>'),
    out: ic('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'), money: ic('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>'),
  };
  const CH = { pickup: { name: 'Pickup', color: 'var(--s1)' }, delivery: { name: 'Delivery', color: 'var(--s2)' }, dinein: { name: 'Dine-in', color: 'var(--s3)' } };
  const STATUS_NAME = Object.fromEntries(D.STATUS.map((s) => [s.id, s.short])); STATUS_NAME.cancelled = 'Cancelled';
  const stPill = (s) => `<span class="st ${s}">${STATUS_NAME[s] || s}</span>`;
  const chan = (t) => `<span class="chan"><i style="background:${CH[t].color}"></i>${CH[t].name}</span>`;
  const fmtTime = (t) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDay = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtWhen = (t) => { const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0); return t >= today.getTime() ? `Today, ${fmtTime(t)}` : t >= today.getTime() - DAY ? `Yesterday, ${fmtTime(t)}` : `${fmtDay(t)}, ${fmtTime(t)}`; };
  const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`; };
  const pic = (id) => `<img src="${D.img(id, 120, 104)}" alt="" loading="lazy">`;
  const hourLabel = (h) => { const x = h % 24; return `${x % 12 || 12}${x >= 12 ? 'pm' : 'am'}`; };

  /* ================= data ================= */
  const custById = SEED.customers;
  let ver = 0, cache = null;
  S.subscribe(() => { ver++; });
  function prepOf(o) {
    const a = o.timeline.find((x) => x.status === 'preparing'), b = o.timeline.find((x) => x.status === 'ready');
    return a && b ? Math.max(1, Math.round((b.at - a.at) / 60000)) : null;
  }
  function all() {
    if (cache && cache.v === ver) return cache.list;
    const live = S.db.orders.map((o) => ({
      id: o.id, t: o.createdAt, branch: o.branch, type: o.type, items: o.lines.map((l) => ({ item: l.item, qty: l.qty, unit: l.unit, opts: l.opts })), total: o.total,
      prep: prepOf(o), cust: `p:${o.customer.phone}`, name: o.customer.name, phone: o.customer.phone, status: o.status, live: true, raw: o,
    }));
    const list = SEED.orders.concat(live);
    cache = { v: ver, list }; return list;
  }
  const custName = (o) => (o.live ? o.name : custById[o.cust].name);
  const custPhone = (o) => (o.live ? o.phone : custById[o.cust].phone);
  const mask = (p) => (p ? `${p.slice(0, 3)} •••• ${p.slice(-3)}` : '');

  /* ---------- filters ---------- */
  const F = Object.assign({ range: '7d', branch: 'all' }, store('of-ops-filters') || {});
  const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7 days'], ['30d', '30 days'], ['60d', '60 days']];
  function win(range = F.range) {
    const now = Date.now(), t0 = new Date(); t0.setHours(0, 0, 0, 0); const today = t0.getTime();
    if (range === 'today') return { from: today, to: now, pFrom: today - DAY, pTo: now - DAY, unit: 'hour', label: 'today', vs: 'vs yesterday' };
    if (range === 'yesterday') return { from: today - DAY, to: today, pFrom: today - 2 * DAY, pTo: today - DAY, unit: 'hour', label: 'yesterday', vs: 'vs day before' };
    const n = parseInt(range, 10), from = today - (n - 1) * DAY;
    return { from, to: now, pFrom: from - n * DAY, pTo: from, unit: 'day', days: n, label: `last ${n} days`, vs: `vs previous ${n} days` };
  }
  const inB = (o, b = F.branch) => b === 'all' || o.branch === b;
  const slice = (from, to, b = F.branch) => all().filter((o) => o.t >= from && o.t < to && inB(o, b));
  const valid = (o) => o.status !== 'cancelled';
  function metrics(list) {
    const ok = list.filter(valid), sales = ok.reduce((s, o) => s + o.total, 0), preps = ok.filter((o) => o.prep);
    return { sales, orders: ok.length, aov: ok.length ? sales / ok.length : 0, prep: preps.length ? preps.reduce((s, o) => s + o.prep, 0) / preps.length : 0, cancelled: list.length - ok.length };
  }
  function buckets(w) {
    const out = [];
    if (w.unit === 'hour') { for (let t = w.from; t < w.to; t += HOUR) out.push(t); }
    else for (let t = w.from; t < w.to; t += DAY) out.push(t);
    return out;
  }
  function series(list, starts, size, fn) {
    const vals = starts.map(() => 0);
    list.forEach((o) => { const i = Math.floor((o.t - starts[0]) / size); if (i >= 0 && i < vals.length) vals[i] += fn(o); });
    return vals;
  }
  function deltaHTML(cur, prev, upGood = true, fmt) {
    if (!prev) return '<span class="delta flat">new</span>';
    const d = (cur - prev) / prev, pct = Math.round(d * 1000) / 10, up = pct > 0;
    if (Math.abs(pct) < 0.5) return '<span class="delta flat">±0%</span>';
    const good = up === upGood;
    return `<span class="delta ${good ? 'up' : 'down'}" title="${fmt ? fmt(prev) : ''} before">${up ? '▲' : '▼'} ${Math.abs(pct)}%</span>`;
  }

  /* ================= auth ================= */
  const AUTH = 'of-ops-auth';
  function login() {
    document.body.innerHTML = `<div class="auth"><aside class="auth-side"><div class="side-brand" style="padding:0"><span class="mark">O</span><div><b>OVERFLOW Ops</b><span>Burgers &amp; Fries · Cairo</span></div></div>
      <div><h1>Every ticket, every store, one screen.</h1><p>Live orders from the website land here first. Fire them in the kitchen, watch prep times, change the menu, and see how all four stores are doing.</p></div>
      <div class="auth-quote"><div><b>4</b><span>stores live</span></div><div><b>${int(SEED.orders.length)}</b><span>orders in 60 days</span></div><div><b>${Math.round(metrics(SEED.orders).prep * 10) / 10} min</b><span>avg prep time</span></div></div></aside>
      <main class="auth-main"><form class="auth-card" id="authForm"><span class="mark" style="width:44px;height:44px;font-size:22px">O</span><h2>Sign in to OVERFLOW Ops</h2><p class="muted">A demo with sample orders and customers. No password needed: everything stays in this browser.</p>
        <div class="role"><label><input type="radio" name="role" value="manager" checked><b>Mariam Hassan · Operations manager</b><span>Full access: sales, menu, stores, settings</span></label>
        <label><input type="radio" name="role" value="kitchen"><b>Kitchen crew · New Cairo</b><span>Opens straight on the kitchen display</span></label></div>
        <button class="btn btn-p btn-lg" style="width:100%" type="submit">Continue to dashboard</button>
        <p class="muted" style="font-size:12.5px;margin-top:16px"><a href="../index.html">Back to the OVERFLOW site</a> · <a href="/business/">Back to Foodidu Business</a></p></form></main></div>`;
    $('#authForm').addEventListener('submit', (e) => {
      e.preventDefault(); const role = $('#authForm input[name="role"]:checked').value;
      store(AUTH, { role, at: Date.now() }); location.hash = role === 'kitchen' ? '#/kitchen' : '#/overview'; location.reload();
    });
  }

  /* ================= shell ================= */
  const NAV = [
    ['Operations', [['overview', 'Overview'], ['orders', 'Orders'], ['kitchen', 'Kitchen display']]],
    ['Catalogue', [['menu', 'Menu & pricing']]],
    ['Insights', [['analytics', 'Analytics'], ['customers', 'Customers']]],
    ['Business', [['stores', 'Stores'], ['settings', 'Settings']]],
  ];
  const TITLES = { overview: 'Overview', orders: 'Orders', kitchen: 'Kitchen display', menu: 'Menu & pricing', analytics: 'Analytics', customers: 'Customers', stores: 'Stores', settings: 'Settings' };
  function shell() {
    const auth = store(AUTH) || {};
    document.body.innerHTML = `<div class="app"><aside class="side" id="side"><div class="side-brand"><span class="mark">O</span><div><b>OVERFLOW Ops</b><span>4 stores · Cairo</span></div></div>
      <nav aria-label="Dashboard">${NAV.map(([h, items]) => `<h4>${h}</h4>${items.map(([id, t]) => `<a class="nav-i" href="#/${id}" data-v="${id}">${I[id === 'stores' ? 'stores' : id]}<span>${t}</span>${id === 'orders' ? '<span class="count soft" id="cOrders" hidden></span>' : id === 'kitchen' ? '<span class="count" id="cKitchen" hidden></span>' : ''}</a>`).join('')}`).join('')}</nav>
      <div class="side-foot"><div class="store-dots" id="storeDots"></div><a class="side-link" href="../index.html" target="_blank" rel="noopener">Open customer site ${I.ext.replace('<svg', '<svg width="15" height="15"')}</a></div></aside>
      <div class="main"><p class="demo-bar">Demo with sample data: nothing here is real, so try anything. <a href="/business/">Back to Foodidu Business</a></p><header class="top"><button class="icon-btn burger-btn" id="sideBtn" aria-label="Menu">${I.burger}</button><div><span class="crumb">OVERFLOW Ops /</span> <h1 id="ttl" style="display:inline"></h1></div>
        <div class="search"><span>${I.search}</span><input id="searchIn" placeholder="Search orders, pages…" aria-label="Search" readonly><kbd>⌘K</kbd></div>
        <button class="icon-btn" id="bellBtn" aria-label="Notifications">${I.bell}<span class="dot" id="bellDot" hidden></span></button>
        <button class="icon-btn" id="themeBtn" aria-label="Toggle theme"></button>
        <button class="avatar" id="meBtn" aria-label="Account" title="${auth.role === 'kitchen' ? 'Kitchen crew' : 'Mariam Hassan'}">${auth.role === 'kitchen' ? 'KC' : 'MH'}</button>
        <div class="notif" id="notif"><div class="notif-h"><span>New orders</span><button class="btn btn-sm btn-ghost" id="notifClear">Mark all read</button></div><ul id="notifList"></ul></div></header>
        <main class="view" id="view" tabindex="-1"></main></div></div>
      <div class="scrim" id="scrim"></div><aside class="drawer" id="drawer" aria-hidden="true" aria-label="Order details"></aside>
      <dialog class="cmd" id="cmd"><input id="cmdIn" placeholder="Jump to an order, a page, or an action…" aria-label="Command"><ul id="cmdList"></ul></dialog>
      <dialog class="modal" id="modal"></dialog><div class="toast-zone" id="toasts" aria-live="polite"></div><div id="printTicket" aria-hidden="true"></div>`;
    $('#sideBtn').addEventListener('click', () => $('#side').classList.toggle('on'));
    $$('#side a.nav-i').forEach((a) => a.addEventListener('click', () => $('#side').classList.remove('on')));
    $('#themeBtn').addEventListener('click', () => setTheme(curTheme() === 'dark' ? 'light' : 'dark'));
    $('#meBtn').addEventListener('click', () => confirmModal('Sign out?', 'You can sign back in any time. Orders and settings stay in this browser.', 'Sign out', () => { localStorage.removeItem(AUTH); location.hash = ''; location.reload(); }));
    $('#bellBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#notif').classList.toggle('on'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('#notif')) $('#notif').classList.remove('on'); });
    $('#notifClear').addEventListener('click', () => { unread = []; paintNotif(); });
    $('#notifList').addEventListener('click', (e) => { const b = e.target.closest('[data-o]'); if (b) { $('#notif').classList.remove('on'); openOrder(b.dataset.o); } });
    $('#scrim').addEventListener('click', closeDrawer);
    $('#searchIn').addEventListener('focus', openCmd); $('#searchIn').addEventListener('click', openCmd);
    addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); }
      if (e.key === 'Escape') { closeDrawer(); $('#notif').classList.remove('on'); }
    });
    paintTheme();
  }

  /* ---------- theme ---------- */
  const curTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function setTheme(t) { if (t === 'system') { delete document.documentElement.dataset.theme; store('of-ops-theme', null); } else { document.documentElement.dataset.theme = t; store('of-ops-theme', t); } paintTheme(); render(); }
  function paintTheme() { const b = $('#themeBtn'); if (b) b.innerHTML = curTheme() === 'dark' ? I.sun : I.moon; }
  const saved = store('of-ops-theme'); if (saved) document.documentElement.dataset.theme = saved;

  /* ---------- toasts, notifications, beep ---------- */
  function toast(title, sub, action) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<i></i><b>${esc(title)}</b><span>${esc(sub || '')}</span>${action ? `<button class="btn btn-sm">${esc(action.label)}</button>` : ''}`;
    if (action) t.querySelector('button').addEventListener('click', () => { action.run(); t.remove(); });
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 6000);
  }
  let actx;
  function beep() {
    if (!S.db.settings.sound && S.db.settings.sound !== undefined) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const n = actx.currentTime;
      [[880, 0], [1320, 0.14]].forEach(([f, d]) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, n + d); g.gain.exponentialRampToValueAtTime(0.18, n + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, n + d + 0.22); o.connect(g).connect(actx.destination); o.start(n + d); o.stop(n + d + 0.25); });
    } catch { /* audio not available */ }
  }
  let seen = new Set(store('of-ops-seen') || []), unread = store('of-ops-unread') || [];
  function watchNew() {
    const fresh = S.db.orders.filter((o) => !seen.has(o.id));
    fresh.forEach((o) => {
      seen.add(o.id);
      if (Date.now() - o.createdAt < 5 * 60000) {
        unread.unshift(o.id); beep();
        toast(`New order ${o.id}`, `${o.customer.name} · ${D.branchById[o.branch].name} · ${money(o.total)}`, { label: 'View', run: () => openOrder(o.id) });
        justIn.add(o.id); setTimeout(() => justIn.delete(o.id), 4000);
      }
    });
    if (fresh.length) { store('of-ops-seen', [...seen]); unread = unread.slice(0, 20); store('of-ops-unread', unread); }
    paintNotif(); paintCounts();
  }
  const justIn = new Set();
  function paintNotif() {
    store('of-ops-unread', unread);
    $('#bellDot').hidden = !unread.length;
    const list = unread.map((id) => S.get(id)).filter(Boolean);
    $('#notifList').innerHTML = list.length ? list.map((o) => `<li><button data-o="${o.id}"><i></i><b>${o.id} · ${money(o.total)}</b><span>${esc(o.customer.name)} · ${D.branchById[o.branch].name} · ${ago(o.createdAt)}</span></button></li>`).join('') : '<li class="empty" style="padding:24px">No new orders.</li>';
  }
  function paintCounts() {
    const open = S.db.orders.filter((o) => !['done', 'cancelled'].includes(o.status)), fresh = open.filter((o) => o.status === 'new');
    const co = $('#cOrders'), ck = $('#cKitchen');
    if (co) { co.hidden = !open.length; co.textContent = open.length; }
    if (ck) { ck.hidden = !fresh.length; ck.textContent = fresh.length; }
    const dots = $('#storeDots');
    if (dots) dots.innerHTML = D.BRANCHES.map((b) => { const paused = S.db.settings.paused[b.id], o = isOpen(b); const n = open.filter((x) => x.branch === b.id).length; return `<div class="store-dot"><i class="${paused ? 'pause' : o ? '' : 'off'}"></i><span>${b.name}</span><span>${paused ? 'paused' : o ? `${n} open` : 'closed'}</span></div>`; }).join('');
  }
  function isOpen(b, d = new Date()) { const h = d.getHours() + d.getMinutes() / 60, [o, c] = b.hours; return (h >= o && h < c) || (h + 24 >= o && h + 24 < c); }

  /* ---------- modal + command palette ---------- */
  function confirmModal(title, body, okLabel, onOk, danger) {
    const m = $('#modal');
    m.innerHTML = `<form method="dialog"><div class="modal-b"><h3>${esc(title)}</h3><p class="muted" style="margin:0">${esc(body)}</p></div><div class="modal-f"><button class="btn" value="cancel">Cancel</button><button class="btn ${danger ? 'btn-p' : 'btn-p'}" value="ok">${esc(okLabel)}</button></div></form>`;
    m.onclose = () => { if (m.returnValue === 'ok') onOk(); };
    m.showModal();
  }
  let cmdSel = 0, cmdItems = [];
  function openCmd() { $('#searchIn').blur(); $('#cmdIn').value = ''; paintCmd(); $('#cmd').showModal(); $('#cmdIn').focus(); }
  function paintCmd() {
    const q = $('#cmdIn').value.trim().toLowerCase();
    const pages = Object.entries(TITLES).map(([id, t]) => ({ label: t, hint: 'Page', run: () => { location.hash = `#/${id}`; } }));
    const acts = [{ label: 'Simulate a website order', hint: 'Action', run: simulate }, { label: `Switch to ${curTheme() === 'dark' ? 'light' : 'dark'} theme`, hint: 'Action', run: () => setTheme(curTheme() === 'dark' ? 'light' : 'dark') }];
    const orders = all().slice(-400).reverse().filter((o) => !q || o.id.toLowerCase().includes(q) || custName(o).toLowerCase().includes(q)).slice(0, 8).map((o) => ({ label: `${o.id} · ${custName(o)}`, hint: `${money(o.total)} · ${STATUS_NAME[o.status]}`, run: () => openOrder(o.id) }));
    cmdItems = [...pages, ...acts].filter((x) => !q || x.label.toLowerCase().includes(q)).concat(orders).slice(0, 12);
    cmdSel = Math.min(cmdSel, Math.max(0, cmdItems.length - 1));
    $('#cmdList').innerHTML = cmdItems.length ? cmdItems.map((x, i) => `<li><button class="${i === cmdSel ? 'on' : ''}" data-i="${i}">${esc(x.label)}<small>${esc(x.hint)}</small></button></li>`).join('') : '<li class="empty">Nothing matches.</li>';
  }
  function runCmd(i) { const x = cmdItems[i]; if (!x) return; $('#cmd').close(); x.run(); }
  function cmdEvents() {
    $('#cmdIn').addEventListener('input', () => { cmdSel = 0; paintCmd(); });
    $('#cmdIn').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdSel = Math.min(cmdItems.length - 1, cmdSel + 1); paintCmd(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); cmdSel = Math.max(0, cmdSel - 1); paintCmd(); }
      if (e.key === 'Enter') { e.preventDefault(); runCmd(cmdSel); }
    });
    $('#cmdList').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) runCmd(+b.dataset.i); });
    $('#cmd').addEventListener('click', (e) => { if (e.target.id === 'cmd') $('#cmd').close(); });
  }

  /* ---------- simulate an order (demo) ---------- */
  function simulate() {
    const r = Math.random, pickI = (arr) => arr[Math.floor(r() * arr.length)];
    const avail = D.ITEMS.filter((i) => S.available(i.id)), lines = [];
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const cat = pickI(['burgers', 'burgers', 'burgers', 'fries', 'fries', 'shakes', 'drinks', 'dogs', 'sandwiches']), pool = avail.filter((x) => x.cat === cat);
      const it = pickI(pool.length ? pool : avail);
      const opts = {};
      if (it.builder === 'burger') opts.toppings = r() < 0.5 ? [...D.ALL_THE_WAY] : D.TOPPINGS.filter(() => r() < 0.3).map((t) => t.id);
      if (it.builder === 'burger' && it.art === 'burger') opts.extras = r() < 0.2 ? ['x-bacon'] : [];
      if (it.builder === 'fries' || it.builder === 'drink') opts.size = pickI(['regular', 'regular', 'large']);
      if (it.builder === 'fries') opts.style = it.cajun ? 'Cajun' : 'Classic';
      if (it.builder === 'shake') opts.mixins = D.MIXINS.filter(() => r() < 0.2);
      lines.push({ item: it.id, qty: r() < 0.2 ? 2 : 1, opts, note: '' });
    }
    const branches = D.BRANCHES.filter((b) => !S.db.settings.paused[b.id]), b = pickI(branches.length ? branches : D.BRANCHES), c = pickI(SEED.customers);
    const type = b.delivery && r() < 0.5 ? 'delivery' : 'pickup';
    S.placeOrder({ lines, type, branch: b.id, customer: { name: c.name, phone: c.phone, address: type === 'delivery' ? `${12 + Math.floor(r() * 80)} ${pickI(['Road 9', 'El Nasr St.', '90th Street', 'Arkan Plaza', 'Hassan Sabry St.'])}` : '', notes: r() < 0.3 ? pickI(['Extra napkins please', 'No onions on the second burger', 'Ring the bell twice', 'Well done']) : '' }, payment: pickI(['Cash', 'Card at the counter', 'Wallet (InstaPay)']), promo: '', when: 'asap' });
  }

  /* ================= router ================= */
  const route = () => (location.hash.replace(/^#\//, '') || 'overview').split('?')[0];
  function render() {
    const v = TITLES[route()] ? route() : 'overview';
    $('#ttl').textContent = TITLES[v];
    $$('#side a.nav-i').forEach((a) => a.classList.toggle('on', a.dataset.v === v));
    C.hideTip();
    const old = $('#view'), view = old.cloneNode(false); old.replaceWith(view);
    ({ overview, orders, kitchen, menu, analytics, customers, stores, settings }[v])(view);
    paintCounts();
  }
  function filtersBar(extra = '', opts = {}) {
    return `<div class="filters"><div class="seg" role="group" aria-label="Date range">${RANGES.map(([id, t]) => `<button type="button" data-range="${id}" aria-pressed="${F.range === id}">${t}</button>`).join('')}</div>
      ${opts.noBranch ? '' : `<label class="sel"><span class="sr">Store</span><select data-branch><option value="all">All stores</option>${D.BRANCHES.map((b) => `<option value="${b.id}"${F.branch === b.id ? ' selected' : ''}>${b.name}</option>`).join('')}</select></label>`}
      <span class="spacer"></span>${extra}</div>`;
  }
  function bindFilters(root) {
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-range]'); if (b) { F.range = b.dataset.range; store('of-ops-filters', F); render(); } });
    root.addEventListener('change', (e) => { if (e.target.matches('[data-branch]')) { F.branch = e.target.value; store('of-ops-filters', F); render(); } });
  }
  const legend = (items) => `<ul class="legend">${items.map((x) => `<li><i class="${x.line ? `ln${x.dash ? ' dash' : ''}` : ''}" style="background:${x.color};--c:${x.color}"></i><span>${esc(x.name)}</span>${x.value != null ? `<b>${esc(x.value)}</b>` : ''}</li>`).join('')}</ul>`;

  /* ================= overview ================= */
  function overview(root) {
    const w = win(), cur = slice(w.from, w.to), prev = slice(w.pFrom, w.pTo), m = metrics(cur), pm = metrics(prev);
    const starts = buckets(w), size = w.unit === 'hour' ? HOUR : DAY;
    const sub12 = (fn) => { const step = (w.to - w.from) / 12, out = []; for (let i = 0; i < 12; i++) out.push(fn(cur.filter((o) => o.t >= w.from + i * step && o.t < w.from + (i + 1) * step))); return out; };
    const open = S.db.orders.filter((o) => !['done', 'cancelled'].includes(o.status) && inB({ branch: o.branch }));
    const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
    const auth = store(AUTH) || {};
    root.innerHTML = `<div class="ph"><div><h2>${greet}${auth.role === 'kitchen' ? '' : ', Mariam'}</h2><p>${F.branch === 'all' ? 'All four stores' : D.branchById[F.branch].name} · ${w.label}. <span class="live-tag" style="margin-left:6px">Live · ${open.length} open ticket${open.length === 1 ? '' : 's'}</span></p></div>
        <div style="display:flex;gap:8px"><button class="btn" id="simBtn">${I.bolt} Simulate order</button><a class="btn btn-p" href="#/kitchen">${I.kitchen} Kitchen display</a></div></div>
      ${filtersBar()}
      <div class="g">
        ${kpi('Net sales', I.money, money(m.sales), deltaHTML(m.sales, pm.sales, true, money), w.vs, C.spark(sub12((l) => metrics(l).sales)))}
        ${kpi('Orders', I.orders, int(m.orders), deltaHTML(m.orders, pm.orders, true, int), w.vs, C.spark(sub12((l) => metrics(l).orders)))}
        ${kpi('Average order', I.analytics, money(m.aov), deltaHTML(m.aov, pm.aov, true, money), w.vs, C.spark(sub12((l) => metrics(l).aov)))}
        ${kpi('Avg. prep time', I.clock, `${(Math.round(m.prep * 10) / 10).toFixed(1)} min`, deltaHTML(m.prep, pm.prep, false), `target ${S.db.settings.prepTarget} min`, C.spark(sub12((l) => metrics(l).prep), 'var(--s2)'))}
        <section class="card c8"><div class="card-h"><div><h3>Net sales</h3><p>EGP per ${w.unit}, ${w.label} ${w.vs}</p></div>${legend([{ name: 'This period', color: 'var(--s1)', line: true }, { name: 'Previous period', color: 'var(--muted)', line: true, dash: true }])}</div><div class="card-b"><div class="chart" id="chSales"></div></div></section>
        <section class="card c4"><div class="card-h"><div><h3>How people ordered</h3><p>Share of orders by channel</p></div></div><div class="card-b"><div id="chChan"></div>
          <div class="sec-t">Open tickets now</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${['new', 'preparing', 'ready'].map((s) => `<a href="#/kitchen" class="card" style="padding:12px;text-decoration:none;box-shadow:none">${stPill(s)}<div class="hero-n" style="font-size:30px;margin-top:8px">${open.filter((o) => o.status === s).length}</div></a>`).join('')}</div></div></section>
        <section class="card c6"><div class="card-h"><div><h3>Orders by hour of day</h3><p>Average orders per hour, ${w.label}</p></div></div><div class="card-b"><div class="chart" id="chHours"></div></div></section>
        <section class="card c6"><div class="card-h"><div><h3>Top items</h3><p>By sales, ${w.label}</p></div><a class="btn btn-sm btn-ghost" href="#/menu">Manage menu</a></div><div class="card-b"><div id="chTop"></div></div></section>
        <section class="card c7"><div class="card-h"><div><h3>Live from the website</h3><p>Newest orders placed online</p></div><a class="btn btn-sm btn-ghost" href="#/orders">All orders</a></div><div class="card-b flush" id="feed"></div></section>
        <section class="card c5"><div class="card-h"><div><h3>Store leaderboard</h3><p>${w.label}</p></div><a class="btn btn-sm btn-ghost" href="#/stores">Stores</a></div><div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Store</th><th class="n">Sales</th><th class="n">Orders</th><th class="n">Prep</th><th>Trend</th></tr></thead><tbody>
          ${D.BRANCHES.map((b) => { const l = slice(w.from, w.to, b.id), bm = metrics(l), pl = metrics(slice(w.pFrom, w.pTo, b.id)); const st = (w.to - w.from) / 12, sp = []; for (let i = 0; i < 12; i++) sp.push(metrics(l.filter((o) => o.t >= w.from + i * st && o.t < w.from + (i + 1) * st)).sales); return { b, bm, pl, sp }; }).sort((a, b2) => b2.bm.sales - a.bm.sales)
            .map(({ b, bm, pl, sp }) => `<tr><td class="strong">${b.name}<span class="sub">${deltaHTML(bm.sales, pl.sales)}</span></td><td class="n">${moneyC(bm.sales)}</td><td class="n">${int(bm.orders)}</td><td class="n">${bm.prep.toFixed(1)}m</td><td>${C.spark(sp)}</td></tr>`).join('')}</tbody></table></div></div></section>
      </div>`;
    bindFilters(root);
    $('#simBtn').addEventListener('click', simulate);
    const sales = series(cur.filter(valid), starts, size, (o) => o.total), psales = series(prev.filter(valid), starts.map((t) => t - (w.from - w.pFrom)), size, (o) => o.total);
    C.line($('#chSales'), { x: starts, series: [{ name: 'This period', values: sales, color: 'var(--s1)', area: true }, { name: 'Previous period', values: psales, color: 'var(--muted)', dash: true }], fmt: money, xfmt: (t) => (w.unit === 'hour' ? hourLabel(new Date(t).getHours()) : fmtDay(t)), tipTitle: (i) => (w.unit === 'hour' ? `${fmtDay(starts[i])}, ${hourLabel(new Date(starts[i]).getHours())}` : new Date(starts[i]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + (i === starts.length - 1 && w.to - starts[i] < DAY ? ' (so far)' : '')), height: 270, label: 'Net sales over time' });
    const ch = ['pickup', 'delivery', 'dinein'].map((t) => ({ name: CH[t].name, value: cur.filter((o) => valid(o) && o.type === t).length, color: CH[t].color }));
    C.share($('#chChan'), ch, { unit: 'orders', fmt: int });
    const HRS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2], days = Math.max(1, Math.round((w.to - w.from) / DAY));
    const byH = HRS.map((h) => cur.filter((o) => valid(o) && new Date(o.t).getHours() === h).length / days);
    C.columns($('#chHours'), { labels: HRS.map(hourLabel), values: byH, color: 'var(--s1)', fmt: (v) => `${(Math.round(v * 10) / 10).toFixed(1)} orders`, yfmt: (v) => String(Math.round(v * 10) / 10), height: 230, peakLabel: true });
    C.hbars($('#chTop'), topItems(cur, 6, 'sales'), { fmt: moneyC, unit: 'sales' });
    feed($('#feed'));
  }
  function kpi(label, icon, value, delta, vs, spark) {
    return `<section class="card c3"><div class="kpi"><div class="kpi-l">${icon}${label}</div><div class="kpi-v">${value}</div><div class="kpi-d">${delta}<span>${vs}</span>${spark}</div></div></section>`;
  }
  function topItems(list, n, by) {
    const agg = {};
    list.filter(valid).forEach((o) => o.items.forEach((l) => { const a = agg[l.item] || (agg[l.item] = { qty: 0, sales: 0 }); a.qty += l.qty; a.sales += l.qty * l.unit; }));
    return Object.entries(agg).sort((a, b) => b[1][by] - a[1][by]).slice(0, n).map(([id, a]) => ({ label: D.byId[id].name, value: a[by], sub: by === 'sales' ? `${int(a.qty)} sold` : '', extra: [{ value: by === 'sales' ? `${int(a.qty)}` : moneyC(a.sales), name: by === 'sales' ? 'sold' : 'sales' }] }));
  }
  function feed(host) {
    const list = S.db.orders.filter((o) => inB({ branch: o.branch })).slice(-7).reverse();
    if (!list.length) { host.innerHTML = `<div class="empty"><img class="empty-img" src="${D.img('group', 360, 240)}" alt=""><b>No website orders yet</b><span>Place one on the customer site, or simulate one to see the full cycle.</span><div style="display:flex;gap:8px"><a class="btn" href="../menu.html" target="_blank" rel="noopener">${I.ext} Open the site</a><button class="btn btn-p" data-sim>${I.bolt} Simulate order</button></div></div>`; host.querySelector('[data-sim]').addEventListener('click', simulate); return; }
    host.innerHTML = `<ul class="feed">${list.map((o) => { const nx = S.next(o); return `<li data-o="${o.id}" style="cursor:pointer"><span class="thumb">${pic(o.lines[0].item)}</span><div class="who"><b>${o.id} · ${esc(o.customer.name)}</b><span>${D.branchById[o.branch].name} · ${o.type === 'delivery' ? 'Delivery' : 'Pickup'} · ${ago(o.createdAt)} · ${money(o.total)}</span></div>${stPill(o.status)}
      ${nx && o.status !== 'cancelled' ? `<button class="btn btn-sm" data-adv="${o.id}">${advLabel(o)}</button>` : '<span></span>'}</li>`; }).join('')}</ul>`;
    if (host.dataset.bound) return; host.dataset.bound = '1';
    host.addEventListener('click', (e) => { const a = e.target.closest('[data-adv]'); if (a) { e.stopPropagation(); S.advance(a.dataset.adv); return; } const li = e.target.closest('[data-o]'); if (li) openOrder(li.dataset.o); });
  }
  function advLabel(o) { const n = S.next(o); return { preparing: 'Accept', ready: 'Mark ready', out: 'Send out', done: o.type === 'delivery' ? 'Delivered' : 'Picked up' }[n] || 'Advance'; }

  /* ================= orders ================= */
  const OS = { tab: 'all', q: '', type: 'all', page: 0, sort: 't', dir: -1 };
  function orders(root) {
    const w = win(), list = slice(w.from, w.to);
    const counts = { all: list.length }; ['new', 'preparing', 'ready', 'out', 'done', 'cancelled'].forEach((s) => { counts[s] = list.filter((o) => o.status === s).length; });
    let rows = list.filter((o) => (OS.tab === 'all' || o.status === OS.tab) && (OS.type === 'all' || o.type === OS.type));
    if (OS.q) { const q = OS.q.toLowerCase(); rows = rows.filter((o) => o.id.toLowerCase().includes(q) || custName(o).toLowerCase().includes(q) || (custPhone(o) || '').includes(q)); }
    const key = { t: (o) => o.t, total: (o) => o.total, prep: (o) => o.prep || 0, items: (o) => o.items.reduce((s, l) => s + l.qty, 0) }[OS.sort];
    rows.sort((a, b) => (key(a) - key(b)) * OS.dir || b.t - a.t);
    const live = rows.filter((o) => o.live && !['done', 'cancelled'].includes(o.status)); rows = live.concat(rows.filter((o) => !live.includes(o)));
    const per = 20, pages = Math.max(1, Math.ceil(rows.length / per)); OS.page = Math.min(OS.page, pages - 1);
    const page = rows.slice(OS.page * per, OS.page * per + per), m = metrics(list);
    const th = (k, t, n) => `<th class="${n ? 'n' : ''}"><button data-sort="${k}">${t}${OS.sort === k ? (OS.dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`;
    root.innerHTML = `<div class="ph"><div><h2>Orders</h2><p>${int(list.length)} orders · ${money(m.sales)} net · ${w.label}</p></div><div style="display:flex;gap:8px"><button class="btn" id="csvBtn">${I.down} Export CSV</button><button class="btn btn-p" id="simBtn">${I.bolt} Simulate order</button></div></div>
      ${filtersBar()}
      <section class="card"><div class="tabs" role="tablist">${[['all', 'All'], ['new', 'New'], ['preparing', 'Preparing'], ['ready', 'Ready'], ['out', 'Out for delivery'], ['done', 'Completed'], ['cancelled', 'Cancelled']].map(([id, t]) => `<button role="tab" data-tab="${id}" aria-selected="${OS.tab === id}">${t}<span>${int(counts[id])}</span></button>`).join('')}</div>
        <div class="tbar"><input class="inp" id="oq" placeholder="Search order #, customer or phone" value="${esc(OS.q)}" style="width:min(320px,100%)"><label class="sel"><span class="sr">Channel</span><select id="otype"><option value="all">All channels</option>${Object.entries(CH).map(([k, v]) => `<option value="${k}"${OS.type === k ? ' selected' : ''}>${v.name}</option>`).join('')}</select></label><span class="spacer"></span><span class="muted">${int(rows.length)} results</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th>${th('t', 'Placed')}<th>Customer</th><th>Store</th><th>Channel</th>${th('items', 'Items', 1)}${th('total', 'Total', 1)}<th>Status</th>${th('prep', 'Prep', 1)}</tr></thead><tbody>
        ${page.map((o) => `<tr class="click${justIn.has(o.id) ? ' fresh' : ''}" data-o="${o.id}"><td><span class="id">${o.id}</span>${o.live ? '<span class="sub">Website</span>' : ''}</td><td>${fmtWhen(o.t)}<span class="sub">${o.live ? ago(o.t) : ''}</span></td><td class="strong">${esc(custName(o))}<span class="sub">${mask(custPhone(o))}</span></td><td>${D.branchById[o.branch].name}</td><td>${chan(o.type)}</td><td class="n">${o.items.reduce((s, l) => s + l.qty, 0)}</td><td class="n strong">${money(o.total)}</td><td>${stPill(o.status)}</td><td class="n">${o.prep ? `${o.prep} min` : o.live && !['done', 'cancelled'].includes(o.status) ? timerHTML(o.raw) : '—'}</td></tr>`).join('') || `<tr><td colspan="9"><div class="empty"><b>No orders match.</b><span>Try another tab, range or search.</span></div></td></tr>`}
        </tbody></table></div><div class="pager"><span>Page ${OS.page + 1} of ${pages}</span><div style="display:flex;gap:6px"><button class="btn btn-sm" data-pg="-1"${OS.page ? '' : ' disabled'}>Previous</button><button class="btn btn-sm" data-pg="1"${OS.page < pages - 1 ? '' : ' disabled'}>Next</button></div></div></section>`;
    bindFilters(root);
    $('#simBtn').addEventListener('click', simulate);
    $('#csvBtn').addEventListener('click', () => exportCSV(rows));
    root.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { OS.tab = b.dataset.tab; OS.page = 0; render(); } });
    $('#oq').addEventListener('input', (e) => { OS.q = e.target.value; OS.page = 0; clearTimeout(OS.tq); OS.tq = setTimeout(() => { render(); const i = $('#oq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 220); });
    $('#otype').addEventListener('change', (e) => { OS.type = e.target.value; OS.page = 0; render(); });
    root.querySelector('thead').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; if (OS.sort === b.dataset.sort) OS.dir *= -1; else { OS.sort = b.dataset.sort; OS.dir = -1; } render(); });
    root.querySelector('tbody').addEventListener('click', (e) => { const tr = e.target.closest('[data-o]'); if (tr) openOrder(tr.dataset.o); });
    root.querySelector('.pager').addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (b) { OS.page += +b.dataset.pg; render(); } });
  }
  function exportCSV(rows) {
    const head = ['order', 'placed', 'customer', 'store', 'channel', 'items', 'total_egp', 'status', 'prep_min'];
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = rows.map((o) => [o.id, new Date(o.t).toISOString(), custName(o), D.branchById[o.branch].name, CH[o.type].name, o.items.reduce((s, l) => s + l.qty, 0), o.total, o.status, o.prep || ''].map(q).join(','));
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `overflow-orders-${F.range}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Export ready', `${int(rows.length)} orders saved as CSV`);
  }
  function timerHTML(o) {
    const mins = (Date.now() - o.createdAt) / 60000, tgt = S.db.settings.prepTarget;
    const cls = mins < tgt ? 'ok' : mins < tgt * 1.5 ? 'warn' : 'late', label = cls === 'ok' ? 'On time' : cls === 'warn' ? 'Running late' : 'Late';
    return `<span class="timer ${cls}" title="${label}" data-since="${o.createdAt}">${cls === 'ok' ? I.clock : I.alert}<span>${Math.floor(mins)}:${String(Math.floor((mins % 1) * 60)).padStart(2, '0')}</span><span class="sr">${label}</span></span>`;
  }

  /* ---------- order drawer ---------- */
  let openId = null;
  function openOrder(id) { openId = id; paintDrawer(); $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { openId = null; $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); }
  function paintDrawer() {
    if (!openId) return;
    const o = all().find((x) => x.id === openId); if (!o) { closeDrawer(); return; }
    const raw = o.raw, b = D.branchById[o.branch];
    const lines = o.items.map((l) => { const d = raw ? S.describe(l) : { name: D.byId[l.item].name, detail: '' }; return `<li><span class="thumb">${pic(l.item)}</span><div><b>${l.qty} × ${esc(d.name)}</b><small>${esc(d.detail || '')}</small></div><b class="num">${money(l.qty * l.unit)}</b></li>`; }).join('');
    const flow = raw ? S.flow(raw) : (o.type === 'delivery' ? ['new', 'preparing', 'ready', 'out', 'done'] : ['new', 'preparing', 'ready', 'done']);
    const tl = raw ? raw.timeline : [{ status: 'new', at: o.t }, { status: 'preparing', at: o.t + 60000 }, { status: 'ready', at: o.t + (o.prep + 1) * 60000 }, ...(o.type === 'delivery' ? [{ status: 'out', at: o.t + (o.prep + 3) * 60000 }] : []), { status: o.status, at: o.t + (o.prep + (o.type === 'delivery' ? 28 : 6)) * 60000 }];
    const at = (s) => (tl.find((x) => x.status === s) || {}).at, idx = flow.indexOf(o.status);
    const nx = raw && S.next(raw);
    const sub = raw ? { subtotal: raw.subtotal, discount: raw.discount, fee: raw.fee, service: raw.service } : null;
    $('#drawer').innerHTML = `<div class="drawer-h"><div><h3>${o.id} ${stPill(o.status)}</h3><p class="muted" style="margin:4px 0 0">${fmtWhen(o.t)} · ${b.name} · ${CH[o.type].name}${o.live ? ' · Website' : ''}</p></div><button class="icon-btn" id="dX" aria-label="Close">${I.x}</button></div>
      <div class="drawer-b"><p class="sec-t">Customer</p><dl class="kv"><dt>Name</dt><dd>${esc(custName(o))}</dd><dt>Phone</dt><dd>${esc(custPhone(o))}</dd>${raw && raw.customer.address ? `<dt>Address</dt><dd>${esc(raw.customer.address)}</dd>` : ''}${raw ? `<dt>Payment</dt><dd>${esc(raw.payment)}</dd><dt>Wanted</dt><dd>${raw.when === 'asap' ? 'ASAP' : esc(raw.when)}</dd>` : ''}</dl>
        ${raw && raw.customer.notes ? `<p class="sec-t">Note</p><p style="margin:0;padding:10px 12px;border-radius:8px;background:color-mix(in srgb,var(--warn) 16%,transparent)">${esc(raw.customer.notes)}</p>` : ''}
        <p class="sec-t">Items</p><ul class="items">${lines}</ul>
        <div class="totals">${sub ? `<p><span>Subtotal</span><span class="num">${money(sub.subtotal)}</span></p>${sub.discount ? `<p><span>Promo ${esc(raw.promo || '')}</span><span class="num">− ${money(sub.discount)}</span></p>` : ''}${sub.fee ? `<p><span>Delivery</span><span class="num">${money(sub.fee)}</span></p>` : ''}<p><span>Service</span><span class="num">${money(sub.service)}</span></p>` : ''}<p class="t"><span>Total</span><span class="num">${money(o.total)}</span></p></div>
        <p class="sec-t">Timeline</p><ol class="steps">${flow.map((s, i) => `<li class="${o.status === 'cancelled' ? (at(s) ? 'ok' : '') : i < idx || o.status === 'done' ? 'ok' : i === idx ? 'now' : ''}"><span>${D.STATUS.find((x) => x.id === s).name}</span><span class="muted num">${at(s) ? fmtTime(at(s)) : ''}</span></li>`).join('')}${o.status === 'cancelled' ? `<li class="now"><span>Cancelled</span><span class="muted num">${fmtTime((tl.find((x) => x.status === 'cancelled') || { at: o.t }).at)}</span></li>` : ''}</ol></div>
      <div class="drawer-f"><button class="btn" id="dPrint">${I.print} Print ticket</button>${raw && nx && o.status !== 'cancelled' ? `<button class="btn btn-danger" id="dCancel">Cancel order</button><button class="btn btn-p" id="dAdv">${advLabel(raw)}</button>` : ''}${raw ? `<a class="btn btn-ghost" href="../track.html?id=${encodeURIComponent(o.id)}" target="_blank" rel="noopener">${I.ext} Customer view</a>` : ''}</div>`;
    $('#dX').addEventListener('click', closeDrawer);
    $('#dPrint').addEventListener('click', () => printTicket(o));
    const adv = $('#dAdv'); if (adv) adv.addEventListener('click', () => S.advance(o.id));
    const cn = $('#dCancel'); if (cn) cn.addEventListener('click', () => confirmModal(`Cancel ${o.id}?`, `${custName(o)} will see the order as cancelled on their tracking page.`, 'Cancel order', () => { S.setStatus(o.id, 'cancelled'); toast(`${o.id} cancelled`, 'The customer page updated'); }, true));
  }
  function printTicket(o) {
    const lines = o.items.map((l) => { const d = o.raw ? S.describe(l) : { name: D.byId[l.item].name, detail: '' }; return `${l.qty} x ${d.name}${d.detail ? `\n   ${d.detail}` : ''}`; }).join('\n');
    $('#printTicket').innerHTML = `<pre style="white-space:pre-wrap;margin:0">OVERFLOW · ${D.branchById[o.branch].name}\n${o.id}  ${CH[o.type].name.toUpperCase()}\n${new Date(o.t).toLocaleString('en-US')}\n------------------------------\n${esc(lines)}\n------------------------------\nTOTAL  ${money(o.total)}\n${esc(custName(o))}\n</pre>`;
    window.print();
  }

  /* ================= kitchen display ================= */
  const KS = { branch: (store(AUTH) || {}).role === 'kitchen' ? 'newcairo' : 'all' };
  function kitchen(root) {
    const open = S.db.orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status) && (KS.branch === 'all' || o.branch === KS.branch)).sort((a, b) => a.createdAt - b.createdAt);
    const cols = [['new', 'New', 'var(--s1)'], ['preparing', 'On the griddle', 'var(--warn)'], ['ready', 'Ready for handoff', 'var(--good)']];
    const doneToday = S.db.orders.filter((o) => ['done', 'out'].includes(o.status) && Date.now() - o.createdAt < DAY).length;
    root.innerHTML = `<div class="ph"><div><h2>Kitchen display</h2><p>Oldest tickets first. Timers turn amber at ${S.db.settings.prepTarget} min and red at ${Math.round(S.db.settings.prepTarget * 1.5)} min. ${doneToday} handed off today.</p></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px"><label class="sel"><span class="sr">Store</span><select id="kb"><option value="all">All stores</option>${D.BRANCHES.map((b) => `<option value="${b.id}"${KS.branch === b.id ? ' selected' : ''}>${b.name}</option>`).join('')}</select></label>
      <button class="btn" id="simBtn">${I.bolt} Simulate order</button><button class="btn" id="fsBtn">Full screen</button></div></div>
      ${open.length ? '' : `<section class="card" style="margin-bottom:14px"><div class="empty"><img class="empty-img" src="${D.img('grill', 360, 240)}" alt=""><b>All clear. No open tickets.</b><span>New website orders appear here instantly, with a chime.</span><div style="display:flex;gap:8px"><a class="btn" href="../menu.html" target="_blank" rel="noopener">${I.ext} Order on the site</a><button class="btn btn-p" data-sim>${I.bolt} Simulate order</button></div></div></section>`}
      <div class="kds">${cols.map(([s, t, c]) => { const list = open.filter((o) => o.status === s); return `<section class="kcol"><div class="kcol-h"><h3><i style="background:${c}"></i>${t}</h3><span class="muted num">${list.length}</span></div><div class="kcol-b">${list.map(ticket).join('') || '<p class="muted" style="text-align:center;padding:20px 0;margin:0">Nothing here</p>'}</div></section>`; }).join('')}</div>`;
    $('#kb').addEventListener('change', (e) => { KS.branch = e.target.value; render(); });
    $('#simBtn').addEventListener('click', simulate);
    const ds = root.querySelector('[data-sim]'); if (ds) ds.addEventListener('click', simulate);
    $('#fsBtn').addEventListener('click', () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); });
    root.querySelector('.kds').addEventListener('click', (e) => {
      const b = e.target.closest('[data-adv]'); if (b) { const t = b.closest('.ticket'); t.style.transition = 'transform .25s, opacity .25s'; t.style.transform = 'translateX(30px)'; t.style.opacity = '0'; setTimeout(() => S.advance(b.dataset.adv), 200); return; }
      const d = e.target.closest('[data-open]'); if (d) openOrder(d.dataset.open);
    });
  }
  function ticket(o) {
    const n = S.next(o), label = { preparing: 'Start', ready: 'Ready', out: 'Send out', done: 'Handed off' }[n];
    return `<article class="ticket${justIn.has(o.id) ? ' fresh' : ''}"><div class="ticket-h"><span class="id">${o.id}</span>${timerHTML(o)}</div>
      <div class="ticket-m"><span>${chan(o.type)}</span><span>${esc(o.customer.name)}</span><span>${D.branchById[o.branch].name}</span>${o.when !== 'asap' ? `<span>for ${esc(o.when)}</span>` : ''}</div>
      <ul>${o.lines.map((l) => { const d = S.describe(l); return `<li><b>${l.qty}×</b><div><span>${esc(d.name)}</span><small>${esc(d.detail || '')}${l.note ? ` · “${esc(l.note)}”` : ''}</small></div></li>`; }).join('')}</ul>
      ${o.customer.notes ? `<p class="memo">${esc(o.customer.notes)}</p>` : ''}
      <div class="ticket-f"><button class="btn btn-sm" data-open="${o.id}">Details</button><button class="btn btn-sm btn-p" data-adv="${o.id}">${label}</button></div></article>`;
  }

  /* ================= menu ================= */
  const MS = { cat: 'all', q: '' };
  function menu(root) {
    const w = win(), list = slice(w.from, w.to).filter(valid), sold = {};
    list.forEach((o) => o.items.forEach((l) => { const s = sold[l.item] || (sold[l.item] = { qty: 0, sales: 0 }); s.qty += l.qty; s.sales += l.qty * l.unit; }));
    let items = D.ITEMS.filter((i) => (MS.cat === 'all' || i.cat === MS.cat) && (!MS.q || i.name.toLowerCase().includes(MS.q.toLowerCase())));
    const off = D.ITEMS.filter((i) => !S.available(i.id)).length, edited = D.ITEMS.filter((i) => S.price(i.id) !== i.price).length;
    root.innerHTML = `<div class="ph"><div><h2>Menu &amp; pricing</h2><p>Edits go live on the website instantly. ${off ? `<b>${off}</b> item${off > 1 ? 's' : ''} sold out` : 'Everything is available'}${edited ? ` · ${edited} price change${edited > 1 ? 's' : ''}` : ''}.</p></div><a class="btn" href="../menu.html" target="_blank" rel="noopener">${I.ext} View live menu</a></div>
      ${filtersBar('', { noBranch: false })}
      <section class="card"><div class="tbar"><div style="display:flex;flex-wrap:wrap;gap:6px">${[['all', 'All']].concat(D.CATS.map((c) => [c.id, c.name])).map(([id, t]) => `<button class="chip-f" data-cat="${id}" aria-pressed="${MS.cat === id}">${t}</button>`).join('')}</div><span class="spacer"></span><input class="inp" id="mq" placeholder="Search items" value="${esc(MS.q)}"></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Item</th><th>Category</th><th class="n">List price</th><th class="n">Live price (EGP)</th><th class="n">Sold · ${w.label}</th><th class="n">Sales</th><th>Available</th></tr></thead><tbody>
      ${items.map((i) => { const s = sold[i.id] || { qty: 0, sales: 0 }, on = S.available(i.id), p = S.price(i.id); return `<tr data-id="${i.id}"><td><span class="thumb">${pic(i.id)}</span></td><td class="strong">${i.name}${i.tag ? `<span class="sub">${i.tag}</span>` : ''}</td><td>${D.CATS.find((c) => c.id === i.cat).name}</td><td class="n muted">${i.price}</td>
        <td class="n"><input class="price-in" type="number" min="0" step="5" value="${p}" aria-label="Price for ${i.name}">${p !== i.price ? `<span class="sub">${p > i.price ? '+' : ''}${p - i.price} vs list · <button class="btn btn-sm btn-ghost" data-reset style="height:20px;padding:0 4px">reset</button></span>` : ''}</td>
        <td class="n">${int(s.qty)}</td><td class="n">${moneyC(s.sales)}</td><td><label class="switch"><input type="checkbox" data-avail ${on ? 'checked' : ''} aria-label="${i.name} available"><span></span></label> <span class="muted" style="margin-left:6px">${on ? 'On' : 'Sold out'}</span></td></tr>`; }).join('')}
      </tbody></table></div></section>`;
    bindFilters(root);
    root.querySelector('.tbar').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { MS.cat = b.dataset.cat; render(); } });
    $('#mq').addEventListener('input', (e) => { MS.q = e.target.value; clearTimeout(MS.t); MS.t = setTimeout(() => { render(); const i = $('#mq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); });
    root.querySelector('tbody').addEventListener('change', (e) => {
      const id = e.target.closest('tr').dataset.id, it = D.byId[id];
      if (e.target.matches('[data-avail]')) { S.setMenu(id, { off: !e.target.checked }); toast(e.target.checked ? `${it.name} is back on` : `${it.name} marked sold out`, 'The website menu updated'); }
      if (e.target.matches('.price-in')) { const v = Math.max(0, Math.round(+e.target.value || 0)); S.setMenu(id, { price: v === it.price ? null : v }); toast(`${it.name}: ${money(v)}`, 'New price is live on the website'); }
    });
    root.querySelector('tbody').addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) { const id = e.target.closest('tr').dataset.id; S.setMenu(id, { price: null }); } });
  }

  /* ================= analytics ================= */
  function analytics(root) {
    const w = win(), cur = slice(w.from, w.to).filter(valid), m = metrics(cur);
    root.innerHTML = `<div class="ph"><div><h2>Analytics</h2><p>${int(m.orders)} orders · ${money(m.sales)} · ${w.label}</p></div></div>${filtersBar()}
      <div class="g">
        <section class="card c8"><div class="card-h"><div><h3>When orders come in</h3><p>Orders by weekday and hour, ${w.label}</p></div><div class="legend" aria-hidden="true" style="align-items:center;gap:4px">Fewer ${['--seq-1', '--seq-3', '--seq-5', '--seq-7'].map((v) => `<i style="width:16px;height:10px;border-radius:2px;background:var(${v})"></i>`).join('')} More</div></div><div class="card-b"><div class="chart" id="chHeat"></div></div></section>
        <section class="card c4"><div class="card-h"><div><h3>Sales by store</h3><p>Net sales, ${w.label}</p></div></div><div class="card-b"><div id="chStores"></div></div></section>
        <section class="card c8"><div class="card-h"><div><h3>Orders by channel</h3><p>Per ${w.days && w.days > 14 ? 'week' : w.unit}, ${w.label}</p></div>${legend(Object.values(CH).map((c) => ({ name: c.name, color: c.color })))}</div><div class="card-b"><div class="chart" id="chChanT"></div></div></section>
        <section class="card c4"><div class="card-h"><div><h3>Prep time</h3><p>Orders by minutes on the griddle</p></div></div><div class="card-b"><div class="chart" id="chPrep"></div></div></section>
        <section class="card c6"><div class="card-h"><div><h3>Best sellers</h3><p>Units sold, ${w.label}</p></div></div><div class="card-b"><div id="chItems"></div></div></section>
        <section class="card c6"><div class="card-h"><div><h3>Most-picked toppings</h3><p>Times added, last 60 days (all stores)</p></div></div><div class="card-b"><div id="chTops"></div></div></section>
        <section class="card c12"><div class="card-h"><div><h3>Average order value</h3><p>EGP per order, by day</p></div></div><div class="card-b"><div class="chart" id="chAov"></div></div></section>
      </div>`;
    bindFilters(root);
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], HRS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
    const grid = DAYS.map(() => HRS.map(() => 0));
    cur.forEach((o) => { const d = new Date(o.t), hi = HRS.indexOf(d.getHours()); if (hi >= 0) grid[d.getDay()][hi]++; });
    const ramp = ['--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5', '--seq-6', '--seq-7'].map((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim());
    C.heat($('#chHeat'), { rows: DAYS, cols: HRS.map(hourLabel), values: grid, fmt: (v) => `${int(v)} orders`, ramp });
    C.hbars($('#chStores'), D.BRANCHES.map((b) => ({ label: b.name, value: metrics(cur.filter((o) => o.branch === b.id)).sales })).sort((a, b) => b.value - a.value), { fmt: moneyC, unit: 'net sales' });
    // channel columns: weekly for long ranges
    const wk = w.days && w.days > 14, size = wk ? 7 * DAY : w.unit === 'hour' ? HOUR : DAY;
    const starts = []; for (let t = w.from; t < w.to; t += size) starts.push(t);
    const stack = ['pickup', 'delivery', 'dinein'].map((t) => ({ name: CH[t].name, color: CH[t].color, values: series(cur.filter((o) => o.type === t), starts, size, () => 1) }));
    C.columns($('#chChanT'), { labels: starts, stack, xfmt: (t) => (w.unit === 'hour' ? hourLabel(new Date(t).getHours()) : fmtDay(t)), tipTitle: (i) => (wk ? `Week of ${fmtDay(starts[i])}` : w.unit === 'hour' ? hourLabel(new Date(starts[i]).getHours()) : fmtDay(starts[i])), fmt: (v) => `${int(v)}`, height: 240 });
    const pb = ['≤5', '6–7', '8–9', '10–11', '12–13', '14+'], pv = pb.map(() => 0);
    cur.forEach((o) => { if (!o.prep) return; const p = o.prep; pv[p <= 5 ? 0 : p <= 7 ? 1 : p <= 9 ? 2 : p <= 11 ? 3 : p <= 13 ? 4 : 5]++; });
    C.columns($('#chPrep'), { labels: pb, values: pv, color: 'var(--s1)', fmt: (v) => `${int(v)} orders`, xfmt: (l) => `${l}m`, tipTitle: (i) => `${pb[i]} minutes`, height: 240 });
    C.hbars($('#chItems'), topItems(cur, 8, 'qty'), { fmt: int, unit: 'sold' });
    const tc = { ...SEED.toppingCount }; S.db.orders.forEach((o) => o.lines.forEach((l) => (l.opts.toppings || []).forEach((t) => { tc[t] = (tc[t] || 0) + l.qty; })));
    C.hbars($('#chTops'), Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, v]) => ({ label: D.topById[id].name, value: v })), { fmt: int, unit: 'times' });
    const dw = win(w.unit === 'hour' ? '7d' : F.range), ds = buckets({ ...dw, unit: 'day' }), dl = slice(dw.from, dw.to).filter(valid);
    const sales = series(dl, ds, DAY, (o) => o.total), cnt = series(dl, ds, DAY, () => 1);
    C.line($('#chAov'), { x: ds, series: [{ name: 'Average order', values: sales.map((s, i) => (cnt[i] ? s / cnt[i] : 0)), color: 'var(--s1)', area: true }], fmt: money, xfmt: fmtDay, tipTitle: (i) => fmtDay(ds[i]), height: 220, label: 'Average order value' });
  }

  /* ================= customers ================= */
  const CS = { q: '' };
  function customers(root) {
    const w = win(), cur = slice(w.from, w.to).filter(valid), before = all().filter((o) => o.t < w.from && inB(o) && valid(o));
    const seenBefore = new Set(before.map((o) => o.cust)), agg = new Map();
    cur.forEach((o) => { const a = agg.get(o.cust) || { key: o.cust, name: custName(o), phone: custPhone(o), n: 0, spent: 0, last: 0, items: {}, live: o.live }; a.n++; a.spent += o.total; a.last = Math.max(a.last, o.t); o.items.forEach((l) => { a.items[l.item] = (a.items[l.item] || 0) + l.qty; }); agg.set(o.cust, a); });
    let rows = [...agg.values()].sort((a, b) => b.spent - a.spent);
    const returning = rows.filter((r) => seenBefore.has(r.key) || r.n > 1).length, total = rows.length;
    if (CS.q) { const q = CS.q.toLowerCase(); rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.phone || '').includes(q)); }
    const top = rows.slice(0, 40), seg = (r) => (r.n >= 6 ? ['vip', 'VIP'] : r.n >= 2 ? ['reg', 'Regular'] : ['', seenBefore.has(r.key) ? 'Returning' : 'New']);
    root.innerHTML = `<div class="ph"><div><h2>Customers</h2><p>${int(total)} people ordered · ${w.label}</p></div></div>${filtersBar()}
      <div class="g" style="margin-bottom:16px">
        ${kpi('Customers', I.customers, int(total), '', w.label, '')}
        ${kpi('Returning', I.check, `${total ? Math.round((returning / total) * 100) : 0}%`, '', 'ordered before or more than once', '')}
        ${kpi('Orders per customer', I.orders, total ? (cur.length / total).toFixed(2) : '0', '', w.label, '')}
        ${kpi('Spend per customer', I.money, money(total ? cur.reduce((s, o) => s + o.total, 0) / total : 0), '', w.label, '')}
      </div>
      <section class="card"><div class="tbar"><input class="inp" id="cq" placeholder="Search name or phone" value="${esc(CS.q)}" style="width:min(320px,100%)"><span class="spacer"></span><span class="muted">Top ${top.length} by spend</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Customer</th><th>Segment</th><th class="n">Orders</th><th class="n">Spent</th><th class="n">Avg. order</th><th>Usual order</th><th>Last order</th></tr></thead><tbody>
      ${top.map((r) => { const fav = Object.entries(r.items).sort((a, b) => b[1] - a[1])[0], [cls, lab] = seg(r); return `<tr><td class="strong">${esc(r.name)}<span class="sub">${mask(r.phone)}${r.live ? ' · website' : ''}</span></td><td><span class="seg-tag ${cls}">${lab}</span></td><td class="n">${r.n}</td><td class="n strong">${money(r.spent)}</td><td class="n">${money(r.spent / r.n)}</td><td>${fav ? D.byId[fav[0]].name : ''}</td><td>${fmtWhen(r.last)}</td></tr>`; }).join('') || '<tr><td colspan="7"><div class="empty"><b>No customers match.</b></div></td></tr>'}
      </tbody></table></div></section>`;
    bindFilters(root);
    $('#cq').addEventListener('input', (e) => { CS.q = e.target.value; clearTimeout(CS.t); CS.t = setTimeout(() => { render(); const i = $('#cq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 220); });
  }

  /* ================= stores ================= */
  function stores(root) {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0); const today = t0.getTime();
    root.innerHTML = `<div class="ph"><div><h2>Stores</h2><p>Today’s numbers per kitchen. Pausing a store hides it from online ordering straight away.</p></div></div>
      <div class="g">${D.BRANCHES.map((b) => {
        const l = slice(today, Date.now(), b.id), m = metrics(l), open = S.db.orders.filter((o) => o.branch === b.id && !['done', 'cancelled'].includes(o.status)).length;
        const days = []; for (let i = 6; i >= 0; i--) days.push(metrics(slice(today - i * DAY, today - i * DAY + DAY, b.id)).sales);
        const paused = S.db.settings.paused[b.id], o = isOpen(b);
        return `<section class="card c6"><div class="bcard-h"><div><h3>${b.name}</h3><p class="muted" style="margin:2px 0 0">${b.area} · ${b.phone}</p></div><span class="st ${paused ? 'preparing' : o ? 'ready' : 'done'}">${paused ? 'Paused online' : o ? 'Open' : 'Closed'}</span></div>
          <div class="bstats"><div><b>${moneyC(m.sales)}</b><span>Sales today</span></div><div><b>${int(m.orders)}</b><span>Orders today</span></div><div><b>${m.prep ? m.prep.toFixed(1) : '—'}m</b><span>Avg. prep</span></div><div><b>${open}</b><span>Open tickets</span></div></div>
          <div class="bcard-f"><div style="display:flex;align-items:center;gap:10px">${C.spark(days)}<span class="muted" style="font-size:12.5px">Sales, last 7 days</span></div><label style="display:flex;align-items:center;gap:10px"><span>Online orders</span><span class="switch"><input type="checkbox" data-pause="${b.id}" ${paused ? '' : 'checked'} aria-label="Accept online orders at ${b.name}"><span></span></span></label></div></section>`;
      }).join('')}</div>`;
    root.querySelector('.g').addEventListener('change', (e) => {
      const id = e.target.dataset.pause; if (!id) return;
      const p = { ...S.db.settings.paused, [id]: !e.target.checked }; S.setSetting('paused', p);
      toast(`${D.branchById[id].name} ${e.target.checked ? 'is taking online orders' : 'is paused online'}`, 'The website updated');
    });
  }

  /* ================= settings ================= */
  function settings(root) {
    const s = S.db.settings, th = document.documentElement.dataset.theme || 'system';
    root.innerHTML = `<div class="ph"><div><h2>Settings</h2><p>Shared by the website and this dashboard (stored in this browser).</p></div></div>
      <div class="g"><section class="card c7"><div class="card-h"><h3>Order flow</h3></div><div class="card-b flush">
        <div class="set"><b>Auto-accept website orders</b><label class="switch"><input type="checkbox" data-set="autoAccept" ${s.autoAccept ? 'checked' : ''}><span></span></label><p>New orders skip “New” and go straight onto the griddle.</p></div>
        <div class="set"><b>Demo autopilot</b><label class="switch"><input type="checkbox" data-set="autopilot" ${s.autopilot ? 'checked' : ''}><span></span></label><p>Orders move through the kitchen on their own (about a minute per step), so you can watch the customer page update.</p></div>
        <div class="set"><b>New-order chime</b><label class="switch"><input type="checkbox" data-set="sound" ${s.sound !== false ? 'checked' : ''}><span></span></label><p>Plays a short two-note sound when a website order arrives.</p></div>
        <div class="set"><b>Prep time target</b><input class="inp num-in" type="number" min="3" max="40" data-num="prepTarget" value="${s.prepTarget}"><p>Minutes. Drives kitchen timers and the time customers see.</p></div>
        <div class="set"><b>Delivery time</b><input class="inp num-in" type="number" min="5" max="90" data-num="deliveryMins" value="${s.deliveryMins}"><p>Minutes added on top of prep for delivery orders.</p></div>
        <div class="set"><b>Delivery fee</b><input class="inp num-in" type="number" min="0" max="200" data-num="deliveryFee" value="${s.deliveryFee}"><p>EGP, charged on delivery orders at checkout.</p></div></div></section>
      <section class="card c5"><div class="card-h"><h3>Appearance</h3></div><div class="card-b"><div class="seg" role="group" aria-label="Theme">${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([id, t]) => `<button data-theme-set="${id}" aria-pressed="${th === id}">${t}</button>`).join('')}</div></div>
        <div class="card-h" style="border-top:1px solid var(--border);padding-top:14px"><h3>Demo data</h3></div><div class="card-b"><p class="muted" style="margin-top:0">Clears website orders, menu edits and settings in this browser. The 60-day history stays.</p><button class="btn btn-danger" id="resetBtn">Reset demo data</button></div></section></div>`;
    root.addEventListener('change', (e) => {
      const k = e.target.dataset.set, n = e.target.dataset.num;
      if (k) { S.setSetting(k, e.target.checked); toast('Saved', `${e.target.closest('.set').querySelector('b').textContent} ${e.target.checked ? 'on' : 'off'}`); }
      if (n) { const v = Math.max(+e.target.min, Math.min(+e.target.max, Math.round(+e.target.value || 0))); S.setSetting(n, v); toast('Saved', `${e.target.closest('.set').querySelector('b').textContent}: ${v}`); }
    });
    root.addEventListener('click', (e) => { const t = e.target.closest('[data-theme-set]'); if (t) setTheme(t.dataset.themeSet); });
    $('#resetBtn').addEventListener('click', () => confirmModal('Reset demo data?', 'All website orders, menu edits and settings in this browser will be cleared.', 'Reset', () => { S.reset(); seen = new Set(); unread = []; store('of-ops-seen', []); toast('Demo data reset', 'Fresh start'); }, true));
  }

  /* ================= boot ================= */
  if (!store(AUTH)) { login(); return; }
  shell(); cmdEvents();
  seen = new Set([...seen, ...S.db.orders.filter((o) => Date.now() - o.createdAt > 5 * 60000).map((o) => o.id)]);
  watchNew(); render();
  addEventListener('hashchange', () => { closeDrawer(); render(); });
  let pending;
  S.subscribe(() => { watchNew(); clearTimeout(pending); pending = setTimeout(() => { const a = document.activeElement; const typing = a && a.matches('input[type="number"], .inp, .price-in'); if (!typing) render(); paintDrawer(); }, 60); });
  setInterval(() => { $$('.timer[data-since]').forEach((t) => { const o = S.db.orders.find((x) => x.createdAt === +t.dataset.since); if (o) t.outerHTML = timerHTML(o); }); }, 1000);
  setInterval(() => { if (route() === 'overview') { const f = $('#feed'); if (f && !f.querySelector(':hover')) feed(f); } }, 30000);
})();
