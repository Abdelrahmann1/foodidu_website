// Shared canvas helpers for the dev-only generators (assets.html, banners.html).
// Served by tools/serve.pl at /__tools/art.js; saving goes through POST /__save.
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
  ctx.font = "96px Lalezar"; ctx.fillStyle = INK;
  const bx = rtl ? w - 30 : 30;
  if (rtl) { ctx.font = "44px Lalezar"; ctx.fillStyle = LEAF; ctx.fillText(small, bx, 228); const sw = ctx.measureText(small).width; ctx.font = "96px Lalezar"; ctx.fillStyle = INK; ctx.fillText(big, bx - sw - 14, 228); }
  else { ctx.fillText(big, bx, 228); const bw = ctx.measureText(big).width; ctx.font = "44px Lalezar"; ctx.fillStyle = LEAF; ctx.fillText(small, bx + bw + 14, 228); }
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
