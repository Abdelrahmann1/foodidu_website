/* Foodidu QR code maker: byte mode, error correction level M, versions 1-10 (links up to 213 bytes).
   Follows the QR spec (ISO/IEC 18004) the same way Project Nayuki's reference library does.
   Browser: window.FoodiduQR.encode(text) -> { size, ver, mask, mod: rows of booleans } (null if too long).
   Node: require("./static/js/qr.js") (tools/qr.js uses it for the example stands and its self-test). */
(function (root) {
  "use strict";
  // level M, index = version
  var EC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  var MAX_VER = 10;

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z;
  }
  function rsDivisor(degree) {
    var r = [], i, j, root = 1;
    for (i = 0; i < degree; i++) r.push(0);
    r[degree - 1] = 1;
    for (i = 0; i < degree; i++) {
      for (j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }
  function rawModules(ver) {   // modules left for data after the function patterns
    var n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) { var a = Math.floor(ver / 7) + 2; n -= (25 * a - 10) * a - 55; if (ver >= 7) n -= 36; }
    return n;
  }
  function alignPositions(ver) {
    if (ver === 1) return [];
    var a = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (a * 2 - 2)) * 2, out = [6];
    for (var pos = ver * 4 + 10; out.length < a; pos -= step) out.splice(1, 0, pos);
    return out;
  }
  function dataCodewords(ver) { return Math.floor(rawModules(ver) / 8) - EC_PER_BLOCK[ver] * BLOCKS[ver]; }
  function formatBits(eclBits, mask) {
    var data = (eclBits << 3) | mask, rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }
  function versionBits(ver) {
    var rem = ver;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (ver << 12) | rem;
  }
  function utf8(text) {
    var out = [], s = unescape(encodeURIComponent(text));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encode(text) {
    var bytes = utf8(text), ver, i, j;
    for (ver = 1; ver <= MAX_VER; ver++) if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    if (ver > MAX_VER) return null;
    var nData = dataCodewords(ver), bits = [];
    var put = function (v, n) { for (var k = n - 1; k >= 0; k--) bits.push((v >>> k) & 1); };
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, nData * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    var data = [];
    for (i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (var p = 0xec; data.length < nData; p ^= 0xec ^ 0x11) data.push(p);

    // error correction per block, then interleave
    var nBlocks = BLOCKS[ver], ecLen = EC_PER_BLOCK[ver], raw = Math.floor(rawModules(ver) / 8);
    var nShort = nBlocks - raw % nBlocks, shortLen = Math.floor(raw / nBlocks), div = rsDivisor(ecLen), blocks = [];
    for (i = 0, j = 0; i < nBlocks; i++) {
      var dat = data.slice(j, j + shortLen - ecLen + (i < nShort ? 0 : 1));
      j += dat.length;
      var ec = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ec));
    }
    var all = [];
    for (i = 0; i < blocks[0].length; i++) for (j = 0; j < blocks.length; j++) if (i !== shortLen - ecLen || j >= nShort) all.push(blocks[j][i]);

    var size = ver * 4 + 17, mod = [], fn = [];
    for (i = 0; i < size; i++) { mod.push([]); fn.push([]); for (j = 0; j < size; j++) { mod[i].push(false); fn[i].push(false); } }
    var set = function (x, y, d) { mod[y][x] = d; fn[y][x] = true; };
    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }   // timing
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {                        // finders + separators
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var x = c[0] + dx, y = c[1] + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    });
    var al = alignPositions(ver), n = al.length;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) set(al[i] + ax, al[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
    }
    if (ver >= 7) {
      var vb = versionBits(ver);
      for (i = 0; i < 18; i++) { var on = ((vb >>> i) & 1) === 1, a = size - 11 + i % 3, b = Math.floor(i / 3); set(a, b, on); set(b, a, on); }
    }
    var drawFormat = function (mask) {
      var fb = formatBits(0, mask), g = function (k) { return ((fb >>> k) & 1) === 1; }, k;   // level M = 00
      for (k = 0; k <= 5; k++) set(8, k, g(k));
      set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
      for (k = 9; k < 15; k++) set(14 - k, 8, g(k));
      for (k = 0; k < 8; k++) set(size - 1 - k, 8, g(k));
      for (k = 8; k < 15; k++) set(8, size - 15 + k, g(k));
      set(8, size - 8, true);
    };
    drawFormat(0);
    var bit = 0;   // data in the zigzag order
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var v = 0; v < size; v++) for (var t = 0; t < 2; t++) {
        var x = right - t, y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
        if (!fn[y][x] && bit < all.length * 8) { mod[y][x] = ((all[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1; bit++; }
      }
    }
    var MASKS = [
      function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; },
      function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
      function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; }, function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
      function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
    ];
    var applyMask = function (m) { for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) if (!fn[yy][xx] && MASKS[m](xx, yy)) mod[yy][xx] = !mod[yy][xx]; };
    var penalty = function () {   // rules 1, 2 and 4 (any mask decodes; this only picks a tidy one)
      var pts = 0, dark = 0, a2, b2, run, c;
      for (var tt = 0; tt < 2; tt++) for (a2 = 0; a2 < size; a2++) {
        run = 1;
        for (b2 = 1; b2 < size; b2++) {
          c = tt ? mod[b2][a2] : mod[a2][b2];
          if (c === (tt ? mod[b2 - 1][a2] : mod[a2][b2 - 1])) { run++; if (run === 5) pts += 3; else if (run > 5) pts++; } else run = 1;
        }
      }
      for (a2 = 0; a2 < size - 1; a2++) for (b2 = 0; b2 < size - 1; b2++) { c = mod[a2][b2]; if (c === mod[a2][b2 + 1] && c === mod[a2 + 1][b2] && c === mod[a2 + 1][b2 + 1]) pts += 3; }
      for (a2 = 0; a2 < size; a2++) for (b2 = 0; b2 < size; b2++) if (mod[a2][b2]) dark++;
      return pts + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    };
    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) { applyMask(m); drawFormat(m); var pv = penalty(); if (pv < bestP) { bestP = pv; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return { size: size, ver: ver, mask: best, mod: mod };
  }

  // SVG path of the dark modules (quiet zone of `quiet` modules around)
  function svgPath(q, quiet) {
    var d = "";
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.mod[y][x]) d += "M" + (x + quiet) + " " + (y + quiet) + "h1v1h-1z";
    return d;
  }

  var api = { encode: encode, svgPath: svgPath, maxBytes: function () { return dataCodewords(MAX_VER) - 3; },
    _test: { gfMul: gfMul, rsDivisor: rsDivisor, rsRemainder: rsRemainder, formatBits: formatBits, versionBits: versionBits, dataCodewords: dataCodewords, alignPositions: alignPositions } };
  if (typeof module === "object" && module.exports) module.exports = api; else root.FoodiduQR = api;
})(this);
