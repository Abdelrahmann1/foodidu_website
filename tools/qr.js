// Tiny QR code maker for the Foodidu Business illustrations (byte mode, error correction M, versions 1-3, one RS block).
//   node tools/qr.js          -> static/img/biz/qr-en.svg and qr-ar.svg (they open foodidu.com/business/ and /ar/business/)
//   node tools/qr.js --test   -> checks Reed-Solomon and the format bits against published examples
// Follows the QR spec (ISO/IEC 18004) the same way Project Nayuki's reference library does.
const fs = require("fs");

// version -> [data codewords, EC codewords] at level M; versions 1-3 are a single block (up to 42 bytes)
const M = { 1: [16, 10], 2: [28, 16], 3: [44, 26] };
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22] };

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z;
}
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gfMul(root, 2);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = div.map(() => 0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
  return r;
}
function formatBits(eclBits, mask) {
  const data = (eclBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function encode(text) {
  const bytes = [...Buffer.from(text, "utf8")];
  let ver = 1;
  while (ver <= 3 && bytes.length > M[ver][0] - 2) ver++;   // 4 mode bits + 8 count bits ≈ 2 bytes of overhead
  if (ver > 3) throw new Error("text too long for this small encoder");
  const [nData, nEc] = M[ver];
  // data bits: mode 0100, 8-bit length, bytes, terminator, pad
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, nData * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xec; data.length < nData; p ^= 0xec ^ 0x11) data.push(p);
  const all = data.concat(rsRemainder(data, rsDivisor(nEc)));

  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
  // timing patterns
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  // finder patterns (with separators)
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]])
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  // alignment patterns
  const al = ALIGN[ver];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // reserve the format areas (real bits drawn after masking) and the dark module
  const drawFormat = (mask) => {
    const b = formatBits(0, mask);   // level M = 00
    const g = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i));
    set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  // codewords in the zigzag order
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
      if (!fn[y][x] && k < all.length * 8) { mod[y][x] = ((all[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }
  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
  // penalty (rules 1, 2 and 4; rule 3 is left out: any mask decodes, this only picks a tidy-looking one)
  const penalty = () => {
    let p = 0;
    for (let t = 0; t < 2; t++) for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b2 = 1; b2 < size; b2++) {
        const c = t ? mod[b2][a] : mod[a][b2], prev = t ? mod[b2 - 1][a] : mod[a][b2 - 1];
        if (c === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
      }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
    const dark = mod.flat().filter(Boolean).length, total = size * size;
    p += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  return { size, mod, ver, mask: best };
}

function svg({ size, mod }, quiet = 4) {
  const n = size + quiet * 2;
  let d = "";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mod[y][x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path fill="#0D1F17" d="${d}"/></svg>\n`;
}

if (process.argv.includes("--test")) {
  // Thonky's "HELLO WORLD" 1-M example: these 16 data codewords give these 10 EC codewords
  const ec = rsRemainder([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], rsDivisor(10));
  console.log("RS", ec.join(",") === "196,35,39,119,235,215,231,226,93,23" ? "ok" : "FAIL " + ec);
  // format strings from the spec table: L/mask 0, M/mask 0, M/mask 4, H/mask 7
  const f = (e, m) => formatBits(e, m).toString(2).padStart(15, "0");
  console.log("format", f(1, 0) === "111011111000100" && f(0, 0) === "101010000010010" && f(0, 4) === "100010111111001" && f(2, 7) === "000100000111011" ? "ok" : `FAIL ${f(1, 0)} ${f(0, 0)} ${f(0, 4)} ${f(2, 7)}`);
} else {
  fs.mkdirSync("static/img/biz", { recursive: true });
  for (const [l, url] of [["en", "https://foodidu.com/business/"], ["ar", "https://foodidu.com/ar/business/"]]) {
    const q = encode(url);
    fs.writeFileSync(`static/img/biz/qr-${l}.svg`, svg(q));
    console.log(`static/img/biz/qr-${l}.svg`, url, `version ${q.ver}, mask ${q.mask}`);
  }
}
