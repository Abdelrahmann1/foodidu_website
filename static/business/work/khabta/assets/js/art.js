/* KHABTA — illustration engine: burger layers (side view), scooter, spatula. All inline SVG. */
(function () {
  const INK = '#1B1B1F';
  const f1 = (n) => n.toFixed(1);
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const SW = 'stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"';

  function bumpy(r, y, w, h, amp, n) {  // a lumpy band from x=-w..w, top at y-h, bottom at y
    let d = `M${-w} ${f1(y)}`;
    for (let i = 0; i <= n; i++) { const x = -w + (2 * w * i) / n; d += `L${f1(x)} ${f1(y - h + (r() - 0.5) * amp)}`; }
    return d + `L${w} ${f1(y)}Q0 ${f1(y + amp * 0.6)} ${-w} ${f1(y)}Z`;
  }
  function dots(r, n, x0, x1, y0, y1, col, rad) {
    let s = '';
    for (let i = 0; i < n; i++) s += `<circle cx="${f1(x0 + r() * (x1 - x0))}" cy="${f1(y0 + r() * (y1 - y0))}" r="${f1(rad * (0.6 + r() * 0.7))}" fill="${col}"/>`;
    return s;
  }

  // every layer draws itself with its bottom edge at y=0 (growing upwards) and returns its height
  const L = {
    bunB: () => ({ h: 46, s: `<path d="M-142 -46H142V-14Q142 0 120 0H-120Q-142 0 -142 -14Z" fill="#E7A04E" ${SW}/><path d="M-138 -40H138" stroke="#B9702B" stroke-width="7" stroke-linecap="round"/>` }),
    bunT: (r) => {
      let seeds = '';
      for (let i = 0; i < 14; i++) { const x = -110 + r() * 220, y = -84 + Math.abs(x) * 0.28 + r() * 40; seeds += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="6" ry="3.2" transform="rotate(${Math.round(r() * 60 - 30)} ${f1(x)} ${f1(y)})" fill="#FFF3D6" stroke="${INK}" stroke-width="1.5"/>`; }
      return { h: 104, s: `<path d="M-150 0V-14Q-150 -104 0 -104Q150 -104 150 -14V0Z" fill="#F0A54A" ${SW}/>
        <path d="M-104 -70Q-70 -94 -20 -96" fill="none" stroke="#FFD08A" stroke-width="10" stroke-linecap="round"/>${seeds}
        <path d="M-146 -6H146" stroke="#C47A30" stroke-width="7" stroke-linecap="round"/>` };
    },
    patty: (r) => ({ h: 30, s: `<path d="${bumpy(r, 0, 158, 30, 10, 22)}" fill="#6B3A22" ${SW}/>${dots(r, 18, -140, 140, -24, -6, '#4A2716', 3)}<path d="M-120 -22Q-40 -30 60 -24" fill="none" stroke="#8C5434" stroke-width="5" stroke-linecap="round"/>` }),
    chicken: (r) => ({ h: 42, s: `<path d="${bumpy(r, 0, 156, 42, 14, 18)}" fill="#D99A3B" ${SW}/>${dots(r, 26, -140, 140, -36, -8, '#B87A26', 3.5)}` }),
    falafel: (r) => ({ h: 34, s: `<path d="${bumpy(r, 0, 146, 34, 12, 18)}" fill="#8A6A33" ${SW}/>${dots(r, 22, -130, 130, -28, -6, '#5E8C3A', 3)}${dots(r, 10, -130, 130, -28, -6, '#C49A54', 2.5)}` }),
    cheese: () => cheese('#FFB81C', '#E99A00'),
    jack: (r) => { const c = cheese('#FFE29A', '#E8C66A'); c.s += dots(r, 12, -130, 130, -9, -3, '#E2433B', 2); return c; },
    swiss: () => { const c = cheese('#FFEAA8', '#E8CF7A'); c.s += [-90, -20, 60, 110].map((x) => `<ellipse cx="${x}" cy="-5" rx="9" ry="3" fill="#E8CF7A"/>`).join(''); return c; },
    lettuce: () => { let d = 'M-160 0'; for (let x = -160; x <= 160; x += 20) d += `Q${x + 10} -26 ${x + 20} -8`; return { h: 16, s: `<path d="${d}V2H-160Z" fill="#7CC242" ${SW}/>` }; },
    tomato: () => ({ h: 18, s: `<rect x="-130" y="-18" width="124" height="18" rx="9" fill="#E8432E" ${SW}/><rect x="6" y="-18" width="124" height="18" rx="9" fill="#E8432E" ${SW}/><path d="M-110 -9H-26M26 -9H110" stroke="#FF8A6E" stroke-width="5" stroke-linecap="round"/>` }),
    pickles: () => ({ h: 14, s: [-100, -34, 32, 98].map((x) => `<ellipse cx="${x}" cy="-7" rx="34" ry="8" fill="#8FB339" ${SW}/><path d="M${x - 20} -7H${x + 20}" stroke="#C6DE7A" stroke-width="3" stroke-dasharray="4 5"/>`).join('') }),
    onion: () => ({ h: 10, s: [-90, 0, 90].map((x) => `<ellipse cx="${x}" cy="-5" rx="46" ry="6" fill="#F6E9F7" stroke="#9B5FA8" stroke-width="4"/>`).join('') }),
    jalapeno: () => ({ h: 12, s: [-110, -55, 0, 55, 110].map((x) => `<ellipse cx="${x}" cy="-6" rx="24" ry="6" fill="#3E8E3A" ${SW}/><ellipse cx="${x}" cy="-6" rx="12" ry="2.6" fill="#BFE39A"/>`).join('') }),
    mushroom: () => ({ h: 14, s: [-105, -35, 35, 105].map((x) => `<path d="M${x - 32} 0Q${x - 32} -16 ${x} -16Q${x + 32} -16 ${x + 32} 0Z" fill="#A4744C" ${SW}/>`).join('') }),
    sauce: () => sauce('#F57C2B'),
    chili: () => sauce('#E8432E'),
    garlic: () => sauce('#FFF4D6'),
    tahini: () => sauce('#E9CF9E'),
  };
  function cheese(col, dark) {
    let d = 'M-150 -10H150V0';
    for (const [x, len] of [[120, 26], [70, 14], [10, 34], [-50, 18], [-110, 30]]) d += `L${x + 14} 0Q${x + 14} ${len} ${x} ${len}Q${x - 14} ${len} ${x - 14} 0`;
    d += 'L-150 0Z';
    return { h: 10, s: `<path d="${d}" fill="${col}" ${SW}/><path d="M-140 -5H140" stroke="${dark}" stroke-width="3" opacity=".6"/>` };
  }
  function sauce(col) {
    let d = 'M-146 -8H146V0';
    for (const [x, len] of [[100, 18], [20, 26], [-70, 14]]) d += `L${x + 10} 0Q${x + 10} ${len} ${x} ${len}Q${x - 10} ${len} ${x - 10} 0`;
    return { h: 8, s: `<path d="${d}L-146 0Z" fill="${col}" ${SW}/>` };
  }

  // returns layers with their resting y (bottom edge, negative = up) so callers can explode them
  function stack(keys, seed) {
    const r = rng(seed || 3);
    let y = 0; const out = [];
    for (const k of keys) {
      const l = L[k](r);
      out.push({ key: k, y, h: l.h, s: l.s });
      y -= l.h - (k === 'cheese' || k === 'jack' || k === 'swiss' || k === 'sauce' || k === 'chili' || k === 'garlic' || k === 'tahini' ? 2 : 0);
    }
    return { layers: out, height: -y };
  }
  function burger(keys, o = {}) {
    const st = stack(keys, o.seed), gap = o.gap || 0, H = st.height + gap * keys.length;
    const body = `<ellipse cx="0" cy="12" rx="150" ry="14" fill="#000" opacity=".2"/>` +
      st.layers.map((l, i) => `<g class="ly" data-i="${i}" data-key="${l.key}" transform="translate(0 ${f1(l.y - gap * i)})">${l.s}</g>`).join('');
    return { vb: `-175 ${f1(-H - 20)} 350 ${f1(H + 50)}`, body, layers: st.layers, height: st.height };
  }

  function scooter(word) {
    return { vb: '-150 -150 300 190', body: `<ellipse cx="0" cy="34" rx="120" ry="8" fill="#000" opacity=".2"/>
      <circle cx="-82" cy="10" r="24" fill="#FFF0D6" ${SW}/><circle cx="-82" cy="10" r="8" fill="${INK}"/>
      <circle cx="86" cy="10" r="24" fill="#FFF0D6" ${SW}/><circle cx="86" cy="10" r="8" fill="${INK}"/>
      <path d="M-110 -6Q-100 -40 -60 -40H20L60 -6H110Q118 -6 112 6H-112Z" fill="#FF6A13" ${SW}/>
      <path d="M60 -6L74 -60H94" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="-140" y="-118" width="96" height="80" rx="12" fill="#FFC21A" ${SW}/>
      <text x="-92" y="-70" text-anchor="middle" font-family="Dela Gothic One, Lemonada, sans-serif" font-size="${word.length > 4 ? 15 : 22}" fill="${INK}">${word}</text>
      <path d="M-10 -40Q-8 -86 22 -96" fill="none" stroke="#2E5E3A" stroke-width="16" stroke-linecap="round"/>
      <circle cx="30" cy="-110" r="22" fill="#2E5E3A" ${SW}/><path d="M14 -112H46" stroke="#FFF0D6" stroke-width="6" stroke-linecap="round"/>
      <path d="M18 -86L64 -64" stroke="#2E5E3A" stroke-width="12" stroke-linecap="round"/>` };
  }

  const spatula = { vb: '-120 -40 240 260', body: `<rect x="-90" y="150" width="180" height="22" rx="6" fill="#C9CFD6" ${SW}/>
      <rect x="-12" y="20" width="24" height="132" rx="6" fill="#9AA3AD" ${SW}/>
      <rect x="-22" y="-30" width="44" height="64" rx="14" fill="#2E5E3A" ${SW}/>` };

  function svg(vb, body, cls) { return `<svg class="${cls || ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`; }

  window.KH_ART = { burger, stack, scooter, spatula, svg, INK };
})();
