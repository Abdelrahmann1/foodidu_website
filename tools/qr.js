// QR codes for the Foodidu Business pages, made with static/js/qr.js (the same code the free QR tool runs in the browser).
//   node tools/qr.js          -> static/img/biz/qr-en.svg and qr-ar.svg (the example stands; they open foodidu.com/business/ and /ar/business/)
//   node tools/qr.js --test   -> checks the maths against published values from the QR spec
const fs = require("fs");
const QR = require("../static/js/qr.js");
const svg = (q, color, quiet = 4) => { const n = q.size + quiet * 2; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path fill="${color}" d="${QR.svgPath(q, quiet)}"/></svg>\n`; };

if (process.argv.includes("--test")) {
  const t = QR._test, ok = (name, cond, got) => console.log(name.padEnd(28), cond ? "ok" : "FAIL " + got);
  // Reed-Solomon: Thonky's "HELLO WORLD" 1-M example (16 data codewords -> these 10 EC codewords)
  const ec = t.rsRemainder([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], t.rsDivisor(10)).join(",");
  ok("reed-solomon", ec === "196,35,39,119,235,215,231,226,93,23", ec);
  // format strings from the spec table
  const f = (e, m) => t.formatBits(e, m).toString(2).padStart(15, "0");
  ok("format bits", f(1, 0) === "111011111000100" && f(0, 0) === "101010000010010" && f(0, 4) === "100010111111001" && f(2, 7) === "000100000111011", [f(1, 0), f(0, 0), f(0, 4), f(2, 7)]);
  // version information: 7 -> 0x07C94, 10 -> 0x0A4D3
  ok("version bits", t.versionBits(7) === 0x07c94 && t.versionBits(10) === 0x0a4d3, [t.versionBits(7).toString(16), t.versionBits(10).toString(16)]);
  // alignment pattern centres (spec annex E)
  ok("alignment positions", t.alignPositions(2).join() === "6,18" && t.alignPositions(7).join() === "6,22,38" && t.alignPositions(10).join() === "6,28,50", [t.alignPositions(7), t.alignPositions(10)]);
  // byte-mode capacity at level M, versions 1-10 (spec table 7)
  const cap = [...Array(10)].map((_, i) => { const v = i + 1; return Math.floor((t.dataCodewords(v) * 8 - 4 - (v < 10 ? 8 : 16)) / 8); }).join(",");
  ok("capacity M v1-10", cap === "14,26,42,62,84,106,122,152,180,213", cap);
  // a long link picks a bigger version
  const q = QR.encode("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/view?usp=sharing");
  ok("long link", q && q.ver === 6 && q.size === 41, q && q.ver);
  ok("too long", QR.encode("x".repeat(214)) === null && QR.encode("x".repeat(213)) !== null, "");
} else {
  fs.mkdirSync("static/img/biz", { recursive: true });
  for (const [l, url] of [["en", "https://foodidu.com/business/"], ["ar", "https://foodidu.com/ar/business/"]]) {
    const q = QR.encode(url);
    fs.writeFileSync(`static/img/biz/qr-${l}.svg`, svg(q, "#3A280D"));
    console.log(`static/img/biz/qr-${l}.svg`, url, `version ${q.ver}, mask ${q.mask}`);
  }
}
