// Didu (ديدو), the Foodidu mascot: a coupon ticket in a chef's hat. Draws every pose as SVG into static/img/mascot/.
//   node tools/mascot.js
// The PNG copies for social posts are made from these SVGs in tools/assets.html ("Mascot PNGs").
const fs = require("fs");
const path = require("path");

const C = { ink: "#543A14", inkDeep: "#3A280D", sun: "#FFD15C", shine: "#FFE9A8", leaf: "#7EB143", leafDeep: "#4A7A1E",
  cheek: "#FF9C7A", tongue: "#F2725A", white: "#FFFFFF", crease: "#E9DFCC", glass: "#DFF1FF", coral: "#FF8A65" };

// ---------- parts (viewBox 0 0 400 400, the ticket's centre line is x = 200)
const line = (d, w = 9, color = C.ink, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const shadow = (rx = 72) => `<ellipse cx="200" cy="373" rx="${rx}" ry="9" fill="${C.ink}" opacity=".14"/>`;
const legs = line("M172 326 L168 355") + line("M228 326 L232 355")
  + `<ellipse cx="159" cy="361" rx="17" ry="10" fill="${C.leaf}" stroke="${C.ink}" stroke-width="6"/>`
  + `<ellipse cx="241" cy="361" rx="17" ry="10" fill="${C.leaf}" stroke="${C.ink}" stroke-width="6"/>`;
// a coupon ticket with rounded corners and a notch on each side where the stub begins
const BODY = "M144 120 H256 A34 34 0 0 1 290 154 V239 A16 16 0 0 0 290 271 V296 A34 34 0 0 1 256 330 H144 A34 34 0 0 1 110 296 V271 A16 16 0 0 0 110 239 V154 A34 34 0 0 1 144 120 Z";
const body = `<path d="${BODY}" fill="${C.sun}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`
  + line("M130 170 Q131 142 156 134", 8, C.shine)                                        // shine
  + line("M136 255 H264", 5, C.ink, ' stroke-dasharray="1 13" opacity=".55"')           // perforation
  + `<g fill="none" stroke="${C.leafDeep}" stroke-width="6" stroke-linecap="round"><circle cx="187" cy="285" r="7"/><circle cx="213" cy="305" r="7"/><path d="M215 280 L185 310"/></g>`;   // % on the stub
const hat = `<g transform="rotate(-7 200 110)">`
  + `<circle cx="172" cy="86" r="25" fill="${C.ink}"/><circle cx="200" cy="70" r="31" fill="${C.ink}"/><circle cx="228" cy="86" r="25" fill="${C.ink}"/>`
  + `<circle cx="172" cy="86" r="21" fill="${C.white}"/><circle cx="200" cy="70" r="27" fill="${C.white}"/><circle cx="228" cy="86" r="21" fill="${C.white}"/>`
  + line("M187 62 Q191 78 187 92", 3, C.crease) + line("M213 62 Q209 78 213 92", 3, C.crease)
  + `<rect x="156" y="94" width="88" height="30" rx="10" fill="${C.ink}"/><rect x="160" y="98" width="80" height="22" rx="7" fill="${C.white}"/></g>`;
const cheeks = `<ellipse cx="150" cy="214" rx="12" ry="7" fill="${C.cheek}" opacity=".75"/><ellipse cx="250" cy="214" rx="12" ry="7" fill="${C.cheek}" opacity=".75"/>`;
const eye = (x, y, dx = 3.5, dy = -5) => `<ellipse cx="${x}" cy="${y}" rx="9.5" ry="12.5" fill="${C.ink}"/><circle cx="${x + dx}" cy="${y + dy}" r="3.6" fill="${C.white}"/>`;
const FACE = {
  happy: eye(172, 190) + eye(228, 190) + cheeks
    + `<path d="M184 210 Q200 236 216 210 Z" fill="${C.inkDeep}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><path d="M191 222 Q200 230 209 222 Q200 216 191 222 Z" fill="${C.tongue}"/>`,
  joy: line("M161 193 Q172 179 183 193", 6) + line("M217 193 Q228 179 239 193", 6) + cheeks
    + `<path d="M180 207 Q200 244 220 207 Z" fill="${C.inkDeep}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><path d="M189 225 Q200 235 211 225 Q200 218 189 225 Z" fill="${C.tongue}"/>`,
  curious: eye(172, 192, 4.5, -6) + eye(228, 192, 4.5, -6) + cheeks
    + line("M159 168 Q170 162 181 166", 5) + line("M217 159 Q228 150 241 156", 5)
    + `<ellipse cx="204" cy="220" rx="7" ry="8" fill="${C.inkDeep}"/>`,
  wink: eye(172, 190) + line("M217 192 Q228 184 239 192", 6) + cheeks
    + `<path d="M184 210 Q200 236 216 210 Z" fill="${C.inkDeep}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><path d="M191 222 Q200 230 209 222 Q200 216 191 222 Z" fill="${C.tongue}"/>`,
};
const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="12.5" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/>`;
const arm = (d, hx, hy) => line(d) + hand(hx, hy);
const fork = line("M80 258 L75 186", 7) + line("M64 170 Q75 192 86 170", 6) + line("M64 170 V148", 6) + line("M75 174 V146", 6) + line("M86 170 V148", 6);
const motion = line("M352 112 Q362 124 355 138", 4, C.ink, ' opacity=".45"') + line("M362 96 Q378 110 370 130", 4, C.ink, ' opacity=".3"');
const confetti = [
  [62, 70, C.leaf, 25], [100, 40, C.coral, -20], [300, 36, C.leafDeep, 40], [344, 70, C.coral, 15], [48, 140, C.sun, -35], [356, 150, C.leaf, 60], [140, 26, C.sun, 10], [262, 22, C.coral, -50],
].map(([x, y, f, r]) => `<rect x="${x}" y="${y}" width="13" height="6" rx="3" fill="${f}" stroke="${C.ink}" stroke-width="2.5" transform="rotate(${r} ${x + 6} ${y + 3})"/>`).join("")
  + `<circle cx="78" cy="104" r="5" fill="${C.sun}" stroke="${C.ink}" stroke-width="2.5"/><circle cx="326" cy="108" r="5" fill="${C.leaf}" stroke="${C.ink}" stroke-width="2.5"/>`;
const magnifier = line("M333 194 L310 218", 9) + `<circle cx="350" cy="178" r="23" fill="${C.glass}" fill-opacity=".75" stroke="${C.ink}" stroke-width="7"/>` + line("M340 168 Q344 162 352 161", 4, C.white);
const question = line("M354 84 Q354 70 366 70 Q378 70 378 82 Q378 90 368 94 L368 102", 5) + `<circle cx="368" cy="113" r="3.6" fill="${C.ink}"/>`;
const finger = line("M346 193 L364 189", 14) + line("M346 193 L364 189", 7, C.white);

// ---------- poses
const POSES = {
  "didu":        { title: "Didu waving", parts: [shadow(), legs, fork, body, FACE.happy, hat, motion, arm("M112 204 Q90 214 78 222", 78, 222), arm("M288 196 Q322 182 330 140", 330, 136)] },
  "didu-party":  { title: "Didu celebrating", parts: [shadow(60), confetti, `<g transform="translate(0 -10)">`, legs, body, FACE.joy, hat, arm("M114 190 Q86 160 84 120", 84, 116), arm("M286 190 Q314 160 316 120", 316, 116), `</g>`] },
  "didu-search": { title: "Didu searching", parts: [shadow(), legs, body, FACE.curious, hat, question, arm("M112 212 Q90 228 106 248", 106, 250), magnifier, arm("M288 214 Q300 224 308 218", 308, 218)] },
  "didu-point":  { title: "Didu pointing", parts: [shadow(), legs, body, FACE.wink, hat, arm("M112 214 Q92 236 100 258", 100, 260), arm("M288 206 Q318 204 338 196", 340, 195), finger] },
};

const out = path.join(__dirname, "..", "static", "img", "mascot");
fs.mkdirSync(out, { recursive: true });
for (const [name, p] of Object.entries(POSES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${p.title}"><title>${p.title}</title>${p.parts.join("")}</svg>\n`;
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
  console.log("wrote", `static/img/mascot/${name}.svg`, svg.length, "bytes");
}
