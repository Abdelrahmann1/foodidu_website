/* Free QR code tool (/business/qr-menu-generator/): a live table card (SVG), PNG downloads and a print sheet of 4 cards.
   Everything happens in the browser: the menu link is never sent anywhere. Needs window.FoodiduQR (static/js/qr.js). */
(function () {
  "use strict";
  var form = document.getElementById("qr-form");
  if (!form || !window.FoodiduQR) return;
  var QR = window.FoodiduQR;
  var DATA = {};
  try { DATA = JSON.parse(document.getElementById("fd-data").textContent); } catch (e) {}
  var S = DATA.qr || {};
  var NS = "http://www.w3.org/2000/svg";
  var rtl = document.documentElement.dir === "rtl";
  var $ = function (id) { return document.getElementById(id); };
  var url = $("qr-url"), err = $("qr-url-err"), note = $("qr-note"), box = $("qr-card");
  var btnCard = $("qr-dl-card"), btnCode = $("qr-dl-code"), btnPrint = $("qr-print");
  var SAMPLE = "https://foodidu.com" + (rtl ? "/ar/business/" : "/business/");
  var BROWN = "#543A14", DEEP = "#3A280D", SUN = "#FFD15C";
  var current = null;   // { link, q } once a real link is in

  // "instagram.com/x" -> "https://instagram.com/x"; null when it is not a web link
  function normalise(v) {
    v = v.trim();
    if (!v) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
    try {
      var u = new URL(v);
      return /^https?:$/.test(u.protocol) && u.hostname.indexOf(".") > 0 ? u.href : null;
    } catch (e) { return null; }
  }
  function opts() {
    var pick = function (name, def) { var i = form.querySelector('[name="' + name + '"]:checked'); return i ? i.value : def; };
    return { name: $("qr-name").value.trim() || S.namePh || "", text: $("qr-text").value.trim(), table: $("qr-table").value.trim(),
      style: pick("qr-style", "sun"), color: pick("qr-color", DEEP), didu: $("qr-didu").checked, credit: $("qr-credit").checked };
  }
  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // The table card, 600 x 840: "Menu" up the side (start side), name, the code in a framed window, the line under it,
  // the table number, Didu in the bottom corner and a small credit.
  function card(q, o) {
    var sun = o.style === "sun", dir = rtl ? "rtl" : "ltr";
    var cx = rtl ? 250 : 350, fx = cx - 180, fy = 150, L = 58, g = 14;
    var svg = el("svg", { viewBox: "0 0 600 840", width: "600", height: "840" });
    svg.appendChild(el("rect", { x: 2, y: 2, width: 596, height: 836, rx: 40, fill: sun ? SUN : "#fff", stroke: sun ? "none" : "#E4CF9E", "stroke-width": 4 }));
    svg.appendChild(el("text", { transform: "translate(" + (rtl ? 530 : 70) + " 420) rotate(-90)", "text-anchor": "middle", "dominant-baseline": "central",
      "font-family": "Lalezar, 'Readex Pro', sans-serif", "font-size": 130, fill: sun ? BROWN : SUN }, S.word || "MENU"));
    if (o.name) svg.appendChild(el("text", { x: cx, y: 108, "text-anchor": "middle", direction: dir, "font-family": "'Readex Pro', sans-serif", "font-weight": 700,
      "font-size": 44, fill: DEEP, "data-max": 380 }, o.name));
    svg.appendChild(el("rect", { x: fx, y: fy, width: 360, height: 360, rx: 30, fill: "#fff" }));
    var x0 = fx - g, y0 = fy - g, x1 = fx + 360 + g, y1 = fy + 360 + g;
    svg.appendChild(el("path", { d: "M" + x0 + " " + (y0 + L) + "V" + y0 + "H" + (x0 + L) + "M" + (x1 - L) + " " + y0 + "H" + x1 + "V" + (y0 + L) +
      "M" + x0 + " " + (y1 - L) + "V" + y1 + "H" + (x0 + L) + "M" + (x1 - L) + " " + y1 + "H" + x1 + "V" + (y1 - L),
      fill: "none", stroke: sun ? BROWN : o.color, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    var n = q.size + 8, grp = el("g", { transform: "translate(" + (fx + 15) + " " + (fy + 15) + ") scale(" + (330 / n) + ")" });
    grp.appendChild(el("path", { d: QR.svgPath(q, 4), fill: o.color, "shape-rendering": "crispEdges" }));
    svg.appendChild(grp);
    if (o.text) svg.appendChild(el("text", { x: cx, y: 576, "text-anchor": "middle", direction: dir, "font-family": "'Readex Pro', sans-serif", "font-weight": 700,
      "font-size": 34, fill: DEEP, "data-max": 400 }, o.text));
    if (o.table) {
      svg.appendChild(el("rect", { x: cx - 115, y: 608, width: 230, height: 60, rx: 30, fill: sun ? BROWN : SUN }));
      svg.appendChild(el("text", { x: cx, y: 639, "text-anchor": "middle", "dominant-baseline": "central", direction: dir, "font-family": "'Readex Pro', sans-serif",
        "font-weight": 700, "font-size": 28, fill: sun ? SUN : DEEP, "data-max": 200 }, (S.table || "{n}").replace("{n}", o.table)));
    }
    if (o.didu) svg.appendChild(el("image", { href: "/img/mascot/didu.svg", x: rtl ? 10 : 390, y: 626, width: 200, height: 200 }));
    if (o.credit) svg.appendChild(el("text", { x: rtl ? 556 : 44, y: 800, "text-anchor": rtl ? "end" : "start", "font-family": "'Readex Pro', sans-serif",
      "font-weight": 600, "font-size": 20, fill: DEEP, "fill-opacity": 0.6 }, S.credit || "Foodidu Business"));
    return svg;
  }
  // long names and lines shrink until they fit
  function fit(svg) {
    svg.querySelectorAll("text[data-max]").forEach(function (t) {
      var size = +t.getAttribute("font-size"), max = +t.getAttribute("data-max");
      while (size > 16 && t.getComputedTextLength() > max) { size -= 2; t.setAttribute("font-size", size); }
    });
  }

  function render() {
    var raw = url.value, link = normalise(raw), q = null, msg = "";
    if (raw.trim() && link === null) msg = S.bad;
    else if (link) { q = QR.encode(link); if (!q) msg = S.long; }
    err.textContent = msg || "";
    err.hidden = !msg;
    url.setAttribute("aria-invalid", msg ? "true" : "false");
    current = q ? { link: link, q: q } : null;
    var svg = card(q || QR.encode(SAMPLE), opts());
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", q ? link : (S.sample || ""));
    box.replaceChildren(svg);
    fit(svg);
    [btnCard, btnCode, btnPrint].forEach(function (b) { b.disabled = !q; });
    note.textContent = q ? S.ready : S.sample;
    note.classList.toggle("ok", !!q);
  }
  var timer;
  var later = function () { clearTimeout(timer); timer = setTimeout(render, 120); };
  form.addEventListener("input", later);
  form.addEventListener("change", later);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();
  if (document.fonts && document.fonts.load) {   // measure the texts again once the fonts are in
    Promise.all([document.fonts.load("130px Lalezar", S.word || "MENU"), document.fonts.load("700 44px 'Readex Pro'", S.namePh || "Foodidu")]).then(render, function () {});
  }

  // ---------- downloads and printing ----------
  function b64(buf) {
    var s = "", a = new Uint8Array(buf);
    for (var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fetch64(path) { return fetch(path).then(function (r) { if (!r.ok) throw new Error(path); return r.arrayBuffer(); }).then(b64); }
  // the card PNG is drawn from the SVG, so its fonts go inside it (the same files as static/css/site.css)
  var AR = "U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFC";
  var LAT = "U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122";
  var fonts = null;
  function fontCss() {
    if (!fonts) fonts = Promise.all([
      ["Lalezar", "400", "/fonts/lalezar-arabic-v16.woff2", AR], ["Lalezar", "400", "/fonts/lalezar-latin-v16.woff2", LAT],
      ["Readex Pro", "300 700", "/fonts/readex-pro-arabic-v27.woff2", AR], ["Readex Pro", "300 700", "/fonts/readex-pro-latin-v27.woff2", LAT]
    ].map(function (f) {
      return fetch64(f[2]).then(function (d) { return '@font-face{font-family:"' + f[0] + '";font-weight:' + f[1] + ";src:url(data:font/woff2;base64," + d + ') format("woff2");unicode-range:' + f[3] + "}"; }, function () { return ""; });
    })).then(function (a) { return a.join(""); });
    return fonts;
  }
  function loadImg(src) {
    return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { setTimeout(function () { ok(i); }, 80); }; i.onerror = no; i.src = src; });
  }
  function toBlob(c) { return new Promise(function (ok) { c.toBlob(ok, "image/png"); }); }
  function save(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function fileName(kind) {
    var n = $("qr-name").value.trim().toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
    return (n ? n + "-" : "") + "menu-qr" + (kind === "card" ? "-card" : "") + ".png";
  }
  function track(kind) { try { if (typeof window.gtag === "function") window.gtag("event", "qr_tool_download", { kind: kind }); } catch (e) {} }

  function cardPng() {
    var svg = box.querySelector("svg"), copy = svg.cloneNode(true);
    return Promise.all([fontCss(), copy.querySelector("image") ? fetch64("/img/mascot/didu.svg") : ""]).then(function (r) {
      copy.insertBefore(el("style", {}, r[0]), copy.firstChild);
      var im = copy.querySelector("image");
      if (im) im.setAttribute("href", "data:image/svg+xml;base64," + r[1]);
      copy.setAttribute("width", "1200"); copy.setAttribute("height", "1680");
      return loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copy)));
    }).then(function (img) {
      var c = document.createElement("canvas");
      c.width = 1200; c.height = 1680;
      var x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      return toBlob(c);
    });
  }
  function codePng() {
    var q = current.q, n = q.size + 8, px = Math.max(8, Math.floor(1024 / n)), c = document.createElement("canvas");
    c.width = c.height = n * px;
    var x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = opts().color;
    for (var y = 0; y < q.size; y++) for (var i = 0; i < q.size; i++) if (q.mod[y][i]) x.fillRect((i + 4) * px, (y + 4) * px, px, px);
    return toBlob(c);
  }
  btnCard.addEventListener("click", function () {
    if (!current) return;
    btnCard.disabled = true;
    cardPng().then(function (b) { save(b, fileName("card")); track("card"); }, function () {}).then(function () { btnCard.disabled = !current; });
  });
  btnCode.addEventListener("click", function () {
    if (!current) return;
    codePng().then(function (b) { save(b, fileName("code")); track("code"); });
  });
  btnPrint.addEventListener("click", function () {
    if (!current) return;
    var old = document.querySelector(".qr-print");
    if (old) old.remove();
    var sheet = document.createElement("div"), svg = box.querySelector("svg");
    sheet.className = "qr-print";
    sheet.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 4; i++) sheet.appendChild(svg.cloneNode(true));
    document.body.appendChild(sheet);
    track("print");
    window.print();
  });
})();
