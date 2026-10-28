/* NILO gelato — locations page: illustrated map, location cards with live open/closed status, cart band */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.NILO_ART, D = window.NILO_DATA, UI = D.UI;
  const INK = '#2A1A12', PAPER = '#FFFDF8';
  const FONT = D.AR ? 'Changa, sans-serif' : 'Bricolage Grotesque, sans-serif';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- open / closed, from the visitor's clock ---------- */
  const now = new Date(), H = now.getHours() + now.getMinutes() / 60, MONTH = now.getMonth() + 1;
  function status(l) {
    if (l.months && !l.months.includes(MONTH)) return { open: false, text: UI.backIn };
    if (l.closedToday) return { open: false, text: UI.closedToday };   // set in the owner's dashboard
    const h = H < 6 ? H + 24 : H; // just after midnight still belongs to the evening before
    const open = h >= l.open && h < l.close;
    return { open, text: open ? UI.openNow : UI.opensAt(UI.hour(l.open)) };
  }
  const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  /* ---------- cards ---------- */
  $('#locList').innerHTML = D.LOCATIONS.map((l) => {
    const s = status(l);
    return `<li class="loc-card" data-reveal data-key="${l.key}" style="--c:${l.c}" tabindex="-1">
      <div class="loc-head"><span class="loc-num">${l.num}</span><div><p class="loc-kind">${D.t(l.kind)}</p><h3>${D.t(l.name)}</h3></div>
        <span class="status ${s.open ? 'open' : 'closed'}">${s.text}</span></div>
      <p class="loc-blurb">${D.t(l.blurb)}</p>
      <dl class="loc-info"><dt>${UI.hours}</dt><dd>${l.months ? UI.summer : UI.daily} · ${UI.hour(l.open)} – ${UI.hour(l.close)}</dd>
        <dt>${UI.call}</dt><dd><a href="tel:${l.phone.replace(/\s/g, '')}" dir="ltr">${l.phone}</a></dd></dl>
      <div class="fl-meta">${l.feats.map((k) => `<span class="pill">${D.t(D.FEATS[k])}</span>`).join('')}</div>
      <div class="loc-actions"><a class="btn btn-sun btn-sm" href="${mapsUrl(l.q)}" target="_blank" rel="noopener">${UI.directions}</a>
        <button class="btn btn-cream btn-sm" type="button" data-pin="${l.key}">${UI.showMap}</button></div></li>`;
  }).join('');

  /* ---------- illustrated map (not to scale) ---------- */
  const label = (x, y, txt, size = 15, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${INK}" ${extra}>${txt}</text>`;
  const L = D.AR
    ? { zam: 'الزمالك', down: 'وسط البلد', giza: 'الجيزة', pyr: 'الأهرامات', maadi: 'المعادي', nc: 'التجمع', coast: 'الساحل', km: '240 كم', nile: 'النيل', note: 'مش بالمقياس' }
    : { zam: 'Zamalek', down: 'Downtown', giza: 'Giza', pyr: 'Pyramids', maadi: 'Maadi', nc: 'New Cairo', coast: 'North Coast', km: '240 km', nile: 'the Nile', note: 'not to scale' };
  const nile = 'M262 540C300 470 336 420 318 340S272 236 292 162S262 52 244 -20';
  const pins = D.LOCATIONS.map((l) => `<g class="pin" data-key="${l.key}" transform="translate(${l.map[0]} ${l.map[1]})" tabindex="0" role="button" aria-label="${D.t(l.name)}">
      <ellipse cy="2" rx="12" ry="4" fill="#000" opacity=".25"/>
      <g class="pin-body"><path d="M0 0C-12 -14 -20 -24 -20 -36A20 20 0 1 1 20 -36C20 -24 12 -14 0 0Z" fill="${l.c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <circle cy="-36" r="11" fill="${PAPER}" stroke="${INK}" stroke-width="2.5"/>${label(0, -31, l.num, 14)}</g></g>`).join('');
  $('#map').innerHTML = `<svg viewBox="0 0 600 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${D.AR ? 'خريطة الفروع' : 'Map of our locations'}">
    <defs><pattern id="mdots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="${INK}" opacity=".12"/></pattern></defs>
    <rect width="600" height="520" fill="#F6E9D2"/><rect width="600" height="520" fill="url(#mdots)"/>
    <path d="M430 0H600V520H470C500 430 440 380 470 300S400 120 430 0Z" fill="#F1DDB8"/>
    <ellipse cx="300" cy="275" rx="235" ry="200" fill="none" stroke="#fff" stroke-width="12"/>
    <ellipse cx="300" cy="275" rx="235" ry="200" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" opacity=".5"/>
    <path d="M320 260Q430 262 528 300" fill="none" stroke="#fff" stroke-width="9"/>
    <path d="M320 260Q430 262 528 300" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round" opacity=".5"/>
    <path d="M320 262Q340 340 352 418" fill="none" stroke="#fff" stroke-width="8"/>
    <ellipse cx="528" cy="326" rx="58" ry="28" fill="#CFE3A6" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="392" cy="452" rx="44" ry="22" fill="#CFE3A6" stroke="${INK}" stroke-width="2.5"/>
    <path d="${nile}" fill="none" stroke="${INK}" stroke-width="56" stroke-linecap="round"/>
    <path d="${nile}" fill="none" stroke="#5FB3AF" stroke-width="50" stroke-linecap="round"/>
    <path d="${nile}" fill="none" stroke="#86CFCB" stroke-width="30" stroke-linecap="round"/>
    <path d="${nile}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 18" opacity=".7"/>
    <ellipse cx="290" cy="212" rx="14" ry="44" transform="rotate(-10 290 212)" fill="#CFE3A6" stroke="${INK}" stroke-width="3"/>
    <g transform="translate(118 352)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"><path d="M-30 0L-14 -26 2 0Z" fill="#E9C27E"/><path d="M-6 0L14 -34 34 0Z" fill="#F1CF8F"/><path d="M28 0L40 -18 52 0Z" fill="#E9C27E"/></g>
    ${label(118, 376, L.pyr, 13)}
    ${label(348, 222, L.zam)}${label(372, 268, L.down, 14)}${label(180, 286, L.giza)}${label(352, 488, L.maadi)}${label(528, 374, L.nc)}
    ${label(214, 474, L.nile, 13, 'font-style="italic" opacity=".7"')}
    <g transform="translate(548 60)"><circle r="24" fill="${PAPER}" stroke="${INK}" stroke-width="3"/><path d="M0 -17L7 4H-7Z" fill="#FF8FA3" stroke="${INK}" stroke-width="2"/><path d="M0 17L7 -4H-7Z" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>${label(0, -30, 'N', 12)}</g>
    <g><rect x="18" y="18" width="178" height="126" rx="16" fill="#CDEBEA" stroke="${INK}" stroke-width="3"/>
      <path d="M20 104Q70 92 110 106T194 98V128Q194 142 180 142H34Q20 142 20 128Z" fill="#F1DDB8"/>
      ${label(150, 46, L.coast, 14)}${label(150, 66, '↖ ' + L.km, 12, 'opacity=".75"')}</g>
    ${label(560, 504, L.note, 11, 'opacity=".55"')}
    ${pins}</svg>`;

  /* ---------- link pins and cards ---------- */
  const cards = $$('.loc-card'), pinEls = $$('#map .pin');
  function highlight(key, scrollTo) {
    cards.forEach((c) => c.classList.toggle('on', c.dataset.key === key));
    pinEls.forEach((p) => p.classList.toggle('on', p.dataset.key === key));
    const card = cards.find((c) => c.dataset.key === key);
    if (scrollTo === 'card' && card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.focus({ preventScroll: true }); }
    if (scrollTo === 'map' && matchMedia('(max-width: 900px)').matches) $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  pinEls.forEach((p) => {
    p.addEventListener('click', () => highlight(p.dataset.key, 'card'));
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); highlight(p.dataset.key, 'card'); } });
  });
  cards.forEach((c) => c.addEventListener('pointerenter', () => highlight(c.dataset.key)));
  $('#locList').addEventListener('click', (e) => { const b = e.target.closest('[data-pin]'); if (b) highlight(b.dataset.pin, 'map'); });
  highlight(D.LOCATIONS[0].key);

  /* ---------- the cart drives in as you scroll ---------- */
  const band = $('.cart-band'), cartArt = $('.cart-art');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const r = band.getBoundingClientRect(), p = clamp((innerHeight - r.top) / (innerHeight * 0.9));
    const dir = D.AR ? 1 : -1, dx = (1 - p) * 260 * dir;
    cartArt.style.setProperty('--cx', `${dx.toFixed(1)}px`);
    cartArt.style.setProperty('--wr', `${(dx / (2 * Math.PI * 26)) * -360}deg`);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
