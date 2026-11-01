/* OVERFLOW Ops — small SVG/HTML chart kit. Follows the dashboard's data-viz rules: thin marks, 2px lines, <=24px bars with
   4px rounded data-ends, 2px surface gaps, hairline grids, legends for 2+ series, a crosshair or per-mark tooltip on
   every chart, and text in text tokens (never the series colour). Colours come from CSS custom properties. */
window.OF_CHARTS = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || v;
  const col = (c) => (c && c.startsWith('var(') ? css(c.slice(4, -1)) : c);
  const f1 = (n) => (Math.round(n * 10) / 10).toString();

  // ---------- one shared tooltip (built with textContent: labels may be user data)
  let tt;
  function tip() {
    if (tt) return tt;
    tt = document.createElement('div'); tt.className = 'tt'; tt.setAttribute('role', 'status'); document.body.appendChild(tt); return tt;
  }
  function showTip(x, y, title, rows) {
    const t = tip(); t.textContent = '';
    const h = document.createElement('p'); h.className = 'tt-h'; h.textContent = title; t.appendChild(h);
    rows.forEach((r) => {
      const row = document.createElement('p'); row.className = 'tt-r';
      if (r.color) { const k = document.createElement('i'); k.className = r.dash ? 'tt-k dash' : 'tt-k'; k.style.setProperty('--c', col(r.color)); row.appendChild(k); }
      const v = document.createElement('b'); v.textContent = r.value; row.appendChild(v);
      if (r.name) { const n = document.createElement('span'); n.textContent = r.name; row.appendChild(n); }
      t.appendChild(row);
    });
    t.classList.add('on');
    const w = t.offsetWidth, hh = t.offsetHeight, px = x + 16 + w > innerWidth - 8 ? x - w - 16 : x + 16, py = Math.max(8, Math.min(innerHeight - hh - 8, y - hh / 2));
    t.style.transform = `translate(${px}px, ${py}px)`;
  }
  const hideTip = () => { if (tt) tt.classList.remove('on'); };

  // ---------- scales
  function nice(max) {
    if (max <= 0) return { max: 1, step: 0.25 };
    const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    return { max: Math.ceil(max / step) * step, step };
  }
  const compact = (v) => (Math.abs(v) >= 1e6 ? `${f1(v / 1e6)}M` : Math.abs(v) >= 1e3 ? `${f1(v / 1e3)}K` : `${Math.round(v)}`);
  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function frame(host, H) {
    host.textContent = '';
    const W = Math.max(240, host.clientWidth);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }); host.appendChild(svg);
    return { svg, W, H };
  }
  // keep charts sized to their card
  const observed = new WeakMap();
  function responsive(host, draw) {
    draw();
    if (observed.has(host)) { observed.get(host).draw = draw; return; }
    const rec = { draw, w: host.clientWidth };
    const ro = new ResizeObserver(() => { if (Math.abs(host.clientWidth - rec.w) > 4) { rec.w = host.clientWidth; rec.draw(); } });
    ro.observe(host); observed.set(host, rec);
  }
  function yAxis(svg, m, W, H, ys, fmt) {
    const g = el('g', {}, svg);
    for (let v = 0; v <= ys.max + 1e-9; v += ys.step) {
      const y = m.t + (H - m.t - m.b) * (1 - v / ys.max);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: css('--grid'), 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
      const t = el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', class: 'ax' }, g); t.textContent = (fmt || compact)(v);
    }
    el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: css('--axis'), 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
  }

  /* line / area over time. cfg: { x: labels[], series: [{ name, values, color, dash, area }], fmt, xfmt, height } */
  function line(host, cfg) {
    responsive(host, () => {
      const H = cfg.height || 260, { svg, W } = frame(host, H), m = { l: 52, r: 18, t: 12, b: 28 };
      const all = cfg.series.flatMap((s) => s.values), ys = nice(Math.max(...all, 1)), n = cfg.x.length;
      const X = (i) => m.l + (W - m.l - m.r) * (n === 1 ? 0.5 : i / (n - 1)), Y = (v) => m.t + (H - m.t - m.b) * (1 - v / ys.max);
      yAxis(svg, m, W, H, ys, cfg.yfmt);
      const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - m.l) / 90))));
      cfg.x.forEach((lab, i) => { if (i % every === 0 || i === n - 1) { const t = el('text', { x: X(i), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'ax' }, svg); t.textContent = cfg.xfmt ? cfg.xfmt(lab) : lab; } });
      [...cfg.series].reverse().forEach((s) => {
        const pts = s.values.map((v, i) => `${f1(X(i))},${f1(Y(v))}`);
        if (s.area) el('path', { d: `M${X(0)},${Y(0)}L${pts.join('L')}L${X(n - 1)},${Y(0)}Z`, fill: col(s.color), opacity: 0.1 }, svg);
        el('path', { d: `M${pts.join('L')}`, fill: 'none', stroke: col(s.color), 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash ? '5 5' : 'none' }, svg);
      });
      const main = cfg.series[0], last = main.values.length - 1;
      el('circle', { cx: X(last), cy: Y(main.values[last]), r: 4.5, fill: col(main.color), stroke: css('--surface'), 'stroke-width': 2 }, svg);
      // crosshair layer
      const cross = el('line', { y1: m.t, y2: H - m.b, stroke: css('--muted'), 'stroke-width': 1, opacity: 0 }, svg);
      const dots = cfg.series.map((s) => el('circle', { r: 4.5, fill: col(s.color), stroke: css('--surface'), 'stroke-width': 2, opacity: 0 }, svg));
      const hit = el('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent', tabindex: 0, 'aria-label': cfg.label || 'Chart' }, svg);
      let cur = last;
      const at = (i, cx, cy) => {
        cur = Math.max(0, Math.min(n - 1, i)); cross.setAttribute('x1', X(cur)); cross.setAttribute('x2', X(cur)); cross.setAttribute('opacity', 1);
        dots.forEach((d, k) => { d.setAttribute('cx', X(cur)); d.setAttribute('cy', Y(cfg.series[k].values[cur])); d.setAttribute('opacity', 1); });
        const r = svg.getBoundingClientRect();
        showTip(cx != null ? cx : r.left + X(cur), cy != null ? cy : r.top + Y(main.values[cur]), cfg.tipTitle ? cfg.tipTitle(cur) : String(cfg.x[cur]),
          cfg.series.map((s) => ({ color: s.color, dash: s.dash, value: (cfg.fmt || compact)(s.values[cur]), name: s.name })));
      };
      const off = () => { cross.setAttribute('opacity', 0); dots.forEach((d) => d.setAttribute('opacity', 0)); hideTip(); };
      hit.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); at(Math.round(((e.clientX - r.left - m.l) / (W - m.l - m.r)) * (n - 1)), e.clientX, e.clientY); });
      hit.addEventListener('pointerleave', off); hit.addEventListener('blur', off);
      hit.addEventListener('focus', () => at(cur));
      hit.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); at(cur + (e.key === 'ArrowRight' ? 1 : -1)); } });
    });
  }

  /* columns (single series, or stacked with `stack`). cfg: { labels, values | stack: [{ name, values, color }], color, fmt, height, label } */
  function columns(host, cfg) {
    responsive(host, () => {
      const H = cfg.height || 220, { svg, W } = frame(host, H), m = { l: 44, r: 10, t: 16, b: 26 };
      const series = cfg.stack || [{ name: cfg.name || '', values: cfg.values, color: cfg.color || 'var(--s1)' }];
      const n = cfg.labels.length, sums = cfg.labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
      const ys = nice(Math.max(...sums, 1)), band = (W - m.l - m.r) / n, bw = Math.min(24, band * 0.62);
      const Y = (v) => m.t + (H - m.t - m.b) * (1 - v / ys.max);
      yAxis(svg, m, W, H, ys, cfg.yfmt);
      const every = Math.max(1, Math.ceil(n / Math.floor((W - m.l) / 44)));
      const peak = sums.indexOf(Math.max(...sums));
      cfg.labels.forEach((lab, i) => {
        const cx = m.l + band * (i + 0.5); let base = 0; const g = el('g', { class: 'bar' }, svg);
        series.forEach((s, k) => {
          const v = s.values[i]; if (v <= 0) return;
          const top = k === series.length - 1 || series.slice(k + 1).every((x) => x.values[i] <= 0);
          const y0 = Y(base) - (base > 0 ? 2 : 0), y1 = Y(base + v), h = Math.max(0, y0 - y1), r = top ? Math.min(4, h, bw / 2) : 0;
          const x0 = cx - bw / 2, x1 = cx + bw / 2;
          el('path', { d: `M${f1(x0)},${f1(y0)}V${f1(y1 + r)}Q${f1(x0)},${f1(y1)} ${f1(x0 + r)},${f1(y1)}H${f1(x1 - r)}Q${f1(x1)},${f1(y1)} ${f1(x1)},${f1(y1 + r)}V${f1(y0)}Z`, fill: col(s.color) }, g);
          base += v;
        });
        if (i % every === 0) { const t = el('text', { x: cx, y: H - 8, 'text-anchor': 'middle', class: 'ax' }, svg); t.textContent = cfg.xfmt ? cfg.xfmt(lab) : lab; }
        if (cfg.peakLabel && i === peak) { const t = el('text', { x: cx, y: Y(sums[i]) - 6, 'text-anchor': 'middle', class: 'ax strong' }, svg); t.textContent = (cfg.fmt || compact)(sums[i]); }
        const hit = el('rect', { x: cx - band / 2, y: m.t, width: band, height: H - m.t - m.b, fill: 'transparent', tabindex: 0, 'aria-label': `${lab}: ${(cfg.fmt || compact)(sums[i])}` }, svg);
        const show = (e) => {
          g.classList.add('hot'); const r = hit.getBoundingClientRect();
          showTip(e && e.clientX != null ? e.clientX : r.left + r.width / 2, e && e.clientY != null ? e.clientY : r.top + 30, cfg.tipTitle ? cfg.tipTitle(i) : String(lab),
            (cfg.stack ? [...series].reverse() : series).map((s) => ({ color: s.color, value: (cfg.fmt || compact)(s.values[i]), name: s.name })).concat(cfg.stack ? [{ value: (cfg.fmt || compact)(sums[i]), name: 'Total' }] : []));
        };
        const hide = () => { g.classList.remove('hot'); hideTip(); };
        hit.addEventListener('pointermove', show); hit.addEventListener('pointerleave', hide); hit.addEventListener('focus', () => show()); hit.addEventListener('blur', hide);
      });
    });
  }

  /* heatmap (sequential, one hue). cfg: { rows, cols, values[r][c], fmt, ramp: [hex...] } */
  function heat(host, cfg) {
    responsive(host, () => {
      const rows = cfg.rows.length, cols = cfg.cols.length, m = { l: 40, t: 4, b: 24, r: 4 };
      const W = Math.max(260, host.clientWidth), cw = (W - m.l - m.r) / cols, ch = Math.min(34, Math.max(20, cw * 0.8)), H = m.t + rows * ch + m.b;
      const { svg } = frame(host, H), flat = cfg.values.flat(), max = Math.max(...flat, 1), ramp = cfg.ramp;
      cfg.values.forEach((row, ri) => {
        const t = el('text', { x: m.l - 8, y: m.t + ri * ch + ch / 2 + 4, 'text-anchor': 'end', class: 'ax' }, svg); t.textContent = cfg.rows[ri];
        row.forEach((v, ci) => {
          const step = v <= 0 ? 0 : Math.min(ramp.length - 1, Math.floor((v / max) * (ramp.length - 1) + 0.0001));
          const x = m.l + ci * cw, y = m.t + ri * ch;
          const c = el('rect', { x: x + 1, y: y + 1, width: Math.max(0, cw - 2), height: ch - 2, rx: 3, fill: v <= 0 ? css('--grid') : ramp[step], tabindex: 0, class: 'cell', 'aria-label': `${cfg.rows[ri]} ${cfg.cols[ci]}: ${cfg.fmt(v)}` }, svg);
          const show = (e) => { const r = c.getBoundingClientRect(); showTip(e && e.clientX != null ? e.clientX : r.right, e && e.clientY != null ? e.clientY : r.top, `${cfg.rows[ri]} · ${cfg.cols[ci]}`, [{ value: cfg.fmt(v), name: cfg.unit || '' }]); };
          c.addEventListener('pointermove', show); c.addEventListener('pointerleave', hideTip); c.addEventListener('focus', () => show()); c.addEventListener('blur', hideTip);
        });
      });
      cfg.cols.forEach((lab, ci) => { if (ci % 2 === 0) { const t = el('text', { x: m.l + ci * cw + cw / 2, y: H - 6, 'text-anchor': 'middle', class: 'ax' }, svg); t.textContent = lab; } });
    });
  }

  /* horizontal bars as HTML rows (single series: no legend; value at the tip). rows: [{ label, value, sub }] */
  function hbars(host, rows, cfg = {}) {
    const max = Math.max(...rows.map((r) => r.value), 1);
    host.textContent = '';
    const list = document.createElement('div'); list.className = 'hb';
    rows.forEach((r) => {
      const row = document.createElement('div'); row.className = 'hb-row'; row.tabIndex = 0;
      const lab = document.createElement('span'); lab.className = 'hb-l'; lab.textContent = r.label;
      if (r.sub) { const s = document.createElement('small'); s.textContent = r.sub; lab.appendChild(s); }
      const track = document.createElement('span'); track.className = 'hb-t';
      const bar = document.createElement('i'); bar.style.width = `${(r.value / max) * 100}%`; bar.style.background = col(cfg.color || 'var(--s1)'); track.appendChild(bar);
      const val = document.createElement('b'); val.className = 'hb-v'; val.textContent = (cfg.fmt || compact)(r.value);
      row.append(lab, track, val);
      const show = (e) => { const b = row.getBoundingClientRect(); showTip(e && e.clientX != null ? e.clientX : b.right - 60, e && e.clientY != null ? e.clientY : b.top + 10, r.label, [{ value: (cfg.fmt || compact)(r.value), name: cfg.unit || '' }].concat(r.extra || [])); };
      row.addEventListener('pointermove', show); row.addEventListener('pointerleave', hideTip); row.addEventListener('focus', () => show()); row.addEventListener('blur', hideTip);
      list.appendChild(row);
    });
    host.appendChild(list);
  }

  /* part-to-whole: one 100% bar with 2px gaps + legend with labels and shares. parts: [{ name, value, color }] */
  function share(host, parts, cfg = {}) {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    host.textContent = '';
    const bar = document.createElement('div'); bar.className = 'sh';
    parts.forEach((p) => {
      const seg = document.createElement('i'); seg.style.flexGrow = String(Math.max(p.value, 0.0001)); seg.style.background = col(p.color); seg.tabIndex = 0;
      const pct = Math.round((p.value / total) * 100);
      const show = (e) => { const b = seg.getBoundingClientRect(); showTip(e && e.clientX != null ? e.clientX : b.left + b.width / 2, e && e.clientY != null ? e.clientY : b.top, p.name, [{ color: p.color, value: `${pct}%`, name: `${(cfg.fmt || compact)(p.value)} ${cfg.unit || ''}` }]); };
      seg.addEventListener('pointermove', show); seg.addEventListener('pointerleave', hideTip); seg.addEventListener('focus', () => show()); seg.addEventListener('blur', hideTip);
      bar.appendChild(seg);
    });
    const leg = document.createElement('ul'); leg.className = 'legend';
    parts.forEach((p) => {
      const li = document.createElement('li'); const sw = document.createElement('i'); sw.style.background = col(p.color);
      const n = document.createElement('span'); n.textContent = p.name;
      const v = document.createElement('b'); v.textContent = `${Math.round((p.value / total) * 100)}%`;
      li.append(sw, n, v); leg.appendChild(li);
    });
    host.append(bar, leg);
  }

  /* 12-point sparkline: history in the de-emphasis hue, the current point in the accent */
  function spark(values, accent = 'var(--s1)') {
    const W = 96, H = 28, max = Math.max(...values, 1), min = Math.min(...values, 0), n = values.length;
    const X = (i) => 2 + (W - 4) * (i / (n - 1)), Y = (v) => H - 3 - (H - 6) * ((v - min) / (max - min || 1));
    const d = values.map((v, i) => `${i ? 'L' : 'M'}${f1(X(i))},${f1(Y(v))}`).join('');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="${col('var(--muted)')}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${f1(X(n - 1))}" cy="${f1(Y(values[n - 1]))}" r="3.5" fill="${col(accent)}" stroke="${col('var(--surface)')}" stroke-width="2"/></svg>`;
  }
  return { line, columns, heat, hbars, share, spark, compact, hideTip };
})();
