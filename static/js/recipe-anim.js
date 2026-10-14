/* Foodidu Business: a 30-second recipe animation (explainer style) drawn on <canvas class="recipe-anim" data-lang="ar|en">.
   Empty glass -> finished strawberry mojito mocktail: every ingredient drops in with its measurement, liquids pour with a
   live ml counter, the list on the side ticks off. Plays when on screen, loops, pauses off screen; reduced motion shows the
   finished drink with a play button. canvas.recipe = { seek(t), play(), pause(), draw(t) } (tools/recipe-video.html records it). */
(function () {
  "use strict";
  var S = 1080, T = 30;
  var C = { cream: "#FFF9EB", sun: "#FFD15C", sun2: "#FFC533", sunSoft: "#FFF1CC", ink: "#543A14", deep: "#3A280D", ink2: "#6B522C", ink3: "#8A7350",
    line: "#EFDFBA", leaf: "#4A7A1E", leaf2: "#7EB143", mint: "#3E9B4F", mintDark: "#2C7A3B", lime: "#9BCB3C", limeIn: "#E4F2A8", berry: "#D7263D", berryDark: "#A3162A" };
  var TXT = {
    en: { title: "Strawberry Mojito", sub: "A fresh mocktail in 30 seconds", list: "Ingredients", step: "Step {n} of {t}", enjoy: "Enjoy!", brand: "Foodidu Business",
      ml: "{n} ml", steps: [["Fresh mint", "8 leaves"], ["Lime", "½ lime"], ["Strawberries", "4"], ["Muddle", "10 seconds"], ["Sugar syrup", "20 ml"], ["Crushed ice", "1 cup"], ["Soda water", "150 ml"], ["Garnish", "slice + mint"]] },
    ar: { title: "موهيتو فراولة", sub: "موكتيل منعش في 30 ثانية", list: "المكونات", step: "الخطوة {n} من {t}", enjoy: "بالهنا والشفا!", brand: "Foodidu Business",
      ml: "{n} مل", steps: [["نعناع فريش", "8 ورقات"], ["ليمون", "نص ليمونة"], ["فراولة", "4 حبات"], ["اهرس المكونات", "10 ثواني"], ["شراب سكر", "20 مل"], ["تلج مجروش", "كوباية"], ["صودا", "150 مل"], ["التزيين", "فراولة ونعناع"]] }
  };
  // [start, end] of each step, in seconds; the ingredient list leaves out the muddling step
  var STEPS = [[2.5, 6], [6, 9], [9, 12], [12, 15.5], [15.5, 18.5], [18.5, 21.5], [21.5, 25.5], [25.5, 27.5]];
  var LIST = [0, 1, 2, 4, 5, 6, 7];
  var ML = { 4: 20, 6: 150 };   // live counters: [step]: ml

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, p) { return a + (b - a) * p; };
  var prog = function (t, a, d) { return clamp((t - a) / d, 0, 1); };
  var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };
  var easeInOut = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var easeBack = function (p) { var c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  var bounce = function (p) {
    var n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + .75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + .9375;
    return n * (p -= 2.625 / d) * p + .984375;
  };
  var rnd = function (i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  function Anim(cv) {
    var lang = cv.getAttribute("data-lang") === "ar" ? "ar" : "en", L = TXT[lang], rtl = lang === "ar";
    var x = cv.getContext("2d");
    cv.width = S; cv.height = S;
    var out = rtl ? -1 : 1;                       // the side away from the ingredient list
    var gx = rtl ? 330 : S - 330, GT = 300, GB = 860, TW = 170, BW = 132;   // the glass
    var IT = GT + 14, IB = GB - 34;               // inside: top and bottom
    var level = function (l) { return IB - l * (IB - IT); };
    var halfAt = function (y) { return lerp(BW - 10, TW - 10, (IB - y) / (IB - IT)); };
    var didu = new Image(); didu.src = "/img/mascot/didu-party.svg";

    // resting places (deterministic)
    var rest = { mint: [], lime: [], berry: [], ice: [] };
    for (var i = 0; i < 8; i++) rest.mint.push({ x: (rnd(i) - .5) * 170, y: IB - 22 - rnd(i + 20) * 40, r: rnd(i + 40) * 6.28 });
    for (i = 0; i < 3; i++) rest.lime.push({ x: (i - 1) * 70 + (rnd(i + 60) - .5) * 20, y: IB - 52 - rnd(i + 70) * 20, r: (rnd(i + 80) - .5) * 1.6 });
    for (i = 0; i < 4; i++) rest.berry.push({ x: (i - 1.5) * 58 + (rnd(i + 90) - .5) * 14, y: IB - 78 - rnd(i + 100) * 22, r: (rnd(i + 110) - .5) * 1.2 });
    for (i = 0; i < 12; i++) {
      var row = Math.floor(i / 3), col = i % 3, yy = level(.17 + row * .15) - 30;
      rest.ice.push({ x: (col - 1) * (halfAt(yy) * .62) + (rnd(i + 130) - .5) * 18, y: yy + (rnd(i + 140) - .5) * 16, r: (rnd(i + 150) - .5) * .7 });
    }

    // ---------- shapes ----------
    function rr(px, py, w, h, r) { x.beginPath(); x.roundRect(px, py, w, h, r); }
    function leafShape(px, py, s, rot, col) {
      x.save(); x.translate(px, py); x.rotate(rot); x.scale(s, s);
      x.fillStyle = col || C.mint; x.beginPath(); x.moveTo(-28, 0); x.quadraticCurveTo(0, -20, 28, 0); x.quadraticCurveTo(0, 20, -28, 0); x.fill();
      x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2; x.beginPath(); x.moveTo(-24, 0); x.lineTo(24, 0); x.stroke();
      x.restore();
    }
    function limeShape(px, py, s, rot) {
      x.save(); x.translate(px, py); x.rotate(rot); x.scale(s, s);
      x.fillStyle = C.lime; x.beginPath(); x.arc(0, 0, 34, Math.PI, 0); x.closePath(); x.fill();
      x.fillStyle = C.limeIn; x.beginPath(); x.arc(0, 0, 27, Math.PI, 0); x.closePath(); x.fill();
      x.strokeStyle = C.lime; x.lineWidth = 2.5;
      for (var k = 1; k < 5; k++) { var a = Math.PI + k * Math.PI / 5; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); x.stroke(); }
      x.restore();
    }
    function berryShape(px, py, s, rot) {
      x.save(); x.translate(px, py); x.rotate(rot); x.scale(s, s);
      x.fillStyle = C.berry; x.beginPath(); x.moveTo(0, 30); x.bezierCurveTo(-30, 10, -30, -22, -12, -24); x.quadraticCurveTo(0, -27, 12, -24); x.bezierCurveTo(30, -22, 30, 10, 0, 30); x.fill();
      x.fillStyle = "#FFE08A";
      for (var k = 0; k < 9; k++) { x.beginPath(); x.ellipse((rnd(k + 300) - .5) * 30, (rnd(k + 310) - .3) * 34, 1.8, 2.6, 0, 0, 6.28); x.fill(); }
      x.fillStyle = C.mint; x.beginPath(); x.moveTo(-14, -24); x.lineTo(0, -34); x.lineTo(14, -24); x.lineTo(6, -22); x.lineTo(0, -28); x.lineTo(-6, -22); x.fill();
      x.restore();
    }
    function iceShape(px, py, rot, a) {
      x.save(); x.translate(px, py); x.rotate(rot); x.globalAlpha = a;
      x.fillStyle = "rgba(225,244,252,.75)"; rr(-34, -34, 68, 68, 14); x.fill();
      x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 3; x.stroke();
      x.fillStyle = "rgba(255,255,255,.8)"; rr(-22, -24, 18, 30, 8); x.fill();
      x.restore();
    }
    function glassPath(inset) {
      var tw = TW - inset, bw = BW - inset, ty = GT + inset * .2, by = GB - 24 - inset * .5;
      x.beginPath(); x.moveTo(gx - tw, ty); x.lineTo(gx - bw, by - 26); x.quadraticCurveTo(gx - bw, by, gx - bw + 26, by);
      x.lineTo(gx + bw - 26, by); x.quadraticCurveTo(gx + bw, by, gx + bw, by - 26); x.lineTo(gx + tw, ty);
    }

    // ---------- pieces of the scene ----------
    function drop(t, start, i, gap, dur, r, kind, squash) {
      var d = start + .25 + i * gap; if (t < d) return;
      var p = prog(t, d, dur), y0 = GT - 190 - rnd(i + 500) * 60;
      var px = gx + lerp(r.x + (rnd(i + 510) - .5) * 80, r.x, easeOut(p)), py = lerp(y0, r.y, bounce(p));
      var rot = lerp(r.r + 3, r.r, easeOut(p)), s = 1 - (squash || 0) * .7;
      if (squash >= 1) return;
      x.globalAlpha = 1 - (squash || 0);
      if (kind === "mint") leafShape(px, py, s, rot); else if (kind === "lime") limeShape(px, py * 1 + (squash || 0) * 20, s, rot); else berryShape(px, py + (squash || 0) * 20, s, rot);
      x.globalAlpha = 1;
    }
    function liquid(t, mash, syrup, soda) {
      var top = mash + syrup + soda;
      if (top <= 0) return;
      var yTop = level(top), yMash = level(mash + syrup);
      if (soda > 0) {   // the drink: strawberry at the bottom fading to pink at the top
        var g = x.createLinearGradient(0, IB, 0, yTop);
        g.addColorStop(0, "rgba(199,32,56,.95)"); g.addColorStop(clamp((mash + syrup) / top, .05, .9), "rgba(222,64,88,.88)"); g.addColorStop(1, "rgba(255,190,200,.75)");
        x.fillStyle = g; x.fillRect(gx - TW, yTop + Math.sin(t * 5) * 2, TW * 2, IB - yTop + 40);
        x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(gx - TW, yTop - 3 + Math.sin(t * 5) * 2, TW * 2, 6);
      } else {
        x.fillStyle = "rgba(176,24,46,.92)"; x.fillRect(gx - TW, yMash, TW * 2, IB - yMash + 40);
        if (syrup > 0) { x.fillStyle = "rgba(255,197,51,.55)"; x.fillRect(gx - TW, yTop, TW * 2, yMash - yTop + 1); }
      }
      // muddled bits: mint and lime in the mash
      if (mash > 0) for (var k = 0; k < 22; k++) {
        var bx = gx + (rnd(k + 700) - .5) * 220, by = IB - 6 - rnd(k + 710) * (IB - level(mash)) + (soda > 0 ? -Math.max(0, Math.sin(t * .8 + k)) * 8 : 0);
        x.fillStyle = k % 3 ? "rgba(62,155,79,.9)" : "rgba(155,203,60,.9)";
        x.beginPath(); x.ellipse(bx, by, 7 + rnd(k + 720) * 6, 3 + rnd(k + 730) * 3, rnd(k + 740) * 3, 0, 6.28); x.fill();
      }
    }
    function bubbles(t, top) {
      if (top <= .2) return;
      var yTop = level(top);
      for (var k = 0; k < 26; k++) {
        var sp = 60 + rnd(k + 800) * 90, h = IB - yTop, by = IB - ((t * sp + rnd(k + 810) * h) % h), hw = halfAt(by) - 14;
        var bx = gx + (rnd(k + 820) - .5) * 2 * hw + Math.sin(t * 3 + k) * 4;
        x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = 2; x.beginPath(); x.arc(bx, by, 3 + rnd(k + 830) * 5, 0, 6.28); x.stroke();
      }
    }
    function stream(fromX, fromY, toY, w, col, t) {
      if (toY <= fromY) return;
      x.fillStyle = col; x.beginPath();
      x.moveTo(fromX - w / 2, fromY);
      for (var yy = fromY; yy <= toY; yy += 20) x.lineTo(fromX - w / 2 + Math.sin(yy * .05 + t * 20) * 2, yy);
      x.lineTo(fromX + w / 2, toY);
      for (yy = toY; yy >= fromY; yy -= 20) x.lineTo(fromX + w / 2 + Math.sin(yy * .05 + t * 20) * 2, yy);
      x.closePath(); x.fill();
      x.fillStyle = "rgba(255,255,255,.6)"; for (var k = 0; k < 4; k++) { x.beginPath(); x.arc(fromX + (rnd(k + (t * 10 | 0)) - .5) * 30, toY - 4, 4, 0, 6.28); x.fill(); }   // splash
    }
    function jigger(t) {
      var vis = prog(t, 15.5, .4) * (1 - prog(t, 18.2, .3)); if (vis <= 0) return null;
      var tilt = easeInOut(prog(t, 15.9, .4)) * (1 - easeInOut(prog(t, 17.8, .35))) * 1.9, px = gx + out * 120, py = GT - 150;
      x.save(); x.globalAlpha = vis; x.translate(px, py); x.rotate(-out * tilt);
      var g = x.createLinearGradient(-40, 0, 40, 0); g.addColorStop(0, "#9AA3A8"); g.addColorStop(.5, "#E6EBEE"); g.addColorStop(1, "#8C969B");
      x.fillStyle = g; x.beginPath(); x.moveTo(-34, -60); x.lineTo(34, -60); x.lineTo(8, 0); x.lineTo(34, 60); x.lineTo(-34, 60); x.lineTo(-8, 0); x.closePath(); x.fill();
      x.fillStyle = "rgba(255,197,51,.9)"; x.beginPath(); x.moveTo(-28, -54); x.lineTo(28, -54); x.lineTo(6, -6); x.lineTo(-6, -6); x.closePath(); x.fill();
      x.restore();
      return tilt > 1.4 ? { x: px - out * 62, y: py + 20 } : null;   // the lip when it pours
    }
    function bottle(t) {
      var vis = prog(t, 21.4, .4) * (1 - prog(t, 25.2, .3)); if (vis <= 0) return null;
      var tilt = easeInOut(prog(t, 21.7, .5)) * (1 - easeInOut(prog(t, 24.8, .4))) * 2.1, px = gx + out * 150, py = GT - 140;
      x.save(); x.globalAlpha = vis; x.translate(px, py); x.rotate(-out * tilt);
      x.fillStyle = "rgba(126,177,67,.85)";
      x.beginPath(); x.moveTo(-14, -150); x.lineTo(14, -150); x.lineTo(14, -100); x.quadraticCurveTo(44, -80, 44, -40); x.lineTo(44, 110); x.quadraticCurveTo(44, 130, 24, 130);
      x.lineTo(-24, 130); x.quadraticCurveTo(-44, 130, -44, 110); x.lineTo(-44, -40); x.quadraticCurveTo(-44, -80, -14, -100); x.closePath(); x.fill();
      x.fillStyle = C.sunSoft; rr(-44, -10, 88, 70, 6); x.fill();
      x.fillStyle = C.ink; x.font = "700 22px 'Readex Pro', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("SODA", 0, 26);
      x.fillStyle = "rgba(255,255,255,.5)"; rr(-34, -70, 10, 170, 5); x.fill();
      x.restore();
      return tilt > 1.6 ? { x: px - out * Math.sin(tilt) * 150, y: py - Math.cos(tilt) * 150 + 10 } : null;
    }
    function muddler(t) {
      var vin = easeOut(prog(t, 12, .6)), vout = easeInOut(prog(t, 14.8, .6)); if (t < 12 || vout >= 1) return;
      var press = t > 12.6 && t < 14.8 ? Math.abs(Math.sin((t - 12.6) * Math.PI * 1.8)) * 50 : 0;
      var y = lerp(-420, IB - 330, vin) + press - vout * 500;
      x.save(); x.translate(gx, y);
      var g = x.createLinearGradient(-18, 0, 18, 0); g.addColorStop(0, "#9C6B30"); g.addColorStop(.5, "#C8914A"); g.addColorStop(1, "#8A5A22");
      x.fillStyle = g; rr(-16, 0, 32, 300, 14); x.fill(); rr(-24, 280, 48, 26, 10); x.fill();
      x.restore();
    }
    function straw(t) {
      var p = easeOut(prog(t, 25.6, .8)); if (p <= 0) return;
      x.save(); x.translate(gx + out * 40, level(.82)); x.rotate(out * .22); x.translate(0, -(1 - p) * 500);   // slides down into the glass
      x.beginPath(); x.rect(-11, -250, 22, 390); x.clip();
      for (var k = -250; k < 140; k += 28) { x.fillStyle = (k / 28 & 1) ? C.sun : C.ink; x.fillRect(-11, k, 22, 28); }
      x.restore();
    }
    function garnish(t) {
      var p = prog(t, 26.2, .7); if (p > 0) {   // strawberry slice on the rim
        var rx = gx - out * (TW - 6), ry = lerp(GT - 260, GT + 2, bounce(p));
        x.save(); x.translate(rx, ry); x.rotate(-out * .3);
        x.fillStyle = C.berry; x.beginPath(); x.moveTo(0, 46); x.bezierCurveTo(-46, 20, -44, -36, 0, -40); x.bezierCurveTo(44, -36, 46, 20, 0, 46); x.fill();
        x.fillStyle = "#FF8FA0"; x.beginPath(); x.moveTo(0, 34); x.bezierCurveTo(-32, 14, -30, -24, 0, -28); x.bezierCurveTo(30, -24, 32, 14, 0, 34); x.fill();
        x.fillStyle = C.cream; x.fillRect(-6, -42, 12, 30);   // the notch that sits on the rim
        x.restore();
      }
      var q = prog(t, 26.6, .7); if (q > 0) {   // mint sprig on top
        var sy = lerp(GT - 300, level(.86) - 20, bounce(q));
        leafShape(gx - out * 20, sy, 1.1, -.9); leafShape(gx + out * 16, sy - 6, 1.1, .9 + 3.14); leafShape(gx, sy - 22, 1, -1.57, C.mintDark);
      }
    }

    // ---------- frame ----------
    function draw(t) {
      t = clamp(t, 0, T);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = C.cream; x.fillRect(0, 0, S, S);
      // soft sun glow behind the glass
      var gl = x.createRadialGradient(gx, 560, 40, gx, 560, 420); gl.addColorStop(0, "rgba(255,209,92,.55)"); gl.addColorStop(1, "rgba(255,209,92,0)");
      x.fillStyle = gl; x.fillRect(0, 0, S, S);
      x.direction = rtl ? "rtl" : "ltr";

      // title
      var tp = easeBack(prog(t, .2, .7));
      x.save(); x.globalAlpha = clamp(tp, 0, 1); x.textAlign = rtl ? "right" : "left";
      var tx = rtl ? S - 64 : 64;
      x.fillStyle = C.deep; x.font = "400 74px Lalezar, 'Readex Pro', sans-serif"; x.fillText(L.title, tx, 118 + (1 - tp) * 30);
      x.fillStyle = C.ink2; x.font = "500 30px 'Readex Pro', sans-serif"; x.fillText(L.sub, tx, 168 + (1 - tp) * 30);
      x.restore();

      // ingredient list
      var lx = rtl ? S - 64 - 390 : 64, ly = 222, lw = 390, lp = easeOut(prog(t, .6, .8));
      x.save(); x.globalAlpha = lp; x.translate((1 - lp) * -out * -40, 0);
      x.shadowColor = "rgba(58,40,13,.18)"; x.shadowBlur = 30; x.shadowOffsetY = 12;
      x.fillStyle = "#fff"; rr(lx, ly, lw, 620, 28); x.fill(); x.shadowColor = "transparent";
      x.textAlign = rtl ? "right" : "left";
      var inX = rtl ? lx + lw - 30 : lx + 30, endX = rtl ? lx + 30 : lx + lw - 30;
      x.fillStyle = C.leaf; x.font = "700 26px 'Readex Pro', sans-serif"; x.fillText(L.list, inX, ly + 52);
      for (var r = 0; r < LIST.length; r++) {
        var st = LIST[r], s = STEPS[st], ry = ly + 86 + r * 74, active = t >= s[0] && t < s[1], done = t >= s[1];
        if (active) { x.fillStyle = C.sunSoft; rr(lx + 14, ry, lw - 28, 62, 16); x.fill(); }
        var cx = rtl ? lx + lw - 46 : lx + 46;
        x.beginPath(); x.arc(cx, ry + 31, 15, 0, 6.28);
        if (done) { x.fillStyle = C.leaf2; x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 7, ry + 31); x.lineTo(cx - 2, ry + 37); x.lineTo(cx + 8, ry + 25); x.stroke(); }
        else { x.strokeStyle = active ? C.ink : C.line; x.lineWidth = 3; x.stroke(); }
        x.textAlign = rtl ? "right" : "left"; x.fillStyle = done || active ? C.deep : C.ink3;
        x.font = (active ? "700 " : "500 ") + "27px 'Readex Pro', sans-serif"; x.fillText(L.steps[st][0], rtl ? cx - 30 : cx + 30, ry + 41);
        x.textAlign = rtl ? "left" : "right"; x.fillStyle = active ? C.ink : C.ink3; x.font = "600 23px 'Readex Pro', sans-serif";
        x.fillText(L.steps[st][1], endX, ry + 41);
      }
      x.restore();

      // the glass: back, contents, front
      var gp = prog(t, .4, 1.4);
      x.save(); x.globalAlpha = easeOut(gp);
      glassPath(0); x.closePath(); x.fillStyle = "rgba(255,255,255,.55)"; x.fill();
      x.fillStyle = "rgba(255,255,255,.7)"; rr(gx - BW + 6, GB - 34, (BW - 6) * 2, 34, 12); x.fill();   // thick base
      x.restore();

      var mash = .12 * easeInOut(prog(t, 12.8, 2)), syrup = .05 * prog(t, 16.15, 1.6), soda = (.86 - .17) * easeInOut(prog(t, 22.2, 2.7));
      var squash = prog(t, 12.8, 1.6);
      x.save(); glassPath(10); x.closePath(); x.clip();
      liquid(t, mash, syrup, soda);
      for (var i = 0; i < 8; i++) drop(t, STEPS[0][0], i, .28, .9, rest.mint[i], "mint", squash);
      for (i = 0; i < 3; i++) drop(t, STEPS[1][0], i, .5, .9, rest.lime[i], "lime", squash);
      for (i = 0; i < 4; i++) drop(t, STEPS[2][0], i, .4, .9, rest.berry[i], "berry", squash);
      for (i = 0; i < 12; i++) {
        var d = STEPS[5][0] + .2 + i * .17; if (t < d) continue;
        var p = prog(t, d, .7), r2 = rest.ice[i];
        iceShape(gx + r2.x, lerp(GT - 220, r2.y, bounce(p)), lerp(r2.r + 1.5, r2.r, p), soda > 0 ? .85 : 1);
      }
      bubbles(t, soda > 0 ? .17 + soda : 0);
      x.restore();

      muddler(t);
      var lip = jigger(t); if (lip && t < 17.9) stream(lip.x, lip.y, level(.12 + syrup) , 9, "rgba(255,197,51,.9)", t);
      var spout = bottle(t); if (spout && t < 25) stream(spout.x, spout.y, level(.17 + soda), 15, "rgba(235,248,252,.85)", t);
      straw(t);

      // glass front: outline and shine
      x.save(); x.globalAlpha = easeOut(gp);
      glassPath(0); x.strokeStyle = "rgba(84,58,20,.55)"; x.lineWidth = 6; x.lineJoin = "round"; x.stroke();
      x.fillStyle = "rgba(255,255,255,.45)"; x.beginPath(); x.moveTo(gx - TW + 30, GT + 30); x.lineTo(gx - TW + 50, GT + 30); x.lineTo(gx - BW + 40, GB - 90); x.lineTo(gx - BW + 24, GB - 90); x.closePath(); x.fill();
      x.restore();
      garnish(t);

      // step chip with a live ml counter
      var cur = -1; for (var k = 0; k < STEPS.length; k++) if (t >= STEPS[k][0] && t < STEPS[k][1]) cur = k;
      if (cur >= 0) {
        var a = Math.min(prog(t, STEPS[cur][0], .3), 1 - prog(t, STEPS[cur][1] - .25, .25)), amount = L.steps[cur][1];
        if (ML[cur]) { var pr = cur === 4 ? prog(t, 16.15, 1.6) : easeInOut(prog(t, 22.2, 2.7)); amount = L.ml.replace("{n}", Math.round(ML[cur] * pr)); }
        var label = L.step.replace("{n}", cur + 1).replace("{t}", STEPS.length);
        x.save(); x.globalAlpha = a; x.translate(0, (1 - a) * 16);
        x.font = "700 34px 'Readex Pro', sans-serif"; var w1 = x.measureText(L.steps[cur][0] + "  ·  " + amount).width;
        var cw = Math.max(w1, 220) + 70, cx2 = gx, cy = GB + 26;
        x.shadowColor = "rgba(58,40,13,.25)"; x.shadowBlur = 20; x.shadowOffsetY = 8;
        x.fillStyle = C.ink; rr(cx2 - cw / 2, cy, cw, 96, 26); x.fill(); x.shadowColor = "transparent";
        x.textAlign = "center"; x.fillStyle = C.sun; x.font = "600 22px 'Readex Pro', sans-serif"; x.fillText(label, cx2, cy + 34);
        x.fillStyle = "#fff"; x.font = "700 34px 'Readex Pro', sans-serif"; x.fillText(L.steps[cur][0] + "  ·  " + amount, cx2, cy + 76);
        x.restore();
      }

      // the end: Didu and "Enjoy!"
      var e = prog(t, 27.6, .7);
      if (e > 0) {
        var sc = easeBack(e);
        x.save(); x.textAlign = "center"; x.translate(gx, GB + 74); x.scale(sc, sc);
        x.fillStyle = C.leaf; x.font = "400 70px Lalezar, 'Readex Pro', sans-serif"; x.fillText(L.enjoy, 0, 0);
        x.restore();
        if (didu.complete && didu.naturalWidth) {
          var ds = 200 * easeBack(prog(t, 27.9, .6)), dx = gx + out * (TW + 40);
          x.drawImage(didu, dx - ds / 2, GB - 170 - ds / 2, ds, ds);
        }
        for (k = 0; k < 18; k++) {   // confetti
          var cp = prog(t, 27.7 + rnd(k + 900) * .5, 1.6), ang = rnd(k + 910) * 6.28, dist = 80 + cp * (200 + rnd(k + 920) * 160);
          if (cp <= 0 || cp >= 1) continue;
          x.globalAlpha = 1 - cp; x.fillStyle = [C.sun, C.leaf2, C.berry, C.ink][k % 4];
          x.save(); x.translate(gx + Math.cos(ang) * dist, GT + 120 + Math.sin(ang) * dist * .7 + cp * 60); x.rotate(cp * 8 + k); x.fillRect(-7, -4, 14, 8); x.restore();
        }
        x.globalAlpha = 1;
      }

      // progress and brand
      var px = 64, pw = S - 128, py = S - 54;
      x.fillStyle = C.line; rr(px, py, pw, 10, 5); x.fill();
      x.fillStyle = C.sun2; var fw = pw * t / T; if (rtl) { rr(px + pw - fw, py, fw, 10, 5); } else { rr(px, py, fw, 10, 5); } x.fill();
      x.textAlign = rtl ? "left" : "right"; x.fillStyle = C.ink3; x.font = "600 22px 'Readex Pro', sans-serif"; x.direction = "ltr";
      x.textAlign = rtl ? "left" : "right"; x.fillText(L.brand, rtl ? 64 : S - 64, py - 16);

      // fade between loops
      var f = Math.max(1 - prog(t, 0, .35), prog(t, T - .4, .4));
      if (f > 0) { x.fillStyle = "rgba(255,249,235," + f + ")"; x.fillRect(0, 0, S, S); }
    }

    // ---------- playback ----------
    var t0 = 0, at = 0, playing = false, raf = 0;
    function tick(now) {
      if (!playing) return;
      at = ((now - t0) / 1000) % T;
      draw(at); raf = requestAnimationFrame(tick);
    }
    var api = {
      draw: draw,
      play: function () { if (playing) return; playing = true; t0 = performance.now() - at * 1000; raf = requestAnimationFrame(tick); cv.dispatchEvent(new Event("recipe-state")); },
      pause: function () { playing = false; cancelAnimationFrame(raf); cv.dispatchEvent(new Event("recipe-state")); },
      seek: function (s) { at = clamp(s, 0, T); draw(at); },
      get playing() { return playing; }, duration: T
    };
    cv.recipe = api;
    return api;
  }

  function init() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll("canvas.recipe-anim").forEach(function (cv) {
      var a = Anim(cv), btn = cv.parentNode.querySelector(".recipe-btn"), userPaused = reduce;
      var redraw = function () { if (!a.playing) a.seek(reduce ? 29 : 0); };
      if (document.fonts && document.fonts.load) Promise.all([document.fonts.load("74px Lalezar", "موهيتو Mojito"), document.fonts.load("700 30px 'Readex Pro'", "نعناع mint")]).then(redraw, redraw);
      a.seek(reduce ? 29 : 0);
      var sync = function () { if (!btn) return; btn.setAttribute("aria-pressed", a.playing ? "true" : "false"); btn.setAttribute("aria-label", btn.getAttribute(a.playing ? "data-pause" : "data-play")); };
      cv.addEventListener("recipe-state", sync);
      if (btn) btn.addEventListener("click", function () { if (a.playing) { a.pause(); userPaused = true; } else { userPaused = false; a.play(); } });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !userPaused) a.play(); else if (!e.isIntersecting) a.pause(); }); }, { threshold: .35 }).observe(cv);
      } else if (!reduce) a.play();
      sync();
    });
  }
  window.FoodiduRecipe = { init: init, Anim: Anim };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
