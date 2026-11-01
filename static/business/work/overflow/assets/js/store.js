/* OVERFLOW — a tiny shared "backend" in localStorage. The site writes orders, the dashboard moves them through the
   kitchen, both pages hear each other live (storage event + BroadcastChannel + a light poll for file:// pages). */
window.OF_STORE = (() => {
  const D = window.OF_DATA, KEY = 'overflow-db-v1';
  const blank = () => ({
    seq: 1041, orders: [], menu: {},
    settings: { autoAccept: false, autopilot: false, prepTarget: 10, deliveryMins: 25, deliveryFee: D.ORDER.deliveryFee, paused: {} },
  });
  let raw = null, db = load();
  function load() {
    try { raw = localStorage.getItem(KEY); const v = JSON.parse(raw || '{}'); const b = blank(); return { ...b, ...v, settings: { ...b.settings, ...(v.settings || {}) } }; }
    catch { return blank(); }
  }
  const subs = new Set();
  const emit = () => subs.forEach((f) => { try { f(db); } catch (e) { console.error(e); } });
  const ch = 'BroadcastChannel' in window ? new BroadcastChannel('overflow') : null;
  function save() {
    try { raw = JSON.stringify(db); localStorage.setItem(KEY, raw); } catch { /* storage blocked: keep working in memory */ }
    if (ch) ch.postMessage('sync');
    emit();
  }
  const reload = () => { const before = raw; db = load(); if (raw !== before) emit(); };
  if (ch) ch.onmessage = reload;
  addEventListener('storage', (e) => { if (e.key === KEY) reload(); });
  setInterval(reload, 2500);

  // ---- catalogue with dashboard overrides (price edits, "86" an item)
  const price = (id) => (db.menu[id] && db.menu[id].price != null ? db.menu[id].price : D.byId[id].price);
  const available = (id) => !(db.menu[id] && db.menu[id].off);
  function setMenu(id, patch) { db.menu[id] = { ...(db.menu[id] || {}), ...patch }; save(); }

  // ---- pricing a bag line: { item, qty, opts: { toppings, extras, size, mixins, style }, note }
  function unitPrice(line) {
    const it = D.byId[line.item], o = line.opts || {};
    let p = price(it.id);
    (o.extras || []).forEach((x) => { const e = D.EXTRAS.find((e2) => e2.id === x); if (e) p += e.price; });
    if (it.builder === 'fries') p += (D.FRY_SIZES.find((s) => s.id === o.size) || { add: 0 }).add;
    if (it.builder === 'drink') p += (D.DRINK_SIZES.find((s) => s.id === o.size) || { add: 0 }).add;
    return p;
  }
  function describe(line) {
    const it = D.byId[line.item], o = line.opts || {}, bits = [];
    if (o.size) bits.push((D.FRY_SIZES.concat(D.DRINK_SIZES).find((s) => s.id === o.size) || {}).name);
    if (o.style) bits.push(D.label(o.style));
    (o.extras || []).forEach((x) => bits.push((D.EXTRAS.find((e) => e.id === x) || {}).name));
    if (o.toppings) {
      const all = D.ALL_THE_WAY.every((t) => o.toppings.includes(t));
      if (!o.toppings.length) bits.push(D.UI.plain);
      else if (all) { bits.push(D.UI.atw); o.toppings.filter((t) => !D.ALL_THE_WAY.includes(t)).forEach((t) => bits.push('+ ' + D.topById[t].name)); }
      else o.toppings.forEach((t) => bits.push(D.topById[t].name));
    }
    if (o.mixins && o.mixins.length) bits.push(o.mixins.map(D.label).join(D.UI.sep));
    return { name: it.name, detail: bits.filter(Boolean).join(' · ') };
  }
  function totals(lines, type, promo) {
    const subtotal = lines.reduce((s, l) => s + unitPrice(l) * l.qty, 0);
    const discount = promo && promo.toUpperCase() === D.ORDER.promo.code ? Math.round(subtotal * D.ORDER.promo.off) : 0;
    const fee = type === 'delivery' ? db.settings.deliveryFee : 0;
    const service = Math.round((subtotal - discount) * D.ORDER.serviceRate);
    return { subtotal, discount, fee, service, total: subtotal - discount + fee + service };
  }

  // ---- orders
  function placeOrder({ lines, type, branch, customer, payment, promo, when }) {
    db = load();
    const id = `OF-${++db.seq}`, now = Date.now(), t = totals(lines, type, promo);
    const order = {
      id, createdAt: now, source: 'web', type, branch, customer, payment, when: when || 'asap', promo: t.discount ? promo.toUpperCase() : null,
      lines: lines.map((l) => ({ ...l, unit: unitPrice(l) })), ...t,
      status: db.settings.autoAccept ? 'preparing' : 'new', timeline: [{ status: 'new', at: now }],
      eta: db.settings.prepTarget + (type === 'delivery' ? db.settings.deliveryMins : 0),
    };
    if (db.settings.autoAccept) order.timeline.push({ status: 'preparing', at: now });
    db.orders.push(order); save(); return order;
  }
  const get = (id) => db.orders.find((o) => o.id === id);
  const flow = (o) => (o.type === 'delivery' ? ['new', 'preparing', 'ready', 'out', 'done'] : ['new', 'preparing', 'ready', 'done']);
  function next(o) { const f = flow(o), i = f.indexOf(o.status); return i >= 0 && i < f.length - 1 ? f[i + 1] : null; }
  function setStatus(id, status) {
    db = load(); const o = get(id); if (!o || o.status === status) return;
    o.status = status; o.timeline.push({ status, at: Date.now() }); save();
  }
  function advance(id) { const o = get(id); const n = o && next(o); if (n) setStatus(id, n); }

  // demo autopilot: when switched on in the dashboard, orders walk themselves through the kitchen
  const STEP = { new: 15, preparing: 45, ready: 20, out: 40 };
  function autopilot() {
    if (!db.settings.autopilot) return;
    const now = Date.now(); let moved = false;
    db.orders.forEach((o) => {
      const n = next(o); if (!n || o.status === 'cancelled') return;
      const last = o.timeline[o.timeline.length - 1].at;
      if ((now - last) / 1000 >= STEP[o.status]) { o.status = n; o.timeline.push({ status: n, at: now }); moved = true; }
    });
    if (moved) save();
  }
  setInterval(autopilot, 3000);

  function setSetting(k, v) { db.settings[k] = v; save(); }
  function reset() { db = blank(); save(); }

  return {
    get db() { return db; }, subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
    price, available, setMenu, unitPrice, describe, totals, placeOrder, get, next, flow, setStatus, advance, setSetting, reset,
  };
})();
