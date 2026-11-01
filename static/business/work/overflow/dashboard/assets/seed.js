/* OVERFLOW Ops — deterministic order history (last 60 days, four stores) so the dashboard has something real-looking
   to analyse. Live orders placed on the site are merged on top of this by dash.js. Nothing here is stored. */
window.OF_SEED = (() => {
  const D = window.OF_DATA, DAYS = 60;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const r = rng(20261029);
  const pick = (arr, w) => { let x = r() * w.reduce((s, v) => s + v, 0); for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const FIRST = ['Mariam', 'Omar', 'Youssef', 'Nour', 'Ahmed', 'Salma', 'Karim', 'Laila', 'Mostafa', 'Hana', 'Ali', 'Farida', 'Hassan', 'Malak', 'Tarek', 'Jana', 'Ziad', 'Rana', 'Khaled', 'Dina', 'Amr', 'Habiba', 'Mahmoud', 'Yasmin', 'Seif', 'Nada', 'Adham', 'Lina', 'Hazem', 'Reem'];
  const LAST = ['Hassan', 'Mostafa', 'Ibrahim', 'Farouk', 'Saleh', 'El-Sayed', 'Kamal', 'Fathy', 'Nabil', 'Adel', 'Samir', 'Ezzat', 'Gamal', 'Lotfy', 'Hamdy', 'Shawky', 'Rashad', 'Zaki'];
  const CUSTOMERS = Array.from({ length: 1400 }, (_, i) => ({
    id: i, name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
    phone: `0100000${String(Math.floor(1000 + r() * 8999))}`,   // sample numbers, never a real customer's
    loyal: r() < 0.18, home: pick(D.BRANCHES.map((b) => b.id), [3, 4, 3, 2]),
  }));
  const BASE = { zamalek: 52, newcairo: 84, zayed: 66, maadi: 38 };
  const DOW = [0.92, 0.86, 0.88, 0.95, 1.22, 1.32, 1.08]; // Sun..Sat
  // order times through the day (12:00 → 03:00 next day), lunch and dinner peaks
  const HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];
  const HW = [5, 8, 9, 6, 4, 4, 6, 9, 12, 12, 9, 6, 4, 2, 1];
  const ITEM_W = { overflow: 9, cheese: 14, 'bacon-cheese': 9, little: 4, 'little-cheese': 5, 'little-bacon': 3, hotdog: 3, 'cheese-dog': 2, 'bacon-dog': 2, 'grilled-cheese': 2, veggie: 1.5, chicken: 4, fries: 16, cajun: 7, shake: 7, soda: 10, lemonade: 4, water: 3 };
  const IDS = Object.keys(ITEM_W), IW = IDS.map((k) => ITEM_W[k]);
  const TOP_W = { mayo: 7, lettuce: 9, pickles: 8, tomato: 8, 'grilled-onion': 7, mushroom: 6, ketchup: 8, mustard: 5, relish: 2, onion: 3, jalapeno: 4, pepper: 2, steak: 2, bbq: 3, hot: 3 };

  const orders = [], toppingCount = {};
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (DAYS - 1));
  const now = Date.now();
  let seq = 10000;
  for (let d = 0; d < DAYS; d++) {
    const day = new Date(start); day.setDate(start.getDate() + d);
    const trend = 0.82 + 0.36 * (d / DAYS), dow = DOW[day.getDay()];
    D.BRANCHES.forEach((b) => {
      const n = Math.round(BASE[b.id] * trend * dow * (0.9 + r() * 0.2));
      for (let k = 0; k < n; k++) {
        const h = pick(HOURS, HW), t = day.getTime() + (h * 60 + Math.floor(r() * 60)) * 60000;
        if (t > now) continue;
        const nLines = pick([1, 2, 3, 4, 5], [3, 5, 4, 2, 1]), items = [];
        for (let j = 0; j < nLines; j++) {
          const id = pick(IDS, IW), it = D.byId[id], qty = r() < 0.18 ? 2 : 1;
          let unit = it.price; if (it.builder === 'fries') unit += pick([-35, 0, 40], [3, 5, 2]);
          if (it.art === 'burger' && r() < 0.15) unit += 25;
          items.push({ item: id, qty, unit });
          if (it.builder === 'burger') Object.keys(TOP_W).forEach((tp) => { if (r() < TOP_W[tp] / 11) toppingCount[tp] = (toppingCount[tp] || 0) + qty; });
        }
        const type = !b.delivery ? pick(['pickup', 'dinein'], [6, 4]) : pick(['pickup', 'delivery', 'dinein'], [4.2, 4.3, 1.5]);
        const sub = items.reduce((s, l) => s + l.unit * l.qty, 0), fee = type === 'delivery' ? D.ORDER.deliveryFee : 0;
        const busy = HW[HOURS.indexOf(h)] / 12, prep = Math.max(4, Math.round(6 + busy * 5 + (r() - 0.4) * 6 + (b.id === 'newcairo' ? 1 : 0)));
        const loyalPool = r() < 0.55, c = loyalPool ? CUSTOMERS[Math.floor(r() * 250)] : CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
        orders.push({ id: `OF-${seq++}`, t, branch: b.id, type, items, total: Math.round(sub * (1 + D.ORDER.serviceRate)) + fee, prep, cust: c.id, status: r() < 0.018 ? 'cancelled' : 'done' });
      }
    });
  }
  orders.sort((a, b2) => a.t - b2.t);
  return { orders, customers: CUSTOMERS, toppingCount, start: start.getTime(), DAYS };
})();
