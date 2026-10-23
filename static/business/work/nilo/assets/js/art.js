/* NILO gelato — illustration engine.
   Every picture on the site is drawn here as inline SVG, so there are no photo files to load.
   To use real photos later, replace an element's [data-art] with an <img>. */
(function () {
  const INK = '#2A1A12', PAPER = '#FFFDF8', TEAL = '#0F6E6A', WAFFLE = '#E3A857', WAFFLE_D = '#B9772F';

  const FLAVORS = {
    mango:      { name: 'Mango Ewais',     base: '#FFBE3B', dark: '#F09A10', light: '#FFDA82' },
    roz:        { name: 'Roz bel Laban',   base: '#FBF0DC', dark: '#E6D2AC', light: '#FFFFFF', bits: '#B9824A' },
    pistachio:  { name: 'Pistachio',       base: '#B7CC72', dark: '#8DA44E', light: '#D7E5A3', bits: '#5F7430' },
    karkadeh:   { name: 'Karkadeh Sorbet', base: '#C2335E', dark: '#931D43', light: '#E06A8C' },
    chocolate:  { name: 'Dark Chocolate',  base: '#5E331F', dark: '#3F1F12', light: '#86543A' },
    fior:       { name: 'Fior di Latte',   base: '#FFF8EC', dark: '#EADCC1', light: '#FFFFFF' },
    strawberry: { name: 'Strawberry Rose', base: '#F59AAC', dark: '#E06F86', light: '#FBC3CD', bits: '#B92E4A' },
    guava:      { name: 'Guava',           base: '#F7958A', dark: '#E36E62', light: '#FBBAB2', bits: '#C9514A' },
    coffee:     { name: 'Turkish Coffee',  base: '#A8754C', dark: '#7E5132', light: '#C99A72', bits: '#3A2216' },
    dates:      { name: 'Dates & Tahini',  base: '#8E5634', dark: '#6A3C21', light: '#E8D3A8', bits: '#E8D3A8' },
    lemonmint:  { name: 'Lemon Mint',      base: '#EFEA93', dark: '#D6CC55', light: '#F8F5C6', bits: '#4E9A4A' },
    cookies:    { name: 'Cookies & Cream', base: '#EEE6D8', dark: '#D8CCB8', light: '#FFFFFF', bits: '#2A1A12' },
  };

  let uid = 0;
  const nid = (p) => `${p}${++uid}`;
  const f1 = (n) => n.toFixed(1);
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const flav = (k) => FLAVORS[k] || FLAVORS.mango;
  const isAr = (t) => /[\u0600-\u06FF]/.test(t || '');
  // text around a circle: Latin is stretched to fit with textLength; Arabic must not get letter
  // spacing (it breaks the joins), so main.js scales its font-size to fit once fonts are loaded
  function ringText(pid, txt, size, len) {
    return isAr(txt)
      // direction ltr anchors the run at the path start; inside it the Arabic still reads right-to-left
      ? `<text class="ring-fit" data-len="${len}" direction="ltr" font-family="Changa, sans-serif" font-weight="700" font-size="${size}" fill="${INK}"><textPath href="#${pid}">${txt}</textPath></text>`
      : `<text font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="${size}" fill="${INK}"><textPath href="#${pid}" textLength="${len}" lengthAdjust="spacing">${txt.toUpperCase()}</textPath></text>`;
  }

  /* ---------- small building blocks ---------- */
  function swirls(r, cx, cy, R, f, n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const rad = R * (0.22 + 0.68 * r()), a0 = r() * Math.PI * 2, span = 0.7 + r() * 1.7;
      const x0 = cx + rad * Math.cos(a0), y0 = cy + rad * Math.sin(a0), x1 = cx + rad * Math.cos(a0 + span), y1 = cy + rad * Math.sin(a0 + span);
      const col = i % 3 === 0 ? f.light : f.dark;
      s += `<path d="M${f1(x0)} ${f1(y0)}A${f1(rad)} ${f1(rad)} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${col}" stroke-width="${f1(4 + r() * 7)}" stroke-linecap="round" opacity="${(0.5 + r() * 0.45).toFixed(2)}"/>`;
    }
    return s;
  }
  function specks(r, cx, cy, R, n, col, size) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
      s += `<ellipse cx="${f1(cx + d * Math.cos(a))}" cy="${f1(cy + d * Math.sin(a))}" rx="${f1(size * (0.6 + r()))}" ry="${f1(size * 0.55)}" transform="rotate(${Math.round(r() * 180)} ${f1(cx + d * Math.cos(a))} ${f1(cy + d * Math.sin(a))})" fill="${col}"/>`;
    }
    return s;
  }
  // a scoop: round top, scalloped bottom edge, a drip or two
  function scoop(r, cx, cy, R, f) {
    const n = 6, left = cx - R, right = cx + R, sr = R / n;
    let d = `M${f1(left)} ${f1(cy)}A${R} ${R} 0 0 1 ${f1(right)} ${f1(cy)}`;
    for (let i = 0; i < n; i++) {
      const x = right - (i + 1) * 2 * sr;
      d += `A${f1(sr)} ${f1(sr * (0.8 + r() * 0.5))} 0 0 1 ${f1(x)} ${f1(cy)}`;
    }
    d += 'Z';
    let s = `<path d="${d}" fill="${f.base}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    const dx = cx - R * 0.35 + r() * R * 0.7, dl = R * (0.35 + r() * 0.3);
    s += `<path d="M${f1(dx - 9)} ${f1(cy + 4)}v${f1(dl)}a9 9 0 0 0 18 0v${f1(-dl)}" fill="${f.base}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="M${f1(dx - 13)} ${f1(cy + 2)}h26" stroke="${f.base}" stroke-width="7"/>`;
    s += `<path d="M${f1(cx - R * 0.62)} ${f1(cy - R * 0.38)}A${f1(R * 0.75)} ${f1(R * 0.75)} 0 0 1 ${f1(cx - R * 0.05)} ${f1(cy - R * 0.84)}" fill="none" stroke="${f.light}" stroke-width="9" stroke-linecap="round" opacity=".8"/>`;
    s += `<path d="M${f1(cx + R * 0.15)} ${f1(cy - R * 0.45)}q${f1(R * 0.3)} ${f1(-R * 0.12)} ${f1(R * 0.45)} ${f1(R * 0.12)}" fill="none" stroke="${f.dark}" stroke-width="6" stroke-linecap="round" opacity=".7"/>`;
    if (f.bits) s += specks(r, cx, cy - R * 0.4, R * 0.55, 9, f.bits, 3.2);
    return s;
  }

  /* ---------- illustrations (each returns {vb, body}) ---------- */
  function tub(o) {
    const f = flav(o.flavor), r = rng(o.seed || 7);
    const body = `<circle cx="7" cy="10" r="96" fill="#000" opacity=".28"/>
      <circle r="96" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
      <circle r="88" fill="none" stroke="${o.rim || TEAL}" stroke-width="6" stroke-dasharray="3 9" stroke-linecap="round"/>
      <circle r="80" fill="${f.base}" stroke="${INK}" stroke-width="3"/>
      <circle cx="-16" cy="-18" r="54" fill="${f.light}" opacity=".32"/>
      ${swirls(r, 0, 0, 72, f, 10)}
      ${f.bits ? specks(r, 0, 0, 66, 16, f.bits, 3.4) : ''}
      <path d="M-58 -38A70 70 0 0 1 -20 -66" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".55"/>`;
    return { vb: '-112 -112 224 224', body };
  }

  function cone(o) {
    const r = rng(o.seed || 3), sc = o.scoops || ['mango'];
    const clip = nid('cone');
    let hatch = '';
    for (let k = -8; k < 14; k++) {
      hatch += `<path d="M${40 + k * 22} 170l140 210" stroke="${WAFFLE_D}" stroke-width="3.5"/><path d="M${200 - k * 22} 170l-140 210" stroke="${WAFFLE_D}" stroke-width="3.5"/>`;
    }
    let scoops = '';
    sc.forEach((k, i) => { scoops = scoop(r, 120 + (i % 2 ? 6 : -4), 172 - i * 70, 66 - i * 4, flav(k)) + scoops; });
    const body = `<ellipse cx="128" cy="372" rx="58" ry="9" fill="#000" opacity=".18"/>
      <defs><clipPath id="${clip}"><path d="M60 176L180 176 120 366Z"/></clipPath></defs>
      <path d="M60 176L180 176 120 366Z" fill="${WAFFLE}"/>
      <g clip-path="url(#${clip})">${hatch}</g>
      <path d="M60 176L180 176 120 366Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      ${scoops}`;
    return { vb: `0 ${100 - sc.length * 70} 240 ${290 + sc.length * 70}`, body };
  }

  function cup(o) {
    const r = rng(o.seed || 5), sc = o.scoops || ['pistachio', 'strawberry'];
    const clip = nid('cup');
    let stripes = '';
    for (let x = 30; x < 240; x += 34) stripes += `<rect x="${x}" y="150" width="15" height="200" fill="${o.stripe || TEAL}"/>`;
    const tops = sc.map((k, i) => scoop(r, [92, 168, 130][i % 3], [168, 166, 120][i % 3], [54, 52, 50][i % 3], flav(k)));
    const body = `<ellipse cx="132" cy="352" rx="76" ry="10" fill="#000" opacity=".18"/>
      ${tops.slice(0, 2).join('')}${tops.slice(2).join('')}
      <rect x="150" y="38" width="22" height="120" rx="11" fill="#F1C27D" stroke="${INK}" stroke-width="5" transform="rotate(22 160 98)"/>
      <defs><clipPath id="${clip}"><path d="M46 172H214L194 342H66Z"/></clipPath></defs>
      <path d="M46 172H214L194 342H66Z" fill="${PAPER}"/>
      <g clip-path="url(#${clip})">${stripes}</g>
      <path d="M46 172H214L194 342H66Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="38" y="160" width="184" height="24" rx="12" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
      <circle cx="130" cy="258" r="34" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
      <text x="130" y="268" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="26" fill="${INK}">nilo</text>`;
    return { vb: '20 40 220 330', body };
  }

  function pint(o) {
    const f = flav(o.flavor), r = rng(o.seed || 11);
    const body = `<ellipse cx="124" cy="312" rx="86" ry="11" fill="#000" opacity=".18"/>
      <path d="M46 92H194L186 300Q120 314 54 300Z" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M48 150H192L188 236H52Z" fill="${o.band || TEAL}" stroke="${INK}" stroke-width="4"/>
      <text x="120" y="190" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="40" fill="${PAPER}">nilo</text>
      <text x="120" y="222" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="700" font-size="16" letter-spacing="1" fill="${PAPER}">${f.name.toUpperCase()}</text>
      <ellipse cx="120" cy="92" rx="76" ry="20" fill="${f.base}" stroke="${INK}" stroke-width="5"/>
      ${swirls(r, 120, 92, 40, f, 4).replace(/stroke-width="[\d.]+"/g, 'stroke-width="5"')}
      <path d="M40 78Q120 40 200 78L196 92Q120 62 44 92Z" fill="${PAPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" transform="rotate(-14 60 70) translate(-10 -36)"/>`;
    return { vb: '20 20 210 300', body };
  }

  function tubs(o) {
    const ks = o.flavors || ['mango', 'pistachio', 'karkadeh', 'roz'];
    let body = '';
    ks.slice(0, 4).forEach((k, i) => {
      const t = tub({ flavor: k, seed: (o.seed || 1) * 13 + i });
      body += `<g transform="translate(${i % 2 ? 330 : 120} ${i < 2 ? 120 : 330}) rotate(${i * 37})">${t.body}</g>`;
    });
    return { vb: '0 0 450 450', body };
  }

  function spoon(o) {
    const f = flav(o.flavor), r = rng(o.seed || 17);
    const body = `<ellipse cx="150" cy="282" rx="110" ry="12" fill="#000" opacity=".16"/>
      <rect x="128" y="150" width="34" height="200" rx="17" fill="#F1C27D" stroke="${INK}" stroke-width="5" transform="rotate(-34 145 250)"/>
      <ellipse cx="110" cy="150" rx="78" ry="58" fill="#F1C27D" stroke="${INK}" stroke-width="5" transform="rotate(-34 110 150)"/>
      ${scoop(r, 108, 140, 58, f)}`;
    return { vb: '20 40 280 260', body };
  }

  function popsicle(o) {
    const f = flav(o.flavor), r = rng(o.seed || 23);
    const body = `<rect x="104" y="250" width="32" height="96" rx="14" fill="#F1C27D" stroke="${INK}" stroke-width="5"/>
      <path d="M58 92Q58 40 120 40Q182 40 182 92V262Q120 280 58 262Z" fill="${f.base}" stroke="${INK}" stroke-width="5"/>
      <path d="M58 160Q90 176 120 160T182 160V262Q120 280 58 262Z" fill="${f.dark}" stroke="${INK}" stroke-width="5"/>
      <path d="M78 80Q80 58 102 52" fill="none" stroke="${f.light}" stroke-width="9" stroke-linecap="round"/>
      ${f.bits ? specks(r, 120, 120, 40, 8, f.bits, 3) : ''}`;
    return { vb: '30 20 180 340', body };
  }

  function cart(o) {
    const ks = o.flavors || ['mango', 'pistachio', 'karkadeh'];
    let canopy = '';
    for (let i = 0; i < 6; i++) canopy += `<path d="M150 34L${60 + i * 30} 112H${90 + i * 30}Z" fill="${i % 2 ? '#FF8FA3' : PAPER}"/>`;
    let fringe = '';
    for (let x = 67; x < 240; x += 15) fringe += `<circle cx="${x}" cy="114" r="7" fill="#FF8FA3" stroke="${INK}" stroke-width="3"/>`;
    const wheel = (cx) => `<g class="wheel"><circle cx="${cx}" cy="272" r="26" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
      <path d="M${cx - 20} 272H${cx + 20}M${cx} 252V292M${cx - 14} 258L${cx + 14} 286M${cx + 14} 258L${cx - 14} 286" stroke="${INK}" stroke-width="3"/>
      <circle cx="${cx}" cy="272" r="6" fill="${INK}"/></g>`;
    const body = `<ellipse cx="160" cy="302" rx="120" ry="10" fill="#000" opacity=".16"/>
      <rect x="146" y="108" width="8" height="62" fill="${INK}"/>
      ${fringe}${canopy}
      <path d="M150 34L60 112H240Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="150" cy="30" r="7" fill="${INK}"/>
      <path d="M250 192H286V168" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="50" y="168" width="200" height="96" rx="14" fill="${o.body || TEAL}" stroke="${INK}" stroke-width="5"/>
      <path d="M58 250H242" stroke="#FFB627" stroke-width="6"/>
      <rect x="42" y="158" width="216" height="18" rx="9" fill="${PAPER}" stroke="${INK}" stroke-width="5"/>
      ${ks.map((k, i) => `<ellipse cx="${95 + i * 55}" cy="160" rx="21" ry="7" fill="${flav(k).base}" stroke="${INK}" stroke-width="3"/>`).join('')}
      <circle cx="150" cy="212" r="29" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
      <text x="150" y="221" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="24" fill="${INK}">nilo</text>
      ${wheel(98)}${wheel(204)}`;
    return { vb: '20 16 290 300', body };
  }

  const KINDS = { tub, cone, cup, pint, tubs, spoon, popsicle, cart };

  function svg(vb, body, cls) {
    return `<svg class="${cls || ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  // "photo" card: a coloured backdrop with a dot pattern and an illustration on top
  function card(o) {
    const inner = KINDS[o.kind](o), pid = nid('dots');
    const [x, y, w, h] = inner.vb.split(' ').map(Number);
    const box = o.box || [40, 50, 220, 280];
    return svg('0 0 300 380', `<defs><pattern id="${pid}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="#fff" opacity=".28"/></pattern></defs>
      <rect width="300" height="380" fill="${o.bg || '#FFB627'}"/><rect width="300" height="380" fill="url(#${pid})"/>
      <svg x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" viewBox="${x} ${y} ${w} ${h}">${inner.body}</svg>`, 'art-card');
  }

  function burst(o) {
    const pid = nid('bp'), n = o.spikes || 16;
    let pts = '';
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n - Math.PI / 2, R = i % 2 ? 80 : 98;
      pts += `${f1(R * Math.cos(a))},${f1(R * Math.sin(a))} `;
    }
    const txt = (o.text + ' · ').repeat(o.repeat || (o.text.length > (isAr(o.text) ? 21 : 15) ? 1 : 2)), core = o.core || 'nilo';
    return svg('-104 -104 208 208', `<polygon points="${pts}" fill="${o.bg || '#FFB627'}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <circle r="66" fill="${o.inner || '#FF8FA3'}" stroke="${INK}" stroke-width="4"/>
      <defs><path id="${pid}" d="M0 -50A50 50 0 1 1 -0.1 -50"/></defs>
      ${ringText(pid, txt, 14.5, 304)}
      <text y="${isAr(core) ? 11 : 13}" text-anchor="middle" font-family="${isAr(core) ? 'Aref Ruqaa, serif' : 'Yellowtail, cursive'}" font-weight="${isAr(core) ? 700 : 400}" font-size="${o.coreSize || 38}" fill="${INK}">${core}</text>`, 'burst-svg');
  }

  function orderRing(o) {
    const pid = nid('or');
    return svg('-100 -100 200 200', `<circle r="96" fill="${o.bg || '#FFB627'}" stroke="${INK}" stroke-width="4"/>
      <defs><path id="${pid}" d="M0 -74A74 74 0 1 1 -0.1 -74"/></defs>
      <g class="spin">${ringText(pid, o.text || 'ORDER NOW · SCOOP NOW · ', 18, 452)}</g>
      <circle r="48" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
      <path class="arrow" d="M-18 0H18M4 -15L19 0 4 15" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`, 'order-svg');
  }

  function render(el) {
    const d = el.dataset, kind = d.art;
    const list = (v) => (v ? v.split(',').map((s) => s.trim()) : undefined);
    const o = { kind, flavor: d.flavor, scoops: list(d.scoops), flavors: list(d.flavors), seed: +d.seed || 1, bg: d.bg, stripe: d.stripe, band: d.band };
    if (kind === 'burst') return (el.innerHTML = burst({ text: d.text || 'made fresh daily', core: d.core, bg: d.bg, inner: d.inner, coreSize: +d.coreSize || undefined }));
    if (kind === 'order') return (el.innerHTML = orderRing({ bg: d.bg, text: d.text }));
    if (d.card !== undefined) return (el.innerHTML = card(o));
    const a = KINDS[kind](o);
    el.innerHTML = svg(a.vb, a.body, 'art-' + kind);
  }

  window.NILO_ART = { FLAVORS, KINDS, render, svg, tub };
})();
