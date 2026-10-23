/* NILO gelato — behaviour shared by every page. Load it last: page scripts build their DOM first,
   then this file draws all [data-art], wires the menu, header and reveals, and fires `nilo:ready`. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.NILO_ART, UI = window.NILO_DATA.UI;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- draw art ---------- */
  $$('[data-art]').forEach((el) => {
    A.render(el);
    const s = el.querySelector('svg.art-card');
    if (s) s.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  });
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- page load ---------- */
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1400))]).then(() => {
    // a timer, not rAF: rAF never fires in a background tab, which would leave the page hidden
    setTimeout(() => {
      document.body.classList.remove('is-loading');
      // Arabic circle texts: scale the font so the phrase fills the ring without letter spacing
      $$('text.ring-fit').forEach((t) => {
        const len = t.getComputedTextLength(), fs = parseFloat(t.getAttribute('font-size'));
        if (len) t.setAttribute('font-size', Math.min(fs * (+t.dataset.len / len), 26).toFixed(2));
      });
      dispatchEvent(new Event('nilo:ready'));
    }, 40);
  });

  /* ---------- menu ---------- */
  const hdr = $('#hdr'), menu = $('#menu'), menuBtn = $('#menuBtn'), menuLabel = $('.menu-btn-label');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? UI.closeAria : UI.openAria);
    menu.setAttribute('aria-hidden', String(!open));
    menuLabel.textContent = open ? UI.close : UI.menu;
    if (open) setTimeout(() => $('a', menu).focus({ preventScroll: true }), 350);
    else hdr.classList.remove('hide');
  }
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });

  /* ---------- header hide/show + footer word fill ---------- */
  const ftrWord = $('.ftr-word');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    if (!document.body.classList.contains('menu-open')) hdr.classList.toggle('hide', y > 140 && y > lastY);
    lastY = y;
    if (ftrWord) {
      const fw = ftrWord.getBoundingClientRect();
      ftrWord.style.setProperty('--fp', clamp((vh - fw.top) / (fw.height + vh * 0.25)).toFixed(3));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- reveal on view ---------- */
  $$('[data-split] .ln').forEach((ln, i) => $$(':scope > span', ln).forEach((s) => s.style.setProperty('--i', i)));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split], .doodle-arrow').forEach((el) => {
    const sibs = $$(':scope > [data-reveal]', el.parentElement);
    if (sibs.length > 1) el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 8) * 70}ms`;
    io.observe(el);
  });

  /* ---------- newsletter (front-end only: hook it to your email tool) ---------- */
  const form = $('#news');
  if (form) {
    const input = $('#newsEmail'), msg = $('#newsMsg');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      input.classList.toggle('err', !ok);
      msg.classList.toggle('err', !ok);
      msg.textContent = ok ? UI.ok : UI.bad;
      if (ok) form.reset();
    });
  }
})();
