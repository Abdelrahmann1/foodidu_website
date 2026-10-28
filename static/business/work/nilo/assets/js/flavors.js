/* NILO gelato — flavors page: filter chips, flavor cards, details dialog */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = window.NILO_ART, D = window.NILO_DATA, UI = D.UI;

  const grid = $('#flGrid'), bar = $('#flFilters'), count = $('#flCount'), dlg = $('#flDialog');
  const FILTERS = ['all', 'milk', 'sorbet', 'cairo', 'isNew'];
  const match = (f, k) => k === 'all' || (k === 'milk' && f.base === 'milk') || (k === 'sorbet' && f.base === 'sorbet') || (k === 'cairo' && f.cairo) || (k === 'isNew' && f.isNew);
  const badges = (f) => (f.base === 'sorbet' ? `<span class="pill free">${UI.dairyFree}</span>` : '') +
    f.contains.map((c) => `<span class="pill">${D.t(D.CONTAINS[c])}</span>`).join('');

  bar.innerHTML = FILTERS.map((k) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${k === 'all'}">${UI.filters[k]}<span class="n">${D.FLAVORS.filter((f) => match(f, k)).length}</span></button>`).join('');
  grid.innerHTML = D.FLAVORS.map((f, i) => {
    const art = A.tub({ flavor: f.key, seed: 200 + i });
    return `<li class="fl-card${f.soldOut ? ' out' : ''}" data-reveal style="--c:${f.bg}">
      <div class="fl-top"><span class="tag">${D.t(f.tag)}</span>${f.soldOut ? `<span class="out-tag">${UI.soldOut}</span>` : ''}<div class="fl-art">${A.svg(art.vb, art.body)}</div></div>
      <div class="fl-body"><h3>${D.t(f.name)}</h3><p>${D.t(f.short)}</p><div class="fl-meta">${badges(f)}</div>
      <button class="btn btn-cream btn-sm fl-more" type="button" data-open="${f.key}">${UI.more}</button></div></li>`;
  }).join('');
  count.textContent = UI.count(D.FLAVORS.length);

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    $$('.chip', bar).forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    let n = 0;
    $$('.fl-card', grid).forEach((card, i) => {
      const show = match(D.FLAVORS[i], b.dataset.f);
      card.hidden = !show;
      if (show) {
        n++;
        card.classList.add('in');
        card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
        card.style.animationDelay = `${(n - 1) * 45}ms`;
      }
    });
    count.textContent = UI.count(n);
  });

  /* ---------- details dialog ---------- */
  let opener = null;
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const f = D.FLAVORS.find((x) => x.key === b.dataset.open), cone = A.KINDS.cone({ scoops: [f.key, f.key], seed: 300 });
    $('#dlgArt').style.setProperty('--c', f.bg);
    $('#dlgArt').innerHTML = A.svg(cone.vb, cone.body);
    $('#dlgTag').textContent = D.t(f.tag);
    $('#dlgName').textContent = D.t(f.name);
    $('#dlgDesc').textContent = D.t(f.long);
    $('#dlgMeta').innerHTML = (f.contains.length ? `<span class="meta-label">${UI.contains}</span>` : '') + badges(f);
    opener = b;
    dlg.showModal();
    document.body.classList.add('dlg-open');
  });
  const unlock = () => document.body.classList.remove('dlg-open');
  dlg.addEventListener('close', () => { unlock(); if (opener) opener.focus(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); unlock(); } });
})();
