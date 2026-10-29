/* KHABTA — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.KH_ART, D = window.KH_DATA, UI = D.UI;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => (D.AR ? `${n} ${UI.cur}` : `${UI.cur} ${n}`);
  const byKey = Object.fromEntries(D.MENU.map((m) => [m.key, m]));
  const burgerSvg = (keys, o = {}) => { const b = A.burger(keys, o); return A.svg(b.vb, b.body); };
  const ASLY = byKey.asly.stack;

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

  /* ---------- loader: the burger builds itself ---------- */
  $('#logoArt').innerHTML = burgerSvg(['bunB', 'patty', 'cheese', 'bunT'], { seed: 5 });
  const lb = A.burger(ASLY, { seed: 11 });
  $('#loaderBurger').innerHTML = A.svg(lb.vb, lb.body);
  $$('#loaderBurger .ly').forEach((g, i) => g.style.setProperty('--i', i));
  const total = reduced ? 300 : 2600, t0 = performance.now();
  function load(now) {
    const p = clamp((now - t0) / total);
    $('#loaderPct').textContent = `${Math.round(p * 100)}%`;
    $('#loaderMsg').textContent = UI.load[Math.min(UI.load.length - 1, Math.floor(p * UI.load.length))];
    if (p < 1) requestAnimationFrame(load);
    else setTimeout(() => { document.body.classList.remove('loading'); document.body.classList.add('loaded'); setTimeout(() => $('#loader').remove(), 1000); }, 350);
  }
  requestAnimationFrame(load);
  setTimeout(() => { if (document.body.classList.contains('loading')) { document.body.classList.remove('loading'); document.body.classList.add('loaded'); } }, total + 2500); // background tabs pause rAF

  /* ---------- header + menu ---------- */
  const hdr = $('#hdr'), menuBtn = $('#menuBtn'), overlay = $('#menuOverlay');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open); document.body.classList.toggle('lock', open || document.body.classList.contains('bag-open'));
    menuBtn.setAttribute('aria-expanded', String(open)); overlay.setAttribute('aria-hidden', String(!open));
  }
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', overlay).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- bag ---------- */
  const KEY = 'khabta-bag';
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { bag = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch { /* storage may be blocked */ } };
  const bagBtn = $('#bagBtn');
  function renderBag() {
    const count = bag.reduce((s, it) => s + it.qty, 0), sum = bag.reduce((s, it) => s + it.qty * it.price, 0);
    $('#bagCount').textContent = count; $('#totalLabel').textContent = UI.total; $('#bagTotal').textContent = money(sum);
    $('#checkout').textContent = UI.checkout; $('#checkout').disabled = !count;
    $('#bagList').innerHTML = count ? bag.map((it, i) => `<li class="bi"><div class="bi-art">${burgerSvg(it.stack, { seed: 3 })}</div>
        <div><p class="bi-name">${it.key === 'custom' ? UI.custom : D.t(byKey[it.key].name)}</p><p class="bi-price">${money(it.price)}</p></div>
        <div class="qty"><button type="button" data-i="${i}" data-d="-1" aria-label="-">−</button><span>${it.qty}</span><button type="button" data-i="${i}" data-d="1" aria-label="+">+</button></div></li>`).join('')
      : `<li class="bag-empty">${UI.empty}</li>`;
    save();
  }
  function setBag(open) {
    document.body.classList.toggle('bag-open', open); document.body.classList.toggle('lock', open || document.body.classList.contains('menu-open'));
    $('#bag').setAttribute('aria-hidden', String(!open));
    if (open) $('#bagX').focus(); else { $('#bagNote').classList.remove('show'); $('#bagNote').textContent = ''; }
  }
  bagBtn.addEventListener('click', () => setBag(true));
  $('#orderOpen').addEventListener('click', () => setBag(true));
  $('#bagX').addEventListener('click', () => setBag(false));
  $('#scrim').addEventListener('click', () => setBag(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { setBag(false); setMenu(false); } });
  $('#bagList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const it = bag[+b.dataset.i]; it.qty += +b.dataset.d; if (it.qty <= 0) bag.splice(+b.dataset.i, 1); renderBag();
  });
  $('#checkout').addEventListener('click', () => { const n = $('#bagNote'); n.textContent = UI.demo; n.classList.add('show'); });
  function addToBag(item) {
    const same = item.key !== 'custom' && bag.find((it) => it.key === item.key);
    if (same) same.qty++; else bag.push({ ...item, qty: 1 });
    renderBag(); bagBtn.classList.remove('bump'); void bagBtn.offsetWidth; bagBtn.classList.add('bump');
    hdr.classList.remove('hide');
  }
  function fly(fromEl, svgHtml) {
    if (reduced) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(), b = bagBtn.getBoundingClientRect(), s = Math.min(a.width, a.height) * 0.8;
    const f = document.createElement('div'); f.className = 'fly'; f.innerHTML = svgHtml;
    Object.assign(f.style, { left: `${a.left + a.width / 2 - s / 2}px`, top: `${a.top + a.height / 2 - s / 2}px`, width: `${s}px`, height: `${s}px` });
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    return f.animate([{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 160}px) scale(.6) rotate(-25deg)`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.1) rotate(-60deg)`, opacity: 0.5 }], { duration: 850, easing: 'cubic-bezier(.45,0,.3,1)' }).finished.then(() => f.remove());
  }

  /* ---------- hero: the burger comes apart as you scroll ---------- */
  const hero = $('.hero'), hb = $('#heroBurger'), labels = hb.dataset.labels.split('|');
  const HB = A.burger(ASLY, { seed: 11 }), MAXGAP = 34, n = ASLY.length;
  const LBL_AT = [0, 1, 2, 5, 7, 8];
  const vbH = HB.height + MAXGAP * (n - 1) + 60;
  const wrap = (str, max) => str.split(' ').reduce((ls, w) => {
    const last = ls[ls.length - 1];
    if (last && (last + ' ' + w).length <= max) ls[ls.length - 1] = last + ' ' + w; else ls.push(w);
    return ls;
  }, []);
  // labels wrap to fit beside the burger; phones get a narrower box with bigger, shorter lines
  let hbLayers = [], hbG = null, lblgs = [], hbNarrow = null, hbP = 0;
  function drawHero() {
    const narrow = innerWidth < 640;
    if (narrow === hbNarrow) return;
    hbNarrow = narrow;
    const half = narrow ? 300 : 380, fs = narrow ? 22 : 17, lh = fs * 1.2, max = narrow ? 12 : 22;
    let lbl = '';
    LBL_AT.forEach((li, k) => {
      const right = k % 2 === 0, x = right ? 168 : -168, anchor = right ? (D.AR ? 'end' : 'start') : (D.AR ? 'start' : 'end');
      const lines = wrap(labels[k] || '', max), y0 = fs * 0.35 - (lines.length - 1) * lh / 2;
      lbl += `<g class="lblg" data-li="${li}"><line x1="${right ? 146 : -146}" x2="${right ? 160 : -160}" y1="0" y2="0" stroke="#FFC21A" stroke-width="4" stroke-linecap="round"/>
        <text class="lbl" y="${y0.toFixed(1)}" text-anchor="${anchor}" style="font-size:${fs}px">${lines.map((t, j) => `<tspan x="${x}" dy="${j ? lh.toFixed(1) : 0}">${t}</tspan>`).join('')}</text></g>`;
    });
    // the exploded burger always centres on -height/2, so the box does too
    hb.innerHTML = `<svg viewBox="${-half} ${(-HB.height / 2 - vbH / 2).toFixed(0)} ${half * 2} ${vbH.toFixed(0)}" aria-hidden="true"><g id="hbG">${HB.body}</g><g id="hbL">${lbl}</g></svg>`;
    hbLayers = $$('#hbG .ly', hb); hbG = $('#hbG', hb); lblgs = $$('.lblg', hb);
    explode(hbP);
  }
  function explode(p) {
    hbP = p;
    const gap = MAXGAP * eio(clamp(p / 0.6)), shift = gap * (n - 1) / 2, la = clamp((p - 0.12) / 0.3);
    hbLayers.forEach((g, i) => g.setAttribute('transform', `translate(0 ${(HB.layers[i].y - gap * i).toFixed(1)})`));
    hbG.setAttribute('transform', `translate(0 ${(shift - 6 * (1 - clamp(p * 3))).toFixed(1)}) rotate(${(-6 * (1 - clamp(p * 2))).toFixed(2)})`);
    lblgs.forEach((g, k) => {
      const li = +g.dataset.li, l = HB.layers[li], y = l.y - gap * li - l.h / 2 + shift;
      g.setAttribute('transform', `translate(0 ${y.toFixed(1)})`);
      g.setAttribute('opacity', clamp(la * 1.6 - k * 0.12).toFixed(2));
    });
  }
  drawHero();

  /* ---------- smash ---------- */
  $('#spat').innerHTML = A.svg(A.spatula.vb, A.spatula.body);
  const griddle = $('#griddle');
  const smash = () => { griddle.classList.remove('go'); void griddle.offsetWidth; griddle.classList.add('go'); };
  griddle.addEventListener('click', smash);
  griddle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); smash(); } });

  /* ---------- menu cards ---------- */
  $('#menuGrid').innerHTML = D.MENU.map((m) => `<li class="mc" data-reveal><div class="mc-art" style="--c:${m.bg}">${m.tag ? `<span class="tag">${UI[m.tag]}</span>` : ''}${burgerSvg(m.stack, { seed: m.price })}</div>
      <div class="mc-body"><h3 class="mc-name">${D.t(m.name)}</h3><p class="mc-desc">${D.t(m.desc)}</p>
      <div class="mc-row"><p class="mc-price">${m.price}<small>${UI.cur}</small></p><button class="add" type="button" data-key="${m.key}">+ ${UI.add}</button></div></div></li>`).join('');
  $('#menuGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.add'); if (!b) return;
    const m = byKey[b.dataset.key], art = b.closest('.mc').querySelector('.mc-art svg');
    b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1200);
    fly(art, art.outerHTML).then(() => addToBag({ key: m.key, price: m.price, stack: m.stack }));
    toast(`${UI.added}: ${D.t(m.name)}`);
  });

  /* ---------- build your burger ---------- */
  const B = D.BUILD;
  const st = { bun: 'potato', patties: 2, cheese: 'cheese', extras: new Set(['pickles', 'onion']), sauce: 'sauce' };
  const EXTRA_ORDER = ['lettuce', 'tomato', 'jalapeno', 'mushroom', 'pickles', 'onion'];
  function buildKeys() {
    const k = ['bunB'];
    for (let i = 0; i < st.patties; i++) { k.push('patty'); if (st.cheese !== 'none') k.push(st.cheese); }
    EXTRA_ORDER.forEach((e) => { if (st.extras.has(e)) k.push(e); });
    k.push(st.sauce, 'bunT'); return k;
  }
  function buildPrice() {
    const bun = B.bun.find((b) => b.key === st.bun).price, ch = B.cheese.find((c) => c.key === st.cheese).price;
    const ex = B.extras.filter((e) => st.extras.has(e.key)).reduce((s, e) => s + e.price, 0);
    return B.base + bun + st.patties * B.pattyPrice + ch * st.patties + ex;
  }
  const opt = (group, key, label, price, on) => `<button class="opt" type="button" data-g="${group}" data-k="${key}" aria-pressed="${on}">${label}${price ? `<small>+${price}</small>` : ''}</button>`;
  $('#buildSteps').innerHTML = `
    <div class="step"><h3>${UI.steps.bun}</h3><div class="opts">${B.bun.map((b) => opt('bun', b.key, D.t(b.name), b.price, b.key === st.bun)).join('')}</div></div>
    <div class="step"><h3>${UI.steps.patties}</h3><div class="opts">${B.patties.map((p) => opt('patties', p, UI.patties(p), 0, p === st.patties)).join('')}</div></div>
    <div class="step"><h3>${UI.steps.cheese}</h3><div class="opts">${B.cheese.map((c) => opt('cheese', c.key, D.t(c.name), c.price, c.key === st.cheese)).join('')}</div></div>
    <div class="step"><h3>${UI.steps.extras}</h3><div class="opts">${B.extras.map((e) => opt('extras', e.key, D.t(e.name), e.price, st.extras.has(e.key))).join('')}</div></div>
    <div class="step"><h3>${UI.steps.sauce}</h3><div class="opts">${B.sauce.map((s) => opt('sauce', s.key, D.t(s.name), 0, s.key === st.sauce)).join('')}</div></div>`;
  let prevKeys = [];
  function renderBuild() {
    const keys = buildKeys(), b = A.burger(keys, { seed: 21 });
    $('#buildArt').innerHTML = A.svg(b.vb, b.body);
    $$('#buildArt .ly').forEach((g, i) => { if (prevKeys.length && keys[i] !== prevKeys[i]) g.classList.add('new'); });
    prevKeys = keys;
    $('#buildPrice').innerHTML = `${buildPrice()}<small>${UI.cur}</small>`;
    $('#buildAdd').textContent = UI.addBuild;
    $$('#buildSteps .opt').forEach((o) => {
      const g = o.dataset.g, k = g === 'patties' ? +o.dataset.k : o.dataset.k;
      o.setAttribute('aria-pressed', String(g === 'extras' ? st.extras.has(k) : st[g] === k));
    });
  }
  $('#buildSteps').addEventListener('click', (e) => {
    const o = e.target.closest('.opt'); if (!o) return;
    const g = o.dataset.g, k = g === 'patties' ? +o.dataset.k : o.dataset.k;
    if (g === 'extras') { if (st.extras.has(k)) st.extras.delete(k); else st.extras.add(k); } else st[g] = k;
    renderBuild();
  });
  $('#buildAdd').addEventListener('click', () => {
    const art = $('#buildArt svg'), item = { key: 'custom', price: buildPrice(), stack: buildKeys() };
    fly(art, art.outerHTML).then(() => addToBag(item)); toast(`${UI.added}: ${UI.custom}`);
  });
  renderBuild();

  /* ---------- delivery route ---------- */
  const PATH = 'M60 430C300 430 340 180 600 200S900 470 1200 380S1500 110 1800 210S2100 470 2340 330';
  const blocks = [[150, 120, 160, 90], [420, 330, 140, 80], [720, 70, 180, 100], [1350, 450, 200, 90], [1560, 300, 120, 70], [1900, 70, 170, 90], [2150, 420, 160, 90], [980, 160, 120, 80]]
    .map(([x, y, w, h]) => {
      const k = Math.max(2, Math.round(w / 60)), rw = (w - 20) / k;
      let roofs = '';
      for (let i = 0; i < k; i++) roofs += `<rect x="${(x + 10 + i * rw + 4).toFixed(1)}" y="${y + 12}" width="${(rw - 8).toFixed(1)}" height="${h - 24}" rx="8" fill="#FFE08A" stroke="#1B1B1F" stroke-width="3"/>`;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#E9A800"/>${roofs}`;
    }).join('');
  const trees = [[260, 300], [560, 420], [1120, 120], [1460, 260], [1700, 470], [2050, 150], [2260, 200]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#9CCB6B" stroke="#1B1B1F" stroke-width="4"/>`).join('');
  const track = $('#track');
  track.innerHTML = `<svg viewBox="0 0 2400 600" preserveAspectRatio="none" aria-hidden="true" style="${D.AR ? 'transform:scaleX(-1)' : ''}">
      <path d="M820 -20C900 200 860 400 960 620L1080 620C980 400 1020 200 940 -20Z" fill="#7FC8E6" stroke="#1B1B1F" stroke-width="4"/>
      ${blocks}${trees}
      <path id="road" d="${PATH}" fill="none" stroke="#1B1B1F" stroke-width="58" stroke-linecap="round"/>
      <path d="${PATH}" fill="none" stroke="#FFF0D6" stroke-width="5" stroke-dasharray="24 20" stroke-linecap="round"/></svg>
    <div class="scoot" id="scoot">${(() => { const s = A.scooter(D.AR ? 'خبطة' : 'KHABTA'); return A.svg(s.vb, s.body); })()}</div>`;
  const road = $('#road', track), RL = road.getTotalLength();
  const pt = (f) => { const p = road.getPointAtLength(RL * f); return { x: D.AR ? 2400 - p.x : p.x, y: p.y }; };
  D.BRANCHES.forEach((b, i) => {
    const p = pt(b.at);
    track.insertAdjacentHTML('beforeend', `<span class="bpin" style="left:${(p.x / 24).toFixed(2)}%;top:${(p.y / 6).toFixed(2)}%"></span>
      <div class="bcard${i % 2 ? ' below' : ''}" data-at="${b.at}" style="left:${(p.x / 24).toFixed(2)}%;top:${(p.y / 6).toFixed(2)}%"><b>${D.t(b.name)}</b><span>${D.t(b.note)}</span></div>`);
  });
  const scoot = $('#scoot'), bcards = $$('.bcard', track), route = $('.route');
  function drive(p) {
    const f = 0.02 + 0.96 * p, a = pt(f), b = pt(Math.min(1, f + 0.004));
    scoot.style.left = `${(a.x / 24).toFixed(2)}%`; scoot.style.top = `${(a.y / 6).toFixed(2)}%`;
    let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; if (D.AR) ang -= 180;
    scoot.style.setProperty('--rot', `${ang.toFixed(1)}deg`);
    // phones only have room for the card the scooter is at; wider screens keep the visited ones open
    const keep = innerWidth < 640 ? 0.1 : 1;
    bcards.forEach((c) => c.classList.toggle('on', f >= +c.dataset.at - 0.03 && f <= +c.dataset.at + keep));
    // camera follows the scooter, keeping it centred until the road runs out
    const tw = track.getBoundingClientRect().width, vw = route.clientWidth, sx = (a.x / 2400) * tw, room = Math.max(0, tw - vw);
    const tx = D.AR ? clamp(tw - sx - vw / 2, 0, room) : clamp(vw / 2 - sx, -room, 0);
    track.style.setProperty('--tx', `${tx.toFixed(1)}px`);
  }

  /* ---------- scroll ---------- */
  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    if (!document.body.classList.contains('lock')) hdr.classList.toggle('hide', y > 200 && y > lastY);
    hdr.classList.toggle('solid', y > hero.offsetHeight - vh);
    lastY = y;
    const hr = hero.getBoundingClientRect();
    if (hr.bottom > 0) explode(clamp(-hr.top / (hr.height - vh)));
    const rr = route.getBoundingClientRect();
    if (rr.top < vh && rr.bottom > 0) drive(clamp(-rr.top / (rr.height - vh)));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { drawHero(); onScroll(); });
  onScroll(); drive(0);

  /* ---------- reveal, count-up, smash on view ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add('in'); io.unobserve(el);
    if (el === griddle) smash();
    const num = el.querySelector && el.querySelector('[data-count]');
    if (num) {
      const to = +num.dataset.count, s0 = performance.now();
      const step = (now) => { const p = clamp((now - s0) / 1200); num.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      if (reduced) num.textContent = to; else requestAnimationFrame(step);
    }
  }), { threshold: 0.3 });
  $$('[data-reveal]').forEach((el) => {
    const sibs = $$(':scope > [data-reveal]', el.parentElement);
    if (sibs.length > 1) el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 7) * 70}ms`;
    io.observe(el);
  });
  io.observe(griddle);

  renderBag();
})();
