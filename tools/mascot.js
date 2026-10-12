// Didu (ديدو), the Foodidu mascot. His face is hidden in the name: the "oo" of Foodidu are his eyes and the "u" is his
// grin. His body is a round sesame bun in the logo's colours with a bite taken out of it: a bite off the price.
// Draws every pose as SVG into static/img/mascot/.
//   node tools/mascot.js
// PNG copies for social posts are made from these SVGs in the browser (tools/assets.html helpers).
const fs = require("fs");
const path = require("path");

const C = { ink: "#543A14", inkDeep: "#3A280D", sun: "#FFD15C", sun2: "#FFC533", shine: "#FFE9A8", cream: "#FFF1CC", leaf: "#7EB143",
  leafDeep: "#4A7A1E", cheek: "#FF9C7A", tongue: "#F2725A", white: "#FFFFFF", glass: "#DFF1FF", coral: "#FF8A65" };
const line = (d, w, color = C.ink, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
// a chunky limb like the logo's letter strokes: a brown stroke with a yellow one inside
const limb = (d, fill = C.sun) => line(d, 30) + line(d, 17, fill);

// ---------- the bun with a bite (viewBox 0 0 400 400)
// BITTEN is the round bun (M200 108 C272 108 314 150 314 214 C314 282 268 322 200 322 C132 322 86 282 86 214 C86 150 128 108 200 108 Z)
// minus three teeth marks, circles at (298,128) r36, (266,112) r22 and (322,164) r22, worked out once as a plain path so the
// SVGs need no <mask> (mobile app renderers such as Android VectorDrawable and flutter_svg don't draw masks).
const BITTEN = "M86 214L86.1 208.7L86.4 203.5L86.9 198.5L87.7 192.5L88.6 187.7L89.7 183L90.9 178.4L92.7 173L94.4 168.7L96.2 164.5L98.3 160.5L100.9 155.7L103.8 151.2L106.5 147.6L109.3 144.1L112.2 140.8L116 137L119.3 134L122.8 131.1L126.5 128.4L131.1 125.4L135.1 123L139.3 120.8L143.6 118.8L149 116.6L153.7 114.9L158.5 113.4L163.5 112.1L168.6 111L173.9 110L179.3 109.2L184.9 108.6L192.9 108.1L201.2 108L208.3 108.2L216.2 108.8L222.9 109.5L230.3 110.8L237.5 112.4L244.1 114.2L244.4 116L244.7 117.7L245.3 119.3L245.9 120.9L246.7 122.5L247.5 124L248.5 125.4L250 127.1L251.3 128.3L252.6 129.5L254 130.5L255.5 131.3L257.1 132.1L258.7 132.7L260.3 133.3L262.5 133.7L263.2 137.3L264.1 140L265.1 142.6L266.4 145.2L267.8 147.6L269.4 149.9L271.2 152.1L273.9 154.8L276.1 156.6L279.2 158.7L282.5 160.5L286 161.9L289.6 163L293.3 163.7L297.1 164L300 163.9L300.1 166.3L300.6 169.1L301.5 171.9L302.7 174.5L304.2 176.9L306 179.1L308.2 181.1L310.2 182.6L311.4 187.7L312.5 193.5L313.2 199.5L313.8 205.6L314 211.9L313.9 218.5L313.7 224L313.1 230.4L312.2 236.6L311 242.7L309.8 247.5L308.1 253.2L306.1 258.7L303.9 263.9L301.8 268.1L299.1 273L296.1 277.7L292.9 282.1L290 285.7L286.4 289.7L282.5 293.5L278.4 297.1L274.1 300.4L269.5 303.6L264.7 306.5L259.8 309.1L254.6 311.5L249.3 313.7L243.7 315.6L238 317.3L232.1 318.7L226 319.9L219.7 320.8L214.4 321.4L207.8 321.8L201.1 322L194.4 321.9L186.7 321.5L180.3 320.8L174 319.9L167.9 318.7L162 317.3L156.3 315.6L150.7 313.7L145.4 311.5L139.4 308.7L134.4 306L129.7 303.1L125.2 299.9L120.9 296.5L116.8 292.9L113 289L109.4 285L106 280.7L102.9 276.1L100 271.4L97.4 266.5L95 261.3L92.9 256L91 250.4L89.5 244.6L88.2 238.7L87.2 232.5L86.5 226.2L86.1 219.6Z";
const bun = () =>
  `<path d="${BITTEN}" transform="translate(0 9)" fill="${C.inkDeep}" stroke="${C.inkDeep}" stroke-width="12" stroke-linejoin="round"/>`   // sticker shadow
  + `<path d="${BITTEN}" fill="${C.sun}"/>`
  + `<path d="M86 236 C96 292 140 322 200 322 C260 322 304 292 314 236 C300 274 258 296 200 296 C142 296 100 274 86 236 Z" fill="${C.sun2}"/>`   // warm underside
  + line("M118 176 Q128 140 166 128", 10, C.shine)                                                                                          // shine
  + `<path d="${BITTEN}" fill="none" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/>`                                       // outline, on top
  + [[150, 140, -30], [178, 128, 10], [128, 168, -60], [206, 132, 35]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5" transform="rotate(${r} ${x} ${y})"/>`).join("")   // sesame
  + [[338, 202, 5], [350, 220, 3.5], [328, 228, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.sun}" stroke="${C.ink}" stroke-width="2.5"/>`).join("");   // crumbs

// ---------- the face: "oo" eyes and a "u" grin
const cheeks = `<ellipse cx="128" cy="244" rx="15" ry="9" fill="${C.cheek}" opacity=".8"/><ellipse cx="272" cy="244" rx="15" ry="9" fill="${C.cheek}" opacity=".8"/>`;
const ring = (x, y) => `<circle cx="${x}" cy="${y}" r="27" fill="${C.white}" stroke="${C.ink}" stroke-width="9"/>`;
const pupil = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.inkDeep}"/><circle cx="${x + r * .38}" cy="${y - r * .42}" r="${r * .36}" fill="${C.white}"/>`;
const grin = (o = 0) => `<path d="M177 ${236 + o} H223 V${250 + o} Q223 ${276 + o} 200 ${276 + o} Q177 ${276 + o} 177 ${250 + o} Z" fill="${C.inkDeep}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>`
  + `<rect x="184" y="${236 + o}" width="11" height="9" rx="2" fill="${C.white}"/><path d="M185 ${263 + o} Q200 ${254 + o} 215 ${263 + o} Q212 ${273 + o} 200 ${273 + o} Q188 ${273 + o} 185 ${263 + o} Z" fill="${C.tongue}"/>`;
const FACE = {
  happy: ring(173, 200) + ring(227, 200) + pupil(177, 196) + pupil(231, 196) + line("M152 163 Q168 154 186 160", 7) + line("M214 160 Q232 154 248 163", 7) + cheeks + grin(),
  joy: ring(173, 200) + ring(227, 200) + line("M160 205 Q173 187 186 205", 7) + line("M214 205 Q227 187 240 205", 7) + line("M150 160 Q168 148 186 156", 7) + line("M214 156 Q232 148 250 160", 7) + cheeks + grin(2),
  curious: ring(173, 200) + pupil(180, 192, 10) + line("M150 158 Q168 150 186 156", 7) + line("M212 150 Q230 138 250 146", 7) + cheeks
    + `<ellipse cx="206" cy="250" rx="10" ry="12" fill="${C.inkDeep}" stroke="${C.ink}" stroke-width="3"/>`,
  wink: ring(173, 200) + ring(227, 200) + pupil(180, 197) + line("M214 202 Q227 192 240 202", 7) + line("M152 163 Q168 154 186 160", 7) + line("M214 160 Q232 152 248 160", 7) + cheeks + grin(),
};
// the searching pose: a magnifier over the right eye makes that "o" huge
const bigEye = `<circle cx="232" cy="200" r="44" fill="${C.white}" stroke="${C.ink}" stroke-width="9"/>` + pupil(240, 190, 19)
  + `<circle cx="232" cy="200" r="52" fill="${C.glass}" fill-opacity=".35" stroke="${C.ink}" stroke-width="9"/>` + line("M212 172 Q222 162 238 160", 5, C.white);

// ---------- feet, arms, props
const shadow = (rx = 86) => `<ellipse cx="200" cy="364" rx="${rx}" ry="10" fill="${C.ink}" opacity=".14"/>`;
const feet = `<ellipse cx="166" cy="336" rx="27" ry="14" fill="${C.ink}"/><ellipse cx="234" cy="336" rx="27" ry="14" fill="${C.ink}"/>`
  + line("M152 331 Q160 327 170 328", 4, C.ink2 || "#7A5A2A") + line("M220 331 Q228 327 238 328", 4, "#7A5A2A");
const tag = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})">`   // a little green coupon in his hand
  + `<path d="M-30 -20 H30 A8 8 0 0 1 38 -12 V-6 A6 6 0 0 0 38 6 V12 A8 8 0 0 1 30 20 H-30 A8 8 0 0 1 -38 12 V6 A6 6 0 0 0 -38 -6 V-12 A8 8 0 0 1 -30 -20 Z" fill="${C.leaf}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>`
  + line("M12 -14 V14", 3, C.ink, ' stroke-dasharray="1 6" opacity=".6"')
  + `<g fill="none" stroke="${C.white}" stroke-width="4" stroke-linecap="round"><circle cx="-14" cy="-6" r="4.5"/><circle cx="-2" cy="7" r="4.5"/><path d="M-1 -10 L-15 11"/></g></g>`;
const motion = line("M60 112 Q48 126 54 142", 5, C.ink, ' opacity=".4"') + line("M44 100 Q28 120 36 142", 5, C.ink, ' opacity=".25"');
const confetti = [[52, 92, C.leaf, 25], [96, 54, C.coral, -20], [306, 50, C.leafDeep, 40], [350, 92, C.coral, 15], [40, 170, C.sun2, -35], [364, 176, C.leaf, 60], [150, 36, C.sun2, 10], [254, 30, C.coral, -50]]
  .map(([x, y, f, r]) => `<rect x="${x}" y="${y}" width="15" height="7" rx="3.5" fill="${f}" stroke="${C.ink}" stroke-width="2.5" transform="rotate(${r} ${x + 7} ${y + 3})"/>`).join("")
  + `<circle cx="74" cy="132" r="6" fill="${C.sun}" stroke="${C.ink}" stroke-width="2.5"/><circle cx="330" cy="130" r="6" fill="${C.leaf}" stroke="${C.ink}" stroke-width="2.5"/>`;

const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="15" fill="${C.ink}"/><circle cx="${x}" cy="${y}" r="8.5" fill="${C.sun}"/>`;
const POSES = {   // arms are drawn before the bun so they come out from behind it
  "didu":        { title: "Didu waving", parts: [shadow(), feet, limb("M98 222 Q70 200 66 160"), limb("M300 252 Q318 270 320 292"), bun, FACE.happy, tag(350, 312, 14), hand(320, 294), motion] },
  "didu-party":  { title: "Didu celebrating", parts: [shadow(70), confetti, `<g transform="translate(0 -14)">`, feet, limb("M96 210 Q66 176 70 128"), limb("M304 210 Q334 176 330 128"), bun, FACE.joy, `</g>`] },
  "didu-search": { title: "Didu searching", parts: [shadow(), feet, limb("M98 246 Q72 262 84 286"), limb("M298 262 Q316 268 318 284"), bun, FACE.curious, bigEye, line("M270 240 L316 282", 12), hand(318, 284)] },
  "didu-point":  { title: "Didu pointing", parts: [shadow(), feet, limb("M98 250 Q70 266 80 292"), limb("M300 226 Q330 222 352 212"), line("M352 212 L370 207", 20), line("M352 212 L370 207", 9, C.sun), bun, FACE.wink] },
};

const out = path.join(__dirname, "..", "static", "img", "mascot");
fs.mkdirSync(out, { recursive: true });
for (const [name, p] of Object.entries(POSES)) {
  const parts = p.parts.map((x) => (typeof x === "function" ? x(name) : x)).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="${p.title}"><title>${p.title}</title>${parts}</svg>\n`;
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
  console.log("wrote", `static/img/mascot/${name}.svg`, svg.length, "bytes");
}
