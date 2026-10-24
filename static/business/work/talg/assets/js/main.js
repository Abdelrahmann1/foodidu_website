/* TALG — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.TALG_ART, D = window.TALG_DATA, UI = D.UI;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => (D.AR ? `${n} ${UI.cur}` : `${UI.cur} ${n}`);
  const barSvg = (b, extra = {}) => { const a = A.bar({ ...b, seed: b.key.length * 31 + (extra.seed || 0), ...extra }); return A.svg(a.vb, a.body); };
  const byKey = Object.fromEntries(D.BARS.map((b) => [b.key, b]));
  const CARD_BG = ['#BFE6FF', '#FFE3A3', '#C9F0DA', '#FFD0C4'];

  /* ---------- static art ---------- */
  $$('[data-cube]').forEach((el) => { const c = A.cube({ col: el.dataset.cube, rot: +el.dataset.rot || 12 }); el.innerHTML = A.svg(c.vb, c.body); });
  const names = D.BARS.map((b) => `<span>${D.t(b.name)}<i></i></span>`).join('');
  $('#marquee').innerHTML = names + names;

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- page load ---------- */
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1400))]).then(() => setTimeout(() => document.body.classList.remove('is-loading'), 40));

  /* ---------- menu ---------- */
  const hdr = $('#hdr'), menuBtn = $('#menuBtn'), menu = $('#menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('lock', open || document.body.classList.contains('cart-open'));
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    $('.menu-label', menuBtn).textContent = open ? UI.close : UI.menu;
  }
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- cart ---------- */
  const KEY = 'talg-bag';
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { bag = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch { /* storage may be blocked */ } };
  const cartEl = $('#cart'), cartBtn = $('#cartBtn');
  function itemName(it) { return it.key === 'box' ? UI.box : D.t(byKey[it.key].name); }
  function renderCart() {
    const count = bag.reduce((s, it) => s + it.qty, 0), total = bag.reduce((s, it) => s + it.qty * it.price, 0);
    $('#cartCount').textContent = count;
    $('#totalLabel').textContent = UI.total; $('#cartTotal').textContent = money(total);
    $('#checkout').textContent = UI.checkout; $('#checkout').disabled = !count;
    $('#cartList').innerHTML = count ? bag.map((it, i) => {
      const art = it.key === 'box' ? barSvg(byKey[it.box[0]]) : barSvg(byKey[it.key]);
      return `<li class="ci"><div class="ci-art">${art}</div><div><p class="ci-name">${itemName(it)}</p><p class="ci-price">${money(it.price)}</p></div>
        <div class="qty"><button type="button" data-i="${i}" data-d="-1" aria-label="-">−</button><span>${it.qty}</span><button type="button" data-i="${i}" data-d="1" aria-label="+">+</button></div></li>`;
    }).join('') : `<li class="cart-empty">${UI.empty}</li>`;
    save();
  }
  function setCart(open) {
    document.body.classList.toggle('cart-open', open);
    document.body.classList.toggle('lock', open || document.body.classList.contains('menu-open'));
    cartEl.setAttribute('aria-hidden', String(!open));
    if (open) $('#cartX').focus();
    else { $('#cartNote').classList.remove('show'); $('#cartNote').textContent = ''; }
  }
  cartBtn.addEventListener('click', () => setCart(true));
  $('#cartX').addEventListener('click', () => setCart(false));
  $('#scrim').addEventListener('click', () => setCart(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { setCart(false); setMenu(false); } });
  $('#cartList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const it = bag[+b.dataset.i]; it.qty += +b.dataset.d;
    if (it.qty <= 0) bag.splice(+b.dataset.i, 1);
    renderCart();
  });
  $('#checkout').addEventListener('click', () => { const n = $('#cartNote'); n.textContent = UI.demo; n.classList.add('show'); });
  function addToBag(item) {
    const same = bag.find((it) => it.key === item.key && item.key !== 'box');
    if (same) same.qty++; else bag.push({ ...item, qty: 1 });
    renderCart();
    cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
  }
  // a copy of the bar flies from the card into the bag button
  function fly(fromEl, svg) {
    if (reduced) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'fly'; f.innerHTML = svg;
    const w = a.height * 0.5, h = a.height;
    Object.assign(f.style, { left: `${a.left + a.width / 2 - w / 2}px`, top: `${a.top}px`, width: `${w}px`, height: `${h}px` });
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + h / 2);
    return f.animate([
      { transform: 'translate(0,0) rotate(-8deg) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 140}px) rotate(160deg) scale(.55)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) rotate(320deg) scale(.12)`, opacity: 0.4 },
    ], { duration: 820, easing: 'cubic-bezier(.45,0,.3,1)' }).finished.then(() => f.remove());
  }

  /* ---------- bars grid ---------- */
  const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $('#barsGrid').innerHTML = D.BARS.map((b, i) => `<li class="bc" data-reveal>
      <div class="bc-art" style="--c:${CARD_BG[i % 4]}">${b.tag ? `<span class="badge ${b.tag}">${UI[b.tag]}</span>` : ''}${barSvg(b, { bites: b.key === 'caramel' || b.key === 'mango' ? 1 : 0 })}</div>
      <div class="bc-body"><h3 class="bc-name">${D.t(b.name)}</h3><p class="bc-desc">${D.t(b.desc)}</p>${b.soldOut ? `<p class="bc-out">${UI.soldOut[b.soldOut]}</p>` : ''}
        <div class="bc-row"><div><p class="bc-price">${b.price}<small>${UI.cur}</small></p><p class="bc-meta">${b.weight} ${UI.g}</p></div>
        <button class="add" type="button" data-key="${b.key}" aria-label="${UI.add}: ${D.t(b.name)}">${PLUS}</button></div></div></li>`).join('');
  $('#barsGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.add'); if (!btn) return;
    const b = byKey[btn.dataset.key], art = btn.closest('.bc').querySelector('.bc-art svg');
    btn.classList.add('done'); btn.innerHTML = CHECK;
    fly(art, art.outerHTML).then(() => addToBag({ key: b.key, price: b.price }));
    toast(`${UI.added} ${D.t(b.name)}`);
    setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = PLUS; }, 1400);
  });

  /* ---------- box builder ---------- */
  let box = [];
  const TILT = [-6, 4, -3, 5, -4, 3];
  $('#boxPicks').innerHTML = D.BARS.map((b, i) => `<button class="pick" type="button" data-key="${b.key}"><span class="pick-art" style="--c:${CARD_BG[i % 4]}">${barSvg(b)}</span>${D.t(b.name)}</button>`).join('');
  function renderBox(dropAt = -1) {
    $('#boxSlots').innerHTML = Array.from({ length: 6 }, (_, i) => {
      const k = box[i];
      return `<div class="slot${k ? ' filled' : ''}${i === dropAt ? ' drop' : ''}" data-i="${i}" style="--r:${TILT[i]}deg" ${k ? `role="button" tabindex="0" aria-label="${D.t(byKey[k].name)}"` : ''}>${k ? barSvg(byKey[k]) : ''}</div>`;
    }).join('');
    const full = box.reduce((s, k) => s + byKey[k].price, 0), price = Math.round(full * 0.9);
    $('#boxPrice').innerHTML = box.length ? `${money(price)}<s>${full}</s>` : money(0);
    $('#boxSave').textContent = UI.boxSave;
    $('#boxAdd').textContent = UI.boxAdd; $('#boxAdd').disabled = box.length < 6;
    $('#boxHint').textContent = box.length < 6 ? `${UI.box} · ${UI.boxHint(box.length)}` : UI.boxFull;
  }
  $('#boxPicks').addEventListener('click', (e) => {
    const p = e.target.closest('.pick'); if (!p) return;
    if (box.length >= 6) { toast(UI.boxFull); return; }
    box.push(p.dataset.key); renderBox(box.length - 1);
  });
  $('#boxSlots').addEventListener('click', (e) => {
    const s = e.target.closest('.slot.filled'); if (!s) return;
    box.splice(+s.dataset.i, 1); renderBox();
  });
  $('#boxAdd').addEventListener('click', () => {
    // take a copy now: the box is emptied right away, before the fly animation ends
    const contents = [...box], price = Math.round(contents.reduce((s, k) => s + byKey[k].price, 0) * 0.9);
    fly($('#boxSlots'), $('#boxSlots .slot svg').outerHTML).then(() => addToBag({ key: 'box', box: contents, price }));
    toast(UI.boxDone); box = []; renderBox();
  });
  renderBox();

  /* ---------- where to buy ---------- */
  let city = 'cairo', spot = 0;
  $('#tabs').innerHTML = Object.keys(D.SPOTS).map((c) => `<button class="tab" type="button" role="tab" data-city="${c}" aria-selected="${c === city}">${UI.cities[c]}</button>`).join('');
  function renderWhere() {
    const list = D.SPOTS[city];
    $('#map').innerHTML = A.map(city, list.map((s) => s.xy), spot);
    $('#spots').innerHTML = list.map((s, i) => `<li class="spot${i === spot ? ' on' : ''}" data-i="${i}" tabindex="0"><span class="dot"></span><div><b>${D.t(s.name)}</b><span>${D.t(s.note)}</span></div></li>`).join('');
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.city === city)));
  }
  $('#tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (!t) return; city = t.dataset.city; spot = 0; renderWhere(); });
  $('#spots').addEventListener('click', (e) => { const s = e.target.closest('.spot'); if (!s) return; spot = +s.dataset.i; renderWhere(); });
  $('#map').addEventListener('click', (e) => { const p = e.target.closest('.map-pin'); if (!p) return; spot = +p.dataset.i; renderWhere(); });
  renderWhere();

  /* ---------- contact ---------- */
  $$('[data-subject]').forEach((a) => a.addEventListener('click', () => { $('#fSubj').value = 'partner'; }));
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = $('#fName').value.trim().length > 1 && /[0-9]{8,}/.test($('#fPhone').value.replace(/\D/g, ''));
    const m = $('#formMsg'); m.classList.toggle('err', !ok); m.textContent = ok ? UI.sent : UI.bad;
    if (ok) e.target.reset();
  });

  /* ---------- hero bite + statement + header, all scroll-linked ---------- */
  const hero = $('.hero'), heroBar = $('#heroBar'), HERO_BAR = byKey.pistachio;
  let bites = -1;
  function setBites(n) {
    if (n === bites) return;
    const more = n > bites && bites >= 0; bites = n;
    heroBar.innerHTML = barSvg(HERO_BAR, { bites: n });
    if (more && !reduced) {
      const r = heroBar.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      for (let i = 0; i < 12; i++) {
        const c = document.createElement('span'); c.className = 'crumb';
        c.style.left = `${r.left - hr.left + r.width * (0.55 + Math.random() * 0.3)}px`; c.style.top = `${r.top - hr.top + r.height * 0.12}px`;
        c.style.setProperty('--c', i % 2 ? HERO_BAR.coat : HERO_BAR.inner);
        c.style.setProperty('--dx', `${(Math.random() - 0.3) * 260}px`); c.style.setProperty('--dy', `${-60 + Math.random() * 260}px`);
        hero.appendChild(c); setTimeout(() => c.remove(), 950);
      }
    }
  }
  setBites(0);
  hero.addEventListener('pointermove', (e) => { if (reduced || e.pointerType === 'touch') return; heroBar.style.setProperty('--ry', ((e.clientX / innerWidth - 0.5) * 16).toFixed(1)); });

  const words = $$('#stBig .word'), st = $('#stBig');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    if (!document.body.classList.contains('lock')) hdr.classList.toggle('hide', y > 160 && y > lastY);
    lastY = y;
    const hr = hero.getBoundingClientRect();
    setBites(Math.min(3, Math.floor(clamp(-hr.top / (hr.height * 0.6)) * 4)));
    const sr = st.getBoundingClientRect(), p = clamp((vh * 0.85 - sr.top) / (sr.height + vh * 0.35));
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < lit));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('[data-reveal]').forEach((el) => {
    const sibs = $$(':scope > [data-reveal]', el.parentElement);
    if (sibs.length > 1) el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 7) * 70}ms`;
    io.observe(el);
  });

  renderCart();
})();
