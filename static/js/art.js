// Shared canvas helpers for the dev-only generators (assets.html, banners.html) and the dashboard's content manager.
// Used by tools/*.html (served at /__static/js/art.js; saving goes through POST /__save) and by the dashboard (/js/art.*.js).
const SUN = "#FFD15C", SUN2 = "#FFC533", INK = "#543A14", INK2 = "#6B522C", LEAF = "#4A7A1E", CREAM = "#FFF9EB", SUN4 = "#FFF1CC", LINE = "#E4CF9E";
const log = (m) => { document.getElementById("log").textContent += m + "\n"; };
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => rej(new Error("load " + src)); i.src = src; });
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const blob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
async function save(path, c, type = "image/png", q) {
  const b = await blob(c, type, q);
  const r = await fetch("/__save?path=" + encodeURIComponent(path), { method: "POST", body: b });
  log((await r.text()));
  const img = new Image(); img.src = URL.createObjectURL(b); img.title = path; document.getElementById("out").appendChild(img);
}
function fit(ctx, img, x, y, w, h, cover) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = cover ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function wrap(ctx, text, maxW) {
  const words = text.split(" "); const lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function ticketArt(ctx, b, lang, logo, x, y, w, rot) {
  const h = 330, stub = 96;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = "rgba(84,58,20,.35)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#fff"; rr(ctx, 0, 0, w, h, 30); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = SUN4; rr(ctx, 0, h - stub, w, stub, [0, 0, 30, 30]); ctx.fill();
  ctx.fillStyle = SUN;
  for (const cx of [0, w]) { ctx.beginPath(); ctx.arc(cx, h - stub, 18, 0, Math.PI * 2); ctx.fill(); }
  ctx.setLineDash([10, 8]); ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(26, h - stub); ctx.lineTo(w - 26, h - stub); ctx.stroke(); ctx.setLineDash([]);
  const rtl = lang === "ar";
  ctx.direction = rtl ? "rtl" : "ltr";
  const lx = rtl ? w - 30 - 90 : 30;
  ctx.save(); rr(ctx, lx, 28, 90, 90, 22); ctx.clip(); ctx.drawImage(logo, lx, 28, 90, 90); ctx.restore();
  ctx.strokeStyle = "#EFDFBA"; ctx.lineWidth = 2; rr(ctx, lx, 28, 90, 90, 22); ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = rtl ? "right" : "left";
  const tx = rtl ? w - 30 - 90 - 20 : 30 + 90 + 20;
  let ns = 34; ctx.font = `700 ${ns}px 'Readex Pro'`;
  while (ctx.measureText(b.name[lang]).width > w - 170 && ns > 20) { ns -= 1; ctx.font = `700 ${ns}px 'Readex Pro'`; }   // long names shrink to fit
  ctx.fillText(b.name[lang], tx, 72);
  ctx.font = "400 24px 'Readex Pro'"; ctx.fillStyle = INK2; ctx.fillText(b.cat, tx, 106);
  const [big, small] = b.badge[lang];
  ctx.fillStyle = INK;
  const bx = rtl ? w - 30 : 30;
  let bs = 96;   // long badges ("100 جنيه") shrink so big + small stay inside the ticket
  for (;;) { ctx.font = `${bs * 44 / 96}px Lalezar`; const sw = ctx.measureText(small).width; ctx.font = `${bs}px Lalezar`; if (ctx.measureText(big).width + 14 + sw <= w - 60 || bs <= 56) break; bs -= 2; }
  const ss = `${bs * 44 / 96}px Lalezar`, bf = `${bs}px Lalezar`;
  if (rtl) { ctx.font = ss; ctx.fillStyle = LEAF; ctx.fillText(small, bx, 228); const sw = ctx.measureText(small).width; ctx.font = bf; ctx.fillStyle = INK; ctx.fillText(big, bx - sw - 14, 228); }
  else { ctx.font = bf; ctx.fillText(big, bx, 228); const bw = ctx.measureText(big).width; ctx.font = ss; ctx.fillStyle = LEAF; ctx.fillText(small, bx + bw + 14, 228); }
  const cy = h - stub + 18, ch = 60;
  if (b.tag) {   // restaurant offers: a solid "save up to" pill instead of a code box
    ctx.fillStyle = INK; rr(ctx, 26, cy, w - 52, ch, 14); ctx.fill();
    ctx.textAlign = "center"; ctx.direction = rtl ? "rtl" : "ltr"; ctx.font = "700 28px 'Readex Pro'"; ctx.fillStyle = SUN;
    ctx.fillText(b.tag, w / 2, cy + 40); ctx.restore(); return;
  }
  // code box
  ctx.setLineDash([9, 6]); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillStyle = "#fff";
  rr(ctx, 26, cy, w - 52, ch, 14); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = INK; rr(ctx, w - 26 - 150, cy, 150, ch, [0, 14, 14, 0]); ctx.fill();
  ctx.direction = "ltr"; ctx.textAlign = "center";
  ctx.font = "700 30px ui-monospace, Consolas, monospace"; ctx.fillStyle = INK; ctx.fillText(b.code, 26 + (w - 52 - 150) / 2, cy + 41);
  ctx.font = "700 26px 'Readex Pro'"; ctx.fillStyle = SUN; ctx.direction = rtl ? "rtl" : "ltr"; ctx.fillText(rtl ? "انسخ" : "Copy", w - 26 - 75, cy + 40);
  ctx.restore();
}

// ---------- Open Graph share images (1200x630): tools/assets.html and the dashboard draw them the same way ----------
function brandOgCopy(b, lang) {
  const many = [b, ...(b.moreCodes || [])].filter((x) => !x.noCode).length > 1;
  const title = b.noCode ? (lang === "ar" ? `عرض خصم ${b.name.ar}` : `${b.name.en} discount`)
    : lang === "ar" ? `${many ? "أكواد خصم" : "كود خصم"} ${b.name.ar}` : `${b.name.en} promo ${many ? "codes" : "code"}`;
  return [title, [b.offer[lang], ...(b.moreCodes || []).map((x) => x.offer[lang])].join(" · ")];
}
// One job per language for a brand (its codes as tickets) or a restaurant (a "save up to" ticket).
function ogJobs(e, kind) {
  return ["en", "ar"].map((lang) => {
    if (kind === "restaurant") {
      const min = Math.min(...e.offers.map((o) => o.price));
      const save = Math.max(...e.offers.map((o) => Math.round((1 - o.price / o.was) * 100)));
      const n = e.offers.length;
      const text = lang === "ar"
        ? [`عروض ${e.name.ar}`, `${n <= 10 ? n + " عروض" : n + " عرضاً"} تبدأ من ${min} جنيه، ووفّر حتى ${save}% من سعر المنيو.`]
        : [`${e.name.en} offers`, `${n} offers from ${min} EGP, saving up to ${save}% on the menu price.`];
      const badge = { en: [String(min), "EGP"], ar: [`${min} جنيه`, "من"] };
      return { lang, file: `${e.key}-${lang}`, text, items: [{ ...e, badge, tag: lang === "ar" ? `وفّر حتى ${save}%` : `Save up to ${save}%` }] };
    }
    if (e.noCode) return { lang, file: `${e.key}-${lang}`, text: brandOgCopy(e, lang), items: [{ ...e, tag: lang === "ar" ? "بدون كود" : "No code needed" }] };
    return { lang, file: `${e.key}-${lang}`, text: brandOgCopy(e, lang), items: [e, ...(e.moreCodes || []).map((x) => ({ ...e, code: x.code, badge: x.badge, ...(x.noCode ? { tag: lang === "ar" ? "بدون كود" : "No code needed" } : {}) }))]
      .sort((x, y) => !!y.tag - !!x.tag).slice(-2) };   // at most 2 tickets, and the front (last) one is a real code
  });
}
// Share images for the section pages (home, all codes, partners, day deals): Pizza Hut and KFC tickets (or whichever is left).
const SECTION_COPY = {
  en: {
    home: ["Every bite, a better price.", "Promo codes for KFC, Pizza Hut, Rabbit, noon and more in Egypt & the GCC."],
    codes: ["All promo codes in one place", "Restaurants, grocery apps and online shopping in Egypt & the GCC."],
    partners: ["Partner with Foodidu", "Put your restaurant's promo code in front of people about to order."],
    "day-deals": ["Weekly day deals", "Offers that come back every week, like the KFC Tuesday offer."]
  },
  ar: {
    home: ["كل أكلة… بسعر أحلى.", "أكواد خصم كنتاكي وبيتزا هت ورابيت ونون وغيرها في مصر والخليج."],
    codes: ["كل أكواد الخصم في مكان واحد", "مطاعم وتطبيقات بقالة وتسوق أونلاين في مصر والخليج."],
    partners: ["انضم لشركاء Foodidu", "اعرض كود خصم مطعمك أمام أشخاص على وشك الطلب."],
    "day-deals": ["عروض الأيام", "عروض تتكرر كل أسبوع، مثل عرض كنتاكي يوم الثلاثاء."]
  }
};
function sectionJobs(brands) {
  const byKey = Object.fromEntries(brands.map((b) => [b.key, b]));
  const two = [byKey["pizza-hut"], byKey.kfc].filter(Boolean), one = [byKey.kfc || two[0]];
  if (!two.length) return [];
  const jobs = [];
  for (const lang of ["en", "ar"]) {
    for (const k of ["home", "codes", "partners"]) jobs.push({ lang, file: `${k}-${lang}`, text: SECTION_COPY[lang][k], items: two });
    jobs.push({ lang, file: `day-deals-${lang}`, text: SECTION_COPY[lang]["day-deals"], items: one });
  }
  return jobs;
}
// job = { lang, text: [title, line], items: [brand-like with key, name, category, badge, code | tag] }; logos[key] = image
function drawOg(j, pattern, face, logos, CAT) {
  const W = 1200, H = 630, c = canvas(W, H), x = c.getContext("2d");
  const rtl = j.lang === "ar";
  x.fillStyle = SUN; x.fillRect(0, 0, W, H);
  x.globalAlpha = .9; for (let py = 0; py < H; py += 406) for (let px = 0; px < W; px += 187) x.drawImage(pattern, px, py - 60, 187, 406); x.globalAlpha = 1;
  // scallop bottom strip
  x.fillStyle = CREAM; x.fillRect(0, H - 22, W, 22);
  x.fillStyle = SUN; for (let sx = 12; sx < W + 24; sx += 24) { x.beginPath(); x.arc(sx, H - 22, 11, 0, Math.PI); x.fill(); }
  // text column
  const colW = 600, colX = rtl ? W - 64 : 64;
  x.direction = rtl ? "rtl" : "ltr"; x.textAlign = rtl ? "right" : "left";
  const lw = 200, lh0 = lw * 304 / 767, fx = rtl ? W - 64 - lw : 64;
  x.drawImage(face, fx, 36, lw, lh0);
  x.fillStyle = INK;
  let size = 92; x.font = `${size}px Lalezar`;
  let lines = wrap(x, j.text[0], colW);
  while (lines.length > 3 && size > 60) { size -= 6; x.font = `${size}px Lalezar`; lines = wrap(x, j.text[0], colW); }
  const lh = rtl ? size * 1.28 : size * 1.02;
  let y = 150 + size;
  for (const ln of lines) { x.fillText(ln, colX, y); y += lh; }
  x.font = "400 30px 'Readex Pro'"; x.fillStyle = INK2;
  y += 6; for (const ln of wrap(x, j.text[1], colW).slice(0, 3)) { x.fillText(ln, colX, y); y += 44; }
  // tickets: a brand with 2 codes shows 2
  const tw = 440, tx = rtl ? 70 : W - 70 - tw, list = j.items;
  if (list.length === 2) {
    ticketArt(x, { ...list[0], cat: CAT[list[0].category][j.lang] }, j.lang, logos[list[0].key], tx - (rtl ? -30 : 30), 70, tw, rtl ? .07 : -.07);
    ticketArt(x, { ...list[1], cat: CAT[list[1].category][j.lang] }, j.lang, logos[list[1].key], tx + (rtl ? -20 : 20), 205, tw, rtl ? -.04 : .04);
  } else {
    ticketArt(x, { ...list[0], cat: CAT[list[0].category][j.lang] }, j.lang, logos[list[0].key], tx, 140, tw, rtl ? .05 : -.05);
  }
  return c;
}
