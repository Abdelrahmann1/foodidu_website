/* Foodidu Business hero: a 30-second explainer of the services, drawn on <canvas class="biz-anim" data-lang="ar|en">.
   The customer's journey: Foodidu brings the customer (promo code) -> QR menu on the table -> online orders under your name
   -> loyalty stamps bring them back -> real reviews on Google Maps -> everything in one place.
   Plays when on screen, loops, pauses off screen, has a pause button; reduced motion shows the last scene.
   canvas.bizAnim = { draw(t, bg), seek(t), play(), pause(), duration } (tools/anim-video.html records it to MP4). */
(function () {
  "use strict";
  var S = 1080, T = 30;
  var C = { cream: "#FFF9EB", sun: "#FFD15C", sun2: "#FFC533", sunSoft: "#FFF1CC", sun3: "#FFE4A1", ink: "#543A14", deep: "#3A280D", ink2: "#6B522C", ink3: "#8A7350",
    line: "#EFDFBA", line2: "#E4CF9E", leaf: "#4A7A1E", leaf2: "#7EB143", leafSoft: "#EAF3DC", peach: "#FFE9D6", berry: "#D7263D", star: "#E8A317" };
  var TXT = {
    en: { stepOf: "Step {n} of {t}", scenes: ["Foodidu brings the customer", "A QR menu on every table", "Online orders under your name", "Loyalty brings them back", "Real reviews on Google Maps", "Everything your restaurant needs"],
      search: "burger promo code", rest: "Your restaurant", offer: "20% off your first order", code: "YOUR CODE", copy: "Copy code", copied: "Copied",
      scan: "Scan for the menu", items: [["Classic burger", "EGP 145"], ["Margherita pizza", "EGP 180"], ["Mint lemonade", "EGP 55"]], open: "Open now",
      url: "yourrestaurant.com", webH: "Hot and fresh, to your door", order: "Order online", newOrder: "New order", twoItems: "2 items · delivery",
      card: "Loyalty card", reward: "Reward: a free drink", real: "Real reviews", place: "Restaurant · Open now", review: "Great food and fast service!", dir: "Directions",
      final: "Everything your restaurant needs", finalSub: "QR menu · loyalty · ordering · Google Maps" },
    ar: { stepOf: "الخطوة {n} من {t}", scenes: ["Foodidu يجيب العميل", "منيو QR على كل ترابيزة", "طلبات أونلاين باسمك", "برنامج ولاء يرجّعه", "تقييمات حقيقية على جوجل ماب", "كل أدوات مطعمك في مكان واحد"],
      search: "كود خصم مطعم", rest: "مطعمك", offer: "خصم 20% على أول طلب", code: "كودك هنا", copy: "انسخ الكود", copied: "اتنسخ",
      scan: "امسح الكود وشوف المنيو", items: [["برجر كلاسيك", "145 ج.م"], ["بيتزا مارجريتا", "180 ج.م"], ["ليمون نعناع", "55 ج.م"]], open: "مفتوح دلوقتي",
      url: "yourrestaurant.com", webH: "سخن وطازة لحد باب بيتك", order: "اطلب أونلاين", newOrder: "طلب جديد", twoItems: "صنفين · توصيل",
      card: "كارت الولاء", reward: "مكافأة: مشروب ببلاش", real: "تقييمات حقيقية", place: "مطعم · مفتوح دلوقتي", review: "الأكل جميل والخدمة سريعة!", dir: "الاتجاهات",
      final: "كل أدوات مطعمك في مكان واحد", finalSub: "منيو QR · ولاء · طلبات · جوجل ماب" }
  };
  var SC = [[0, 6], [6, 12], [12, 17], [17, 22.8], [22.8, 26.8], [26.8, 30]];   // scene times (s)

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, p) { return a + (b - a) * p; };
  var prog = function (t, a, d) { return clamp((t - a) / d, 0, 1); };
  var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var easeInOut = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var easeBack = function (p) { var c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  var bounce = function (p) { var n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + .75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + .9375; return n * (p -= 2.625 / d) * p + .984375; };
  var rnd = function (i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  var inOut = function (t, a, b, f) { f = f || .5; return Math.min(prog(t, a, f), 1 - prog(t, b - f, f)); };   // fade in at a, out by b

  function Anim(cv) {
    var lang = cv.getAttribute("data-lang") === "ar" ? "ar" : "en", L = TXT[lang], rtl = lang === "ar";
    var x = cv.getContext("2d"), out = rtl ? -1 : 1, F = "'Readex Pro', sans-serif";
    cv.width = S; cv.height = S;
    var img = {}; ["didu-point", "didu-party"].forEach(function (n) { var i = new Image(); i.src = "/img/mascot/" + n + ".svg"; img[n] = i; });
    var logo = new Image(); logo.src = "/img/foodidu-logo.svg";

    // ---------- helpers ----------
    function rr(px, py, w, h, r) { x.beginPath(); x.roundRect(px, py, w, h, r); }
    function shadow(b, y, a) { x.shadowColor = "rgba(58,40,13," + (a || .3) + ")"; x.shadowBlur = b; x.shadowOffsetY = y; }
    function noShadow() { x.shadowColor = "transparent"; x.shadowBlur = 0; x.shadowOffsetY = 0; }
    function text(s, px, py, size, weight, col, align, fam) {
      x.font = (weight || 400) + " " + size + "px " + (fam || F); x.fillStyle = col || C.deep; x.textAlign = align || "center"; x.direction = rtl ? "rtl" : "ltr"; x.fillText(s, px, py);
    }
    function ok(i) { return i.complete && i.naturalWidth; }
    function wrapLines(str, maxW) {   // with the current font
      var words = str.split(" "), lines = [], cur = "";
      words.forEach(function (w) { var tryL = cur ? cur + " " + w : w; if (x.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; });
      if (cur) lines.push(cur); return lines;
    }
    function tap(px, py, t, at) {   // a finger tap: a ring that grows and fades
      var p = prog(t, at, .5); if (p <= 0 || p >= 1) return;
      x.strokeStyle = "rgba(84,58,20," + (1 - p) * .8 + ")"; x.lineWidth = 6; x.beginPath(); x.arc(px, py, 14 + p * 40, 0, 6.28); x.stroke();
      x.fillStyle = "rgba(84,58,20," + (1 - p) * .35 + ")"; x.beginPath(); x.arc(px, py, 16, 0, 6.28); x.fill();
    }
    function stars(px, py, n, size, fill) {   // n stars, `fill` of them gold (fractional allowed)
      for (var k = 0; k < n; k++) {
        var cx = px + (rtl ? -1 : 1) * k * size * 1.15, f = clamp(fill - k, 0, 1);
        x.save(); x.translate(cx, py); x.scale(.6 + .4 * easeBack(f || 0), .6 + .4 * easeBack(f || 0));
        x.beginPath(); for (var j = 0; j < 10; j++) { var r = j % 2 ? size * .22 : size * .5, a = -Math.PI / 2 + j * Math.PI / 5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath();
        x.fillStyle = f > 0 ? C.star : C.line; x.fill(); x.restore();
      }
    }
    function fakeQR(px, py, s) {   // a decorative code (the real, scannable one is on the free tool)
      var n = 21, m = s / n; x.fillStyle = "#fff"; x.fillRect(px - m, py - m, s + 2 * m, s + 2 * m); x.fillStyle = C.deep;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        var f = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7), on;
        if (f) { var rr2 = r > 13 ? r - 14 : r, cc = c > 13 ? c - 14 : c, d = Math.max(Math.abs(rr2 - 3), Math.abs(cc - 3)); on = d !== 2; }
        else on = rnd(r * 31 + c * 7) > .52;
        if (on) x.fillRect(px + c * m, py + r * m, m + .3, m + .3);
      }
    }
    function phone(cx, cy, w, h, draw) {
      x.save(); shadow(50, 26, .4); x.fillStyle = C.deep; rr(cx - w / 2, cy - h / 2, w, h, 52); x.fill(); noShadow();
      x.fillStyle = "#fff"; rr(cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24, 42); x.fill();
      x.save(); rr(cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24, 42); x.clip();
      draw(cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24);
      x.restore();
      x.fillStyle = C.deep; rr(cx - 50, cy - h / 2 + 22, 100, 24, 12); x.fill();
      x.restore();
    }

    // ---------- scene 1: a customer finds your code on Foodidu ----------
    function scene1(t) {
      var a = inOut(t, 0, 6.6, .6); if (a <= 0) return;
      var up = easeOut(prog(t, .2, .8)), cx = S / 2, cy = 500 + (1 - up) * 500;
      if (t > 5.6) cx = lerp(S / 2, S / 2 - out * 170, easeInOut(prog(t, 5.6, .8)));   // makes room for the table stand
      x.save(); x.globalAlpha = Math.min(a, 1);
      phone(cx, cy, 380, 680, function (sx, sy, sw, sh) {
        x.fillStyle = C.sun; x.fillRect(sx, sy, sw, 150);
        text("Foodidu", sx + sw / 2, sy + 118, 54, 400, C.deep, "center", "Lalezar, " + F);
        if (t >= 6) return;   // the scanner takes over in scene 2
        // search box with typing
        x.fillStyle = "#fff"; rr(sx + 22, sy + 176, sw - 44, 64, 32); x.fill(); x.strokeStyle = C.line2; x.lineWidth = 3; x.stroke();
        var typed = L.search.slice(0, Math.round(L.search.length * prog(t, .9, 1.1)));
        text(typed + (t < 2.2 && (t * 2 | 0) % 2 ? "|" : ""), rtl ? sx + sw - 50 : sx + 50, sy + 218, 26, 500, C.ink2, rtl ? "right" : "left");
        // the restaurant's code
        var k = easeBack(prog(t, 2.2, .6)); if (k <= 0) return;
        x.save(); x.translate(sx + sw / 2, sy + 400); x.scale(k, k);
        shadow(24, 10, .22); x.fillStyle = "#fff"; rr(-152, -120, 304, 300, 26); x.fill(); noShadow();
        x.fillStyle = C.sun; x.beginPath(); x.arc(0, -66, 34, 0, 6.28); x.fill();
        text("🍔", 0, -54, 34, 400, C.deep);
        text(L.rest, 0, 4, 28, 700, C.deep); text(L.offer, 0, 44, 23, 600, C.leaf);
        x.setLineDash([10, 8]); x.strokeStyle = C.line2; x.lineWidth = 3; x.beginPath(); x.moveTo(-130, 70); x.lineTo(130, 70); x.stroke(); x.setLineDash([]);
        var copied = t > 4.3, bw = 230;
        x.fillStyle = copied ? C.leaf2 : C.ink; rr(-bw / 2, 100, bw, 58, 16); x.fill();
        text(copied ? "✓ " + L.copied : L.copy, 0, 138, 25, 700, copied ? "#fff" : C.sun);
        x.restore();
        tap(sx + sw / 2, sy + 400 + 129, t, 4.1);
      });
      x.restore();
    }

    // ---------- scene 2: scanning the QR menu at the table ----------
    function stand(cx, cy, w, k) {
      var h = w * 1.35; x.save(); x.translate(cx, cy); x.scale(k, k); x.rotate(-out * .04);
      shadow(36, 18, .32); x.fillStyle = C.sun; rr(-w / 2, -h / 2, w, h, 24); x.fill(); noShadow();
      x.fillStyle = "#D9B04A"; rr(-w * .36, h / 2 - 6, w * .72, 18, 8); x.fill();
      text(L.rest, 0, -h / 2 + 46, 26, 700, C.deep);
      fakeQR(-w * .32, -h / 2 + 72, w * .64);
      text(L.scan, 0, -h / 2 + 72 + w * .64 + 50, 21, 700, C.deep);
      x.restore();
    }
    function scene2(t) {
      var a = inOut(t, 6, 12.6, .5); if (a <= 0) return;
      var sx0 = S / 2 + out * 210, k = easeBack(prog(t, 6, .6));
      x.save(); x.globalAlpha = Math.min(a, 1);
      stand(sx0, 520, 262, k);
      var cx = S / 2 - out * 170;
      phone(cx, 500, 380, 680, function (sx, sy, sw, sh) {
        x.fillStyle = C.sun; x.fillRect(sx, sy, sw, 150);
        text("Foodidu", sx + sw / 2, sy + 118, 54, 400, C.deep, "center", "Lalezar, " + F);
        if (t < 8.6) {   // camera view with the scan frame
          x.fillStyle = "#2B2116"; x.fillRect(sx, sy + 150, sw, sh - 150);
          var fx = sx + sw / 2 - 110, fy = sy + 280;
          fakeQR(fx + 30, fy + 30, 160);
          x.strokeStyle = C.sun; x.lineWidth = 8; x.lineCap = "round";
          [[fx, fy, 1, 1], [fx + 220, fy, -1, 1], [fx, fy + 220, 1, -1], [fx + 220, fy + 220, -1, -1]].forEach(function (c) { x.beginPath(); x.moveTo(c[0], c[1] + c[3] * 46); x.lineTo(c[0], c[1]); x.lineTo(c[0] + c[2] * 46, c[1]); x.stroke(); });
          var ly = fy + 20 + (Math.sin(t * 5) * .5 + .5) * 180; x.fillStyle = "rgba(255,209,92,.8)"; x.fillRect(fx + 10, ly, 200, 5);
        } else {   // the menu opens
          text(L.rest, rtl ? sx + sw - 30 : sx + 30, sy + 200, 30, 700, C.deep, rtl ? "right" : "left");
          text("● " + L.open, rtl ? sx + sw - 30 : sx + 30, sy + 236, 20, 600, C.leaf, rtl ? "right" : "left");
          var cols = [C.peach, C.sunSoft, C.leafSoft], ems = ["🍔", "🍕", "🍋"];
          for (var i = 0; i < 3; i++) {
            var p = easeOut(prog(t, 8.7 + i * .35, .5)); if (p <= 0) continue;
            var iy = sy + 270 + i * 112, ix = sx + 22 + (1 - p) * 60 * out;
            x.globalAlpha = Math.min(a, 1) * p;
            x.strokeStyle = C.line; x.lineWidth = 2; rr(ix, iy, sw - 44, 96, 18); x.stroke();
            var tx = rtl ? ix + sw - 44 - 16 - 64 : ix + 16;
            x.fillStyle = cols[i]; rr(tx, iy + 16, 64, 64, 14); x.fill(); text(ems[i], tx + 32, iy + 60, 30, 400, C.deep);
            text(L.items[i][0], rtl ? tx - 16 : tx + 80, iy + 46, 22, 700, C.deep, rtl ? "right" : "left");
            text(L.items[i][1], rtl ? tx - 16 : tx + 80, iy + 76, 20, 600, C.leaf, rtl ? "right" : "left");
            x.globalAlpha = Math.min(a, 1);
          }
        }
      });
      if (t > 6.8 && t < 8.6) {   // the phone points at the stand
        x.setLineDash([12, 12]); x.lineDashOffset = -t * 60; x.strokeStyle = "rgba(84,58,20,.5)"; x.lineWidth = 4;
        x.beginPath(); x.moveTo(cx + out * 190, 420); x.lineTo(sx0 - out * 140, 470); x.stroke(); x.setLineDash([]);
      }
      x.restore();
    }

    // ---------- scene 3: an order on your own website ----------
    function scene3(t) {
      var a = inOut(t, 12, 17.6, .5); if (a <= 0) return;
      var k = easeBack(prog(t, 12, .6)), w = 760, h = 520, bx = S / 2 - w / 2, by = 270;
      x.save(); x.globalAlpha = Math.min(a, 1); x.translate(S / 2, by + h / 2); x.scale(k, k); x.translate(-S / 2, -(by + h / 2));
      shadow(46, 22, .35); x.fillStyle = "#fff"; rr(bx, by, w, h, 26); x.fill(); noShadow();
      x.fillStyle = "#F6EEDC"; rr(bx, by, w, 62, [26, 26, 0, 0]); x.fill();
      for (var i = 0; i < 3; i++) { x.fillStyle = C.line2; x.beginPath(); x.arc(bx + 30 + i * 24, by + 31, 7, 0, 6.28); x.fill(); }
      x.fillStyle = "#fff"; rr(bx + 120, by + 14, w - 230, 34, 17); x.fill();
      x.direction = "ltr"; x.font = "500 20px " + F; x.fillStyle = C.ink3; x.textAlign = "left"; x.fillText(L.url, bx + 140, by + 38);
      // cart badge
      var n = t > 14.5 ? 2 : t > 13.7 ? 1 : 0, cxb = bx + w - 56;
      x.fillStyle = C.ink; rr(cxb - 26, by + 12, 52, 38, 12); x.fill(); text("🛒", cxb, by + 41, 22, 400, "#fff");
      if (n) { var pb = easeBack(prog(t, n === 2 ? 14.5 : 13.7, .35)); x.fillStyle = C.berry; x.beginPath(); x.arc(cxb + 24, by + 14, 15 * pb, 0, 6.28); x.fill(); text(String(n), cxb + 24, by + 21, 18 * pb, 700, "#fff"); }
      // hero block
      var g = x.createLinearGradient(bx, by + 80, bx + w, by + 250); g.addColorStop(0, C.sunSoft); g.addColorStop(1, C.sun3);
      x.fillStyle = g; rr(bx + 24, by + 84, w - 48, 170, 20); x.fill();
      var tx = rtl ? bx + w - 56 : bx + 56;
      text(L.webH, tx, by + 148, 34, 700, C.deep, rtl ? "right" : "left");
      var obw = 230, obx = rtl ? tx - obw : tx, pressed = t > 15.3 && t < 15.7;
      x.fillStyle = pressed ? C.deep : C.ink; rr(obx, by + 176, obw, 56, 14); x.fill(); text(L.order, obx + obw / 2, by + 213, 24, 700, C.sun);
      // dishes
      var ems = ["🍔", "🍕", "🍋"], cols = [C.peach, C.sunSoft, C.leafSoft], tw = (w - 48 - 32) / 3;
      for (i = 0; i < 3; i++) {
        var ix = rtl ? bx + w - 24 - (i + 1) * tw - i * 16 : bx + 24 + i * (tw + 16), iy = by + 274;
        x.strokeStyle = C.line; x.lineWidth = 2; rr(ix, iy, tw, 220, 18); x.stroke();
        x.fillStyle = cols[i]; rr(ix + 12, iy + 12, tw - 24, 110, 14); x.fill(); text(ems[i], ix + tw / 2, iy + 86, 52, 400, C.deep);
        text(L.items[i][0], ix + tw / 2, iy + 160, 21, 700, C.deep); text(L.items[i][1], ix + tw / 2, iy + 192, 20, 600, C.leaf);
        var pl = rtl ? ix + 26 : ix + tw - 26; x.fillStyle = C.ink; x.beginPath(); x.arc(pl, iy + 112, 20, 0, 6.28); x.fill(); text("+", pl, iy + 121, 28, 700, C.sun);
        if (i < 2) tap(pl, iy + 112, t, i ? 14.3 : 13.5);
      }
      tap(obx + obw / 2, by + 204, t, 15.1);
      x.restore();
      // the new-order notification
      var nk = easeBack(prog(t, 15.6, .5)); if (nk > 0 && a > 0) {
        var nw = 420, nx = S / 2 + out * 150 - nw / 2, ny = 166 + (1 - nk) * -80;
        x.save(); x.globalAlpha = Math.min(a, nk);
        shadow(30, 14, .3); x.fillStyle = C.deep; rr(nx, ny, nw, 104, 24); x.fill(); noShadow();
        var ic = rtl ? nx + nw - 52 : nx + 52; x.fillStyle = C.sun; x.beginPath(); x.arc(ic, ny + 52, 30, 0, 6.28); x.fill(); text("🔔", ic, ny + 64, 30, 400, C.deep);
        text(L.newOrder + " #1024", rtl ? ic - 46 : ic + 46, ny + 46, 28, 700, "#fff", rtl ? "right" : "left");
        text(L.twoItems, rtl ? ic - 46 : ic + 46, ny + 82, 22, 500, C.sun3, rtl ? "right" : "left");
        x.restore();
      }
    }

    // ---------- scene 4: loyalty stamps fill up ----------
    function scene4(t) {
      var a = inOut(t, 17, 23.3, .5); if (a <= 0) return;
      var k = easeBack(prog(t, 17, .6)), w = 620, h = 390, cx = S / 2, cy = 500;
      x.save(); x.globalAlpha = Math.min(a, 1); x.translate(cx, cy); x.scale(k, k); x.rotate(-out * .03);
      shadow(50, 26, .45); var g = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, "#6B4A1C"); g.addColorStop(1, C.deep);
      x.fillStyle = g; rr(-w / 2, -h / 2, w, h, 34); x.fill(); noShadow();
      text(L.card, rtl ? w / 2 - 40 : -w / 2 + 40, -h / 2 + 62, 24, 500, "rgba(255,246,224,.85)", rtl ? "right" : "left");
      text(L.rest, rtl ? -w / 2 + 40 : w / 2 - 40, -h / 2 + 62, 30, 700, C.sun, rtl ? "left" : "right");
      var filled = 6 + (t > 18.2) + (t > 18.7) + (t > 19.2), d = 86, gap = 22;
      for (var i = 0; i < 10; i++) {
        var col = i % 5, row = Math.floor(i / 5), kk = rtl ? 4 - col : col;
        var px = -w / 2 + 44 + kk * (d + gap) + d / 2, py = -h / 2 + 108 + row * (d + 24) + d / 2;
        var on = i < filled, gift = i === 9, gp = gift ? easeBack(prog(t, 19.9, .5)) : 0;
        var pop = on && i >= 6 ? easeBack(prog(t, [18.2, 18.7, 19.2][i - 6], .35)) : 1;
        x.beginPath(); x.arc(px, py, d / 2 * (on ? pop : 1) * (gift ? 1 + gp * .12 : 1), 0, 6.28);
        if (gift && gp > 0) { x.fillStyle = C.leaf2; x.fill(); text("🎁", px, py + 14, 38, 400, "#fff"); }
        else if (on) { x.fillStyle = C.sun; x.fill(); x.strokeStyle = C.deep; x.lineWidth = 8; x.lineCap = "round"; x.beginPath(); x.moveTo(px - 18, py); x.lineTo(px - 5, py + 14); x.lineTo(px + 20, py - 14); x.stroke(); }
        else { x.setLineDash([8, 8]); x.strokeStyle = "rgba(255,241,204,.55)"; x.lineWidth = 3; x.stroke(); x.setLineDash([]); if (gift) text("🎁", px, py + 14, 34, 400, "#fff"); }
      }
      x.restore();
      var rk = easeBack(prog(t, 20.4, .5)); if (rk > 0) {   // the reward
        x.save(); x.globalAlpha = Math.min(a, 1); x.translate(cx, cy + h / 2 + 70); x.scale(rk, rk);
        x.font = "700 32px " + F; var rw = x.measureText(L.reward).width + 80;
        shadow(24, 10, .3); x.fillStyle = C.leaf2; rr(-rw / 2, -36, rw, 72, 36); x.fill(); noShadow();
        text(L.reward, 0, 11, 32, 700, "#fff");
        x.restore();
      }
      confetti(t, 20.4, cx, cy - 40);
    }
    function confetti(t, at, cx, cy) {
      for (var k = 0; k < 22; k++) {
        var cp = prog(t, at + rnd(k + 900) * .4, 1.6); if (cp <= 0 || cp >= 1) continue;
        var ang = rnd(k + 910) * 6.28, dist = 120 + cp * (220 + rnd(k + 920) * 200);
        x.globalAlpha = 1 - cp; x.fillStyle = [C.sun, C.leaf2, C.berry, C.ink][k % 4];
        x.save(); x.translate(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * .7 + cp * 80); x.rotate(cp * 8 + k); x.fillRect(-8, -5, 16, 10); x.restore();
      }
      x.globalAlpha = 1;
    }

    // ---------- scene 5: on the map, with real reviews ----------
    function scene5(t) {
      var a = inOut(t, 22.8, 27.3, .5); if (a <= 0) return;
      var k = easeBack(prog(t, 23, .6)), w = 640, h = 600, bx = S / 2 - w / 2, by = 180;
      x.save(); x.globalAlpha = Math.min(a, 1); x.translate(S / 2, by + h / 2); x.scale(k, k); x.translate(-S / 2, -(by + h / 2));
      shadow(46, 22, .35); x.fillStyle = "#fff"; rr(bx, by, w, h, 30); x.fill(); noShadow();
      x.save(); rr(bx, by, w, 280, [30, 30, 0, 0]); x.clip();
      x.fillStyle = "#EEF3E6"; x.fillRect(bx, by, w, 280);
      x.fillStyle = "#D8EBC4"; rr(bx + 40, by + 30, 150, 100, 22); x.fill();
      x.fillStyle = "#DCEAF6"; rr(bx + w - 210, by + 180, 170, 70, 20); x.fill();
      x.fillStyle = "#fff"; x.save(); x.translate(bx + w / 2, by + 170); x.rotate(-.12); x.fillRect(-w, -14, w * 2, 28); x.restore();
      x.save(); x.translate(bx + 230, by + 140); x.rotate(.25); x.fillRect(-12, -300, 24, 600); x.restore();
      x.fillStyle = C.sun3; x.save(); x.translate(bx + 470, by + 140); x.rotate(-.1); x.fillRect(-9, -300, 18, 600); x.restore();
      x.restore();
      // the pin drops
      var pp = prog(t, 23.8, .9), py = lerp(by - 120, by + 130, bounce(pp));
      if (pp > 0) {
        x.fillStyle = "rgba(84,58,20,.18)"; x.beginPath(); x.ellipse(bx + w / 2, by + 196, 36 * pp, 10 * pp, 0, 0, 6.28); x.fill();
        x.fillStyle = C.ink; x.beginPath(); x.arc(bx + w / 2, py - 20, 40, Math.PI, 0); x.lineTo(bx + w / 2, py + 50); x.closePath(); x.fill();
        x.beginPath(); x.arc(bx + w / 2, py - 20, 40, 0, Math.PI); x.fill();
        x.fillStyle = C.sun; x.beginPath(); x.arc(bx + w / 2, py - 20, 18, 0, 6.28); x.fill();
      }
      var tx = rtl ? bx + w - 40 : bx + 40, al = rtl ? "right" : "left";
      text(L.rest, tx, by + 336, 34, 700, C.deep, al);
      stars(rtl ? bx + w - 56 : bx + 56, by + 384, 5, 34, (t - 24.5) / .25);
      text(L.real, rtl ? bx + w - 270 : bx + 270, by + 396, 22, 700, C.leaf, al);
      text(L.place, tx, by + 436, 22, 500, C.ink3, al);
      var rk = easeBack(prog(t, 25.9, .5)); if (rk > 0) {   // a review from a customer
        x.save(); x.translate(bx + w / 2, by + 520); x.scale(rk, rk);
        x.fillStyle = C.sunSoft; rr(-w / 2 + 30, -50, w - 60, 100, 20); x.fill();
        var ax = rtl ? w / 2 - 80 : -w / 2 + 80; x.fillStyle = C.leaf2; x.beginPath(); x.arc(ax, 0, 28, 0, 6.28); x.fill(); text("🙂", ax, 10, 28, 400, "#fff");
        text(L.review, rtl ? ax - 46 : ax + 46, 12, 25, 600, C.deep, rtl ? "right" : "left");
        x.restore();
      }
      x.restore();
    }

    // ---------- scene 6: everything in one place ----------
    function scene6(t) {
      var a = prog(t, 26.7, .5); if (a <= 0) return;
      x.save(); x.globalAlpha = a;
      if (ok(logo)) { var lk = easeBack(prog(t, 27.6, .6)), lw = 300 * lk, lh = lw * 304 / 767; x.drawImage(logo, S / 2 - lw / 2 - 90, 230 - lh / 2, lw, lh); }
      var pk = easeBack(prog(t, 27.8, .5)); x.save(); x.translate(S / 2 + 160, 230); x.scale(pk, pk); x.fillStyle = C.ink; rr(-80, -26, 160, 52, 14); x.fill(); x.direction = "ltr"; text("Business", 0, 11, 28, 700, C.sun); x.restore();
      var icons = ["📱", "🎁", "🛒", "📍", "🏷️"];
      for (var i = 0; i < 5; i++) {
        var ik = easeBack(prog(t, 28 + i * .12, .45)); if (ik <= 0) continue;
        var ang = Math.PI * (1.12 + i * .19), ix = S / 2 + Math.cos(ang) * 330, iy = 600 + Math.sin(ang) * 230;   // an arc over Didu
        x.save(); x.translate(ix, iy); x.scale(ik, ik); shadow(20, 8, .25); x.fillStyle = i % 2 ? C.sun : "#fff"; x.beginPath(); x.arc(0, 0, 58, 0, 6.28); x.fill(); noShadow();
        text(icons[i], 0, 18, 50, 400, C.deep); x.restore();
      }
      if (ok(img["didu-party"])) { var dk = easeBack(prog(t, 28.2, .6)), ds = 300 * dk; x.drawImage(img["didu-party"], S / 2 - ds / 2, 640 - ds / 2, ds, ds); }
      confetti(t, 28.2, S / 2, 560);
      x.restore();
    }

    // ---------- frame ----------
    function draw(t, bg) {
      t = clamp(t, 0, T);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
      x.clearRect(0, 0, S, S);
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, S, S); }
      var gl = x.createRadialGradient(S / 2, 520, 40, S / 2, 520, 470); gl.addColorStop(0, "rgba(255,209,92,.5)"); gl.addColorStop(1, "rgba(255,209,92,0)");
      x.fillStyle = gl; x.fillRect(0, 0, S, S);
      scene1(t); scene2(t); scene3(t); scene4(t); scene5(t); scene6(t);
      // Didu guides from the corner (scenes 1-5)
      var dg = Math.min(prog(t, .8, .6), 1 - prog(t, 26.4, .4));
      if (dg > 0 && ok(img["didu-point"])) {
        var ds = 165, dx = rtl ? 30 : S - 30 - ds, dy = 690 + Math.sin(t * 2.2) * 8 + (1 - easeBack(dg)) * 200;
        x.save(); x.globalAlpha = dg; if (!rtl) { x.translate(dx + ds, dy); x.scale(-1, 1); x.drawImage(img["didu-point"], 0, 0, ds, ds); } else x.drawImage(img["didu-point"], dx, dy, ds, ds); x.restore();
      }
      var cur = 0; for (var k = 0; k < SC.length; k++) if (t >= SC[k][0]) cur = k;
      var last = SC.length - 1;
      // the title of the part on screen, large at the top once its chapter card has gone
      var ta = Math.min(prog(t, SC[cur][0] + .75, .35), cur === last ? 1 : 1 - prog(t, SC[cur][1] - .45, .3));
      if (ta > 0) {
        x.save(); x.globalAlpha = ta; x.translate(0, (1 - easeOut(ta)) * -24);
        x.font = "700 50px " + F; var label = L.scenes[cur], pw = x.measureText(label).width + (cur < last ? 150 : 90), ty = 92;
        shadow(26, 10, .22); x.fillStyle = cur < last ? "#fff" : C.leaf; rr(S / 2 - pw / 2, ty - 50, pw, 100, 50); x.fill(); noShadow();
        if (cur < last) {
          var nx = rtl ? S / 2 + pw / 2 - 56 : S / 2 - pw / 2 + 56;
          x.fillStyle = C.ink; x.beginPath(); x.arc(nx, ty, 34, 0, 6.28); x.fill(); x.direction = "ltr"; text(String(cur + 1), nx, ty + 13, 36, 700, C.sun);
          text(label, S / 2 + (rtl ? -36 : 36), ty + 17, 50, 700, C.deep);
        } else text(label, S / 2, ty + 17, 50, 700, "#fff");
        x.restore();
      }
      // five-part progress bar (the current part fills while it plays)
      if (cur < last) {
        var gw = (S - 200 - 4 * 14) / 5, gy = S - 72;
        for (k = 0; k < 5; k++) {
          var gx0 = rtl ? S - 100 - (k + 1) * gw - k * 14 : 100 + k * (gw + 14);
          var fp = k < cur ? 1 : k > cur ? 0 : prog(t, SC[k][0], SC[k][1] - SC[k][0]);
          x.fillStyle = C.line2; rr(gx0, gy, gw, 14, 7); x.fill();
          if (fp > 0) { var fw = Math.max(14, gw * fp); x.fillStyle = k === cur ? C.ink : C.sun2; rr(rtl ? gx0 + gw - fw : gx0, gy, fw, 14, 7); x.fill(); }
        }
      } else { x.save(); x.globalAlpha = prog(t, 28.4, .5); text(L.finalSub, S / 2, S - 70, 28, 600, C.ink2); x.restore(); }
      // chapter cards: a panel sweeps in from the start side with the part's number and title, then sweeps out
      for (k = 0; k < SC.length; k++) {
        var s0 = SC[k][0], pin = k === 0 ? 1 : easeInOut(prog(t, s0 - .35, .35)), pout = easeInOut(prog(t, s0 + .45, .45));
        if ((k > 0 && t < s0 - .35) || pout >= 1) continue;
        var off = (1 - pin) * -S * out + pout * S * out;
        x.save(); x.translate(off, 0);
        x.fillStyle = k === last ? C.leaf : C.sun; rr(0, 0, S, S, 48); x.fill();
        x.save(); rr(0, 0, S, S, 48); x.clip(); x.globalAlpha = .07; x.fillStyle = C.deep;
        for (var st = -S; st < S * 2; st += 110) { x.beginPath(); x.moveTo(st, 0); x.lineTo(st + 44, 0); x.lineTo(st + 44 - S * .4, S); x.lineTo(st - S * .4, S); x.fill(); }
        x.restore();
        var col = k === last ? "#fff" : C.deep, y0 = 640;
        if (k < last) {
          x.fillStyle = C.ink; x.beginPath(); x.arc(S / 2, 380, 96, 0, 6.28); x.fill();
          x.direction = "ltr"; text(String(k + 1), S / 2, 418, 108, 700, C.sun);
          text(L.stepOf.replace("{n}", k + 1).replace("{t}", 5), S / 2, 540, 36, 600, C.ink2);
        } else y0 = 500;
        x.font = "700 80px " + F; var lines = wrapLines(L.scenes[k], 900);
        for (var li = 0; li < lines.length; li++) text(lines[li], S / 2, y0 + li * (rtl ? 112 : 96), 80, 700, col);
        x.restore();
      }
      // fade between loops
      var f = Math.max(1 - prog(t, 0, .3), prog(t, T - .4, .4));
      if (f > 0) { if (bg) { x.fillStyle = bg; x.globalAlpha = f; x.fillRect(0, 0, S, S); x.globalAlpha = 1; } else { x.globalCompositeOperation = "destination-out"; x.fillStyle = "rgba(0,0,0," + f + ")"; x.fillRect(0, 0, S, S); x.globalCompositeOperation = "source-over"; } }
    }

    var t0 = 0, at = 0, playing = false, raf = 0;
    function tick(now) { if (!playing) return; at = ((now - t0) / 1000) % T; draw(at); raf = requestAnimationFrame(tick); }
    var api = {
      draw: draw, duration: T,
      play: function () { if (playing) return; playing = true; t0 = performance.now() - at * 1000; raf = requestAnimationFrame(tick); cv.dispatchEvent(new Event("anim-state")); },
      pause: function () { playing = false; cancelAnimationFrame(raf); cv.dispatchEvent(new Event("anim-state")); },
      seek: function (s) { at = clamp(s, 0, T); draw(at); },
      get playing() { return playing; }
    };
    cv.bizAnim = api;
    [logo, img["didu-point"], img["didu-party"]].forEach(function (i) { i.onload = function () { if (!playing) draw(at); }; });
    return api;
  }

  function init() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll("canvas.biz-anim").forEach(function (cv) {
      var a = Anim(cv), btn = cv.parentNode.querySelector(".anim-btn"), userPaused = reduce;
      a.seek(reduce ? 29.2 : 0);
      if (document.fonts && document.fonts.load) Promise.all([document.fonts.load("54px Lalezar", "Foodidu"), document.fonts.load("700 40px 'Readex Pro'", "منيو menu")]).then(function () { if (!a.playing) a.seek(reduce ? 29.2 : 0); });
      var sync = function () { if (!btn) return; btn.setAttribute("aria-pressed", a.playing ? "true" : "false"); btn.setAttribute("aria-label", btn.getAttribute(a.playing ? "data-pause" : "data-play")); };
      cv.addEventListener("anim-state", sync);
      if (btn) btn.addEventListener("click", function () { if (a.playing) { a.pause(); userPaused = true; } else { userPaused = false; a.play(); } });
      if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !userPaused) a.play(); else if (!e.isIntersecting) a.pause(); }); }, { threshold: .3 }).observe(cv);
      else if (!reduce) a.play();
      sync();
    });
  }
  window.FoodiduBizAnim = { init: init, Anim: Anim };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
