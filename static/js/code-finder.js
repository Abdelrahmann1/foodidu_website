/* Promo code finder (/code-finder/): the visitor pastes a product link and sees that store's codes, with a button back to the product.
   Everything happens in the browser: the link is never saved or sent, only the store's key goes to analytics.
   Amazon: the tagged link exists only as a button on this page, never to copy. amazon.eg's policy says "All Special Links must be
   accessed directly from your Site" and forbids any reward for using them. iHerb's Rewards link is made to be shared, so it can be copied. */
(function () {
  "use strict";
  var form = document.getElementById("cf-form");
  if (!form) return;
  var DATA = {};
  try { DATA = JSON.parse(document.getElementById("fd-data").textContent); } catch (e) {}
  var CF = DATA.cf || {}, T = CF.t || {}, stores = CF.stores || [];
  var input = document.getElementById("cf-url"), out = document.getElementById("cf-out");
  var SHORT = ["amzn.eu", "amzn.to", "a.co", "amzn.asia"];   // the app's share links: the product is hidden behind a redirect we can't follow from a static page
  var ASIN = /(?:^|\/)(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  // apps share "Look at this ... https://...": take the link out of the text. null when there is no web link
  function parse(v) {
    var m = v.match(/https?:\/\/[^\s]+/i);
    v = (m ? m[0] : v).trim();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) { if (v.indexOf(".") < 1 || /\s/.test(v)) return null; v = "https://" + v; }
    try {
      var u = new URL(v);
      if (!/^https?:$/.test(u.protocol) || u.hostname.indexOf(".") < 1) return null;
      u.protocol = "https:";
      return u;
    } catch (e) { return null; }
  }
  function hostOf(u) { return u.hostname.toLowerCase().replace(/^www\./, ""); }
  function isHost(h, want) { return h === want || h.slice(-want.length - 1) === "." + want; }
  function findStore(u) {
    var h = hostOf(u);
    for (var i = 0; i < stores.length; i++) {
      for (var j = 0; j < stores[i].m.length; j++) {
        var mt = stores[i].m[j];
        if (isHost(h, mt[0]) && (!mt[1] || u.pathname.toLowerCase().indexOf(mt[1]) === 0)) return stores[i];
      }
    }
    return null;
  }
  function byAmazon() { for (var i = 0; i < stores.length; i++) if (stores[i].amazon) return stores[i]; return null; }

  function show(nodes) {
    out.textContent = "";
    nodes.forEach(function (n) { if (n) out.appendChild(n); });
    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.dispatchEvent(new Event("resize"));   // site.js fits long codes to their ticket on resize
  }
  function notice(text, all) {
    var p = el("p", "cf-msg", text);
    if (all) { p.appendChild(document.createTextNode(" ")); var a = el("a", "", T.all); a.href = CF.all; p.appendChild(a); }
    return p;
  }
  function tickets(s) {
    var t = document.getElementById("cf-s-" + s.k);
    return t ? t.content.cloneNode(true) : null;
  }
  function openBtn(href, s, sponsored) {
    var a = el("a", "btn btn-leaf", T.open);
    a.href = href;
    a.target = "_blank";
    a.rel = sponsored ? "nofollow sponsored noopener" : "nofollow noopener";
    a.setAttribute("data-track", "brand_link_click");
    a.setAttribute("data-brand", s.k);
    return a;
  }
  function copyBtn(link) {
    var b = el("button", "btn btn-line", T.copy);
    b.type = "button";
    b.addEventListener("click", function () {
      var done = function () { b.textContent = T.copied; setTimeout(function () { b.textContent = T.copy; }, 2200); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(done);
      else { input.value = link; input.select(); try { if (document.execCommand("copy")) done(); } catch (e) {} }
    });
    return b;
  }
  function result(s, btns, note) {
    var row = el("div", "cf-actions");
    btns.forEach(function (b) { row.appendChild(b); });
    show([el("h2", "h2", T.found.replace("{store}", s.n)), row, note ? el("p", "note pk-note", note) : null, tickets(s)]);
  }

  function run() {
    var v = input.value.trim();
    if (!v) { out.hidden = true; return; }
    var u = parse(v);
    if (!u) { show([notice(T.bad)]); return; }
    var h = hostOf(u);
    var amz = byAmazon();
    if (amz && SHORT.some(function (x) { return isHost(h, x); })) { show([notice(T.short), tickets(amz)]); return; }
    if (/(^|\.)amazon\.[a-z.]+$/.test(h) && !isHost(h, "amazon.eg")) { show([notice(T.other)]); return; }
    var s = findStore(u);
    if (!s) { show([notice(T.none, true)]); return; }
    if (s.amazon) {
      var m = ASIN.exec(u.pathname);
      if (!m) { show([notice(T.noasin), tickets(s)]); return; }
      result(s, [openBtn(CF.store + "/dp/" + m[1].toUpperCase() + "?tag=" + encodeURIComponent(CF.tag), s, true)], T.aff);
      return;
    }
    if (s.ref) {
      u.searchParams.set(s.ref, s.code);
      result(s, [openBtn(u.href, s, true), copyBtn(u.href)], T.ref);
      return;
    }
    result(s, [openBtn(u.href, s, false)]);
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  input.addEventListener("paste", function () { setTimeout(run, 0); });   // on a phone the paste is the whole job: no need to press the button too
})();
