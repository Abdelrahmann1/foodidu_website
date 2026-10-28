/* NILO gelato — home page: tub ring, featured-flavor scene, lineup, story parallax, wipe, social reel */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.NILO_ART, D = window.NILO_DATA;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FEATURED = D.AR ? [
    { label: 'جديد', name: 'مانجا', bg: '#FFB627', desc: 'مانجا عويس المصرية، بتتخفق في نفس الصبح اللي بتوصل فيه. شمس في معلقة.' },
    { label: 'كلاسيك قاهري', name: 'رز بلبن', bg: '#FFD9C7', desc: 'جيلاتو رز بلبن بلمسة ماء زهر وشوية قرفة على الوش. تيتا موافقة.' },
    { label: 'المفضّلة', name: 'فستق', bg: '#B5CF6B', desc: 'عجينة فستق محمّص وقرصة ملح بحري، ومفيش أخضر جاي من إزازة.' },
    { label: 'من غير لبن', name: 'كركديه', bg: '#FF8FA3', desc: 'سوربيه كركديه بالليمون على عصاية: حامض، أحمر ياقوتي، وأبرد من تكييف في أغسطس.' },
  ] : [
    { label: 'New', name: 'Mango', bg: '#FFB627', desc: "Egypt's favorite summer mango, churned the same morning it lands. Sunshine with a spoon." },
    { label: 'Cairo classic', name: 'Roz bel Laban', bg: '#FFD9C7', desc: 'Rice-pudding gelato with a whisper of orange blossom and a dusting of cinnamon. Grandma approved.' },
    { label: 'Fan favorite', name: 'Pistachio', bg: '#B5CF6B', desc: 'Roasted pistachio paste, a pinch of sea salt and nothing green out of a bottle.' },
    { label: 'Dairy-free', name: 'Karkadeh', bg: '#FF8FA3', desc: 'Hibiscus and lime sorbet on a stick: tart, ruby red and colder than an August AC.' },
  ];
  const REEL_CAPS = D.AR
    ? ['الزمالك، 9 بالليل', 'يوم التلات سكوبات', 'أول خروجة', 'ليلة العلبة', 'عصاية البحر', 'معلقة واحدة بس', 'وحش الكوكيز', 'كوباية قوس قزح']
    : ['Zamalek, 9pm', 'Triple scoop day', 'First date cone', 'Pint night', 'Beach stick', 'One spoon only', 'Cookie monster', 'Rainbow cup'];
  const REEL_TILT = [-4, 3, -2, 5, -5, 2, -3, 4];

  /* ---------- hero ring of tubs ---------- */
  const ring = $('#ring');
  ['mango', 'pistachio', 'roz', 'karkadeh', 'chocolate', 'strawberry', 'lemonmint', 'coffee', 'guava', 'fior', 'dates', 'cookies'].forEach((k, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2, el = document.createElement('span'), art = A.tub({ flavor: k, seed: i * 7 + 3 });
    el.className = 'tub';
    el.style.left = `${50 + 41 * Math.cos(a)}%`;
    el.style.top = `${50 + 41 * Math.sin(a)}%`;
    el.style.setProperty('--i', i);
    el.style.setProperty('--rot', `${(i * 47) % 360}deg`);
    el.innerHTML = A.svg(art.vb, art.body);
    ring.appendChild(el);
  });

  /* ---------- lineup grid + marquee ---------- */
  $('#lineupGrid').innerHTML = D.FLAVORS.map((f, i) => {
    const art = A.tub({ flavor: f.key, seed: 90 + i });
    return `<li class="lu${f.soldOut ? ' out' : ''}" data-reveal><span class="tag" style="--tag:${f.bg}">${D.t(f.tag)}</span>${f.soldOut ? `<span class="out-tag">${D.UI.soldOut}</span>` : ''}<div class="lu-art">${A.svg(art.vb, art.body)}</div><h3>${D.t(f.name)}</h3><p>${D.t(f.short)}</p></li>`;
  }).join('');
  const names = D.FLAVORS.map((f) => `<span>${D.t(f.name)}<i></i></span>`).join('');
  $('#marquee').innerHTML = names + names;

  /* ---------- featured flavors (pinned, scroll-driven) ---------- */
  const flv = $('#flavors'), stage = $('#flvStage'), arts = $$('.flv-art'), nameEl = $('#flvName'), labelEl = $('#flvLabel'),
    descEl = $('#flvDesc'), numEl = $('#flvNum'), dots = $$('#flvDots li'), scene = $('#flvScene');
  let cur = -1;
  function fitName() {
    nameEl.style.fontSize = '';
    const max = parseFloat(getComputedStyle(nameEl).fontSize), avail = stage.clientWidth * 0.92, w = nameEl.getBoundingClientRect().width;
    if (w > avail) nameEl.style.fontSize = `${(max * avail) / w}px`;
  }
  function showFlavor(i) {
    if (i === cur) return;
    const prev = cur, d = FEATURED[i];
    cur = i;
    flv.style.setProperty('--flv-bg', d.bg);
    labelEl.textContent = d.label;
    labelEl.classList.add('swap'); void labelEl.offsetWidth; labelEl.classList.remove('swap');
    // Arabic letters must stay joined, so Arabic animates word by word instead of letter by letter
    nameEl.innerHTML = D.AR
      ? d.name.split(' ').map((w, k) => `<span class="ch" style="--i:${k * 4}">${w}</span>`).join(' ')
      : [...d.name].map((c, k) => (c === ' ' ? '<span class="ch">&nbsp;</span>' : `<span class="ch" style="--i:${k}">${c}</span>`)).join('');
    nameEl.setAttribute('aria-label', d.name);
    fitName();
    descEl.textContent = d.desc;
    descEl.classList.remove('swap'); void descEl.offsetWidth; descEl.classList.add('swap');
    numEl.textContent = String(i + 1).padStart(2, '0');
    dots.forEach((x, k) => x.classList.toggle('on', k === i));
    arts.forEach((a, k) => { a.classList.toggle('is-on', k === i); a.classList.toggle('is-out', k === prev && prev !== i); });
  }
  showFlavor(0);
  addEventListener('nilo:ready', fitName);

  // tilt the featured art toward the pointer
  stage.addEventListener('pointermove', (e) => {
    if (reduced || e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    scene.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 26}deg`);
    scene.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -18}deg`);
  });
  stage.addEventListener('pointerleave', () => { scene.style.setProperty('--rx', '0deg'); scene.style.setProperty('--ry', '0deg'); });

  /* ---------- scroll-linked effects ---------- */
  const story = $('#story'), wipe = $('.wipe');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    const fr = flv.getBoundingClientRect(), total = flv.offsetHeight - vh, p = clamp(-fr.top / total);
    if (fr.bottom > 0 && fr.top < vh) {
      flv.style.setProperty('--p', p.toFixed(4));
      scene.style.setProperty('--sway', (Math.sin(p * Math.PI * 8) * 6).toFixed(2));
      showFlavor(Math.min(FEATURED.length - 1, Math.floor(p * FEATURED.length * 0.9999)));
    }
    const sr = story.getBoundingClientRect();
    if (sr.bottom > 0 && sr.top < vh) story.style.setProperty('--sy', (sr.top + sr.height / 2 - vh / 2).toFixed(1) * -1);
    const wr = wipe.getBoundingClientRect();
    wipe.style.setProperty('--w', clamp((vh - wr.top) / (vh * 0.75)).toFixed(3));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { fitName(); onScroll(); });
  onScroll();

  /* ---------- social reel: auto-scroll + drag ---------- */
  const reel = $('#reel'), track = $('#reelTrack');
  $$('.reel-card', track).forEach((c, i) => {
    c.style.setProperty('--r', `${REEL_TILT[i % REEL_TILT.length]}deg`);
    const cap = document.createElement('figcaption');
    cap.textContent = REEL_CAPS[i % REEL_CAPS.length];
    c.appendChild(cap);
  });
  // duplicated before site.js draws the art, so every copy gets its own SVG ids
  track.insertAdjacentHTML('beforeend', track.innerHTML);
  $$('.reel-card', track).slice(REEL_CAPS.length).forEach((c) => c.setAttribute('aria-hidden', 'true'));
  let x = 0, half = 0, drag = null, hover = false, visible = false, last = performance.now();
  const measure = () => { half = track.scrollWidth / 2; };
  addEventListener('nilo:ready', measure);
  addEventListener('resize', measure);
  measure();
  function wrap() { if (half) { while (x <= -half) x += half; while (x > 0) x -= half; } }
  function tick(now) {
    const dt = Math.min(64, now - last);
    last = now;
    if (!drag && !hover && !reduced) x -= dt * 0.045;
    wrap();
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    if (visible) requestAnimationFrame(tick);
  }
  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !was) { last = performance.now(); requestAnimationFrame(tick); }
  }).observe(reel);
  reel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  reel.addEventListener('pointerleave', () => { hover = false; });
  reel.addEventListener('pointerdown', (e) => {
    drag = { sx: e.clientX, x0: x };
    reel.setPointerCapture(e.pointerId);
    reel.classList.add('drag');
  });
  reel.addEventListener('pointermove', (e) => { if (drag) x = drag.x0 + (e.clientX - drag.sx); });
  const endDrag = () => { drag = null; reel.classList.remove('drag'); };
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);
  reel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') x += 240; // the track always runs left-to-right, even on the Arabic page
    else if (e.key === 'ArrowRight') x -= 240;
    else return;
    e.preventDefault();
    if (!visible || reduced) { wrap(); track.style.transform = `translate3d(${x}px,0,0)`; }
  });
})();
