/* TALG — illustration engine. Every bar, cube and map on the site is inline SVG drawn here. */
(function () {
  const INK = '#22160F', WOOD = '#E8C38C', WOOD_D = '#C99A5B';
  let uid = 0;
  const nid = (p) => `${p}${++uid}`;
  const f1 = (n) => n.toFixed(1);
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  const BODY = 'M30 300V112A80 80 0 0 1 190 112V300Q190 322 168 322H52Q30 322 30 300Z';
  const BITES = [[176, 74, 40], [134, 38, 36], [90, 40, 34]];

  function toppings(r, kind, col, y0, y1) {
    let s = '';
    const n = { nuts: 26, flakes: 30, sesame: 34, salt: 22, chili: 24, mint: 9 }[kind] || 0;
    for (let i = 0; i < n; i++) {
      const x = 44 + r() * 132, y = y0 + r() * (y1 - y0), a = Math.round(r() * 180);
      if (kind === 'nuts') s += `<path d="M0 -6L6 -2 5 5-3 6-7 0Z" transform="translate(${f1(x)} ${f1(y)}) rotate(${a}) scale(${f1(0.8 + r() * 0.8)})" fill="${col}" stroke="${shade(col, -0.35)}" stroke-width="1.2"/>`;
      else if (kind === 'flakes') s += `<rect x="-6" y="-2" width="12" height="4" rx="2" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})" fill="${col}"/>`;
      else if (kind === 'sesame') s += `<ellipse rx="3.6" ry="1.9" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})" fill="${col}"/>`;
      else if (kind === 'salt') s += `<rect x="-2.5" y="-2.5" width="5" height="5" rx="1" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})" fill="${col}" opacity=".9"/>`;
      else if (kind === 'chili') s += `<rect x="-2.6" y="-1.6" width="5.2" height="3.2" rx="1" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})" fill="${col}"/>`;
      else if (kind === 'mint') s += `<path d="M0 -9C7 -5 7 5 0 9C-7 5-7-5 0-9Z" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})" fill="${col}" opacity=".85"/><path d="M0 -8V8" transform="translate(${f1(x)} ${f1(y)}) rotate(${a})" stroke="${shade(col, -0.3)}" stroke-width="1"/>`;
    }
    return s;
  }

  // o: { inner, coat, top, topCol, seed, bites (0..3), stamp (bool) }
  function bar(o) {
    const r = rng(o.seed || 1), clip = nid('bc'), mask = nid('bm'), bites = Math.max(0, Math.min(3, o.bites || 0));
    const coatY = 236;
    let coat = '';
    if (o.coat) {
      let d = `M0 0H220V${coatY}`;
      const drips = [[176, 24], [148, 44], [118, 18], [86, 52], [58, 28]];
      let x = 220;
      for (const [dx, len] of drips) {
        d += `L${dx + 12} ${coatY}Q${dx + 12} ${coatY + len} ${dx} ${coatY + len}Q${dx - 12} ${coatY + len} ${dx - 12} ${coatY}`;
        x = dx - 12;
      }
      d += `L0 ${coatY}Z`;
      coat = `<path d="${d}" fill="${o.coat}"/><path d="M48 70Q44 150 52 220" fill="none" stroke="${shade(o.coat, 0.35)}" stroke-width="9" stroke-linecap="round" opacity=".55"/>`;
      if (o.stamp !== false) coat += `<text x="110" y="168" text-anchor="middle" font-family="Bagel Fat One, sans-serif" font-size="40" fill="${shade(o.coat, o.coat === '#FFF4DD' || o.coat === '#FF9FB3' ? -0.12 : 0.14)}" transform="rotate(-90 110 160)">TALG</text>`;
      coat += toppings(r, o.top, o.topCol, 40, 200);
    }
    const inner = `<path d="${BODY}" fill="${o.inner}"/>` + (o.coat ? '' : `<path d="M50 80Q44 170 52 280" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".45"/>` + toppings(r, o.top, o.topCol, 40, 300));
    let biteRim = '', biteCut = '', biteEdge = '';
    for (let i = 0; i < bites; i++) {
      const [cx, cy, rad] = BITES[i];
      biteRim += `<circle cx="${cx}" cy="${cy}" r="${rad + 11}" fill="${o.inner}"/>`;
      biteCut += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#000"/>`;
      biteEdge += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${INK}" stroke-width="5"/>`;
    }
    const body = `<defs><clipPath id="${clip}"><path d="${BODY}"/></clipPath>
        <mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="440"><rect width="220" height="440" fill="#fff"/>${biteCut}</mask></defs>
      <ellipse cx="114" cy="428" rx="62" ry="9" fill="#000" opacity=".16"/>
      <rect x="92" y="296" width="36" height="134" rx="17" fill="${WOOD}" stroke="${INK}" stroke-width="5"/>
      <path d="M104 330V410M116 320V396" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>
      <g mask="url(#${mask})">
        <g clip-path="url(#${clip})">${inner}${coat}${biteRim}</g>
        <path d="${BODY}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      </g>
      <g clip-path="url(#${clip})" mask="url(#${mask})">${''}</g>
      <g clip-path="url(#${clip})">${biteEdge}</g>`;
    return { vb: '0 0 220 440', body };
  }

  function cube(o) {
    const c = o.col || '#BFE6FF';
    return { vb: '-60 -60 120 120', body: `<rect x="-44" y="-44" width="88" height="88" rx="20" fill="${c}" stroke="${INK}" stroke-width="5" transform="rotate(${o.rot || 12})"/>
      <path d="M-26 -22Q-26 -30 -18 -30H8" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" transform="rotate(${o.rot || 12})"/>` };
  }

  function svg(vb, body, cls) {
    return `<svg class="${cls || ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  // a small, not-to-scale city map for "where to buy"
  function map(city, pins, active) {
    const water = city === 'alex'
      ? `<path d="M0 0H600V70Q520 96 430 78T250 86 80 70 0 90Z" fill="#9FD8F5" stroke="${INK}" stroke-width="3"/>`
      : `<path d="M300 -10C330 60 270 120 300 190S270 300 300 400" fill="none" stroke="#9FD8F5" stroke-width="44" stroke-linecap="round"/><path d="M300 -10C330 60 270 120 300 190S270 300 300 400" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="2 10" opacity=".4"/>`;
    const roads = `<path d="M0 120H600M0 260H600M120 0V380M460 0V380" stroke="#fff" stroke-width="14"/><path d="M0 120H600M0 260H600M120 0V380M460 0V380" stroke="${INK}" stroke-width="2" stroke-dasharray="3 12" opacity=".35"/>`;
    const parks = `<ellipse cx="520" cy="330" rx="60" ry="30" fill="#BDE8C9" stroke="${INK}" stroke-width="3"/><ellipse cx="70" cy="320" rx="46" ry="26" fill="#BDE8C9" stroke="${INK}" stroke-width="3"/>`;
    const p = pins.map(([x, y], i) => `<g class="map-pin${i === active ? ' on' : ''}" data-i="${i}" transform="translate(${x} ${y})"><ellipse cy="3" rx="13" ry="4" fill="#000" opacity=".25"/>
        <g class="pin-body"><path d="M0 0C-12 -14 -20 -24 -20 -36A20 20 0 1 1 20 -36C20 -24 12 -14 0 0Z" fill="#FF5E3A" stroke="${INK}" stroke-width="3.5"/><circle cy="-36" r="8" fill="#FFF3D6" stroke="${INK}" stroke-width="3"/></g></g>`).join('');
    return svg('0 0 600 380', `<rect width="600" height="380" fill="#FFF3D6"/>${roads}${parks}${water}${p}`, 'map-svg');
  }

  window.TALG_ART = { bar, cube, svg, map, shade };
})();
