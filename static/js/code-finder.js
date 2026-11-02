/* Promo code finder (/code-finder/): the visitor pastes a product link and sees that store's codes, with a button back to the product
   and a ready post for Facebook and Instagram.
   Everything happens in the browser: the link is never saved or sent, only the store's key goes to analytics.
   Amazon: the tagged link exists only as a button on this page, never to copy. amazon.eg's policy says "All Special Links must be
   accessed directly from your Site" and forbids any reward for using them, so an Amazon post links to this page (#amazon.eg/dp/ASIN),
   which opens with that product. iHerb's Rewards link is made to be shared, so it can be copied. */
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
  // a link to share: without the ad and click trackers that apps add
  function clean(u) {
    var c = new URL(u.href), drop = [];
    c.searchParams.forEach(function (v, k) { if (/^(utm_|fbclid$|gclid$)/i.test(k)) drop.push(k); });
    drop.forEach(function (k) { c.searchParams.delete(k); });
    return c.href;
  }

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
  // field: where the text goes to be copied by hand when the clipboard API is not there
  function copyBtn(get, label, field) {
    var b = el("button", "btn btn-line", label);
    b.type = "button";
    b.addEventListener("click", function () {
      var text = get(), done = function () { b.textContent = T.copied; setTimeout(function () { b.textContent = label; }, 2200); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done);
      else { field.value = text; field.select(); try { if (document.execCommand("copy")) done(); } catch (e) {} }
    });
    return b;
  }

  function fmt(t, v) { return t.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }
  // the post's blocks, with a blank line between them. Instagram doesn't open links in a post, so its post has none
  function caption(s, link, name, fb) {
    var v = { store: s.n, name: name, code: s.c, offer: s.o, link: link, page: s.p, tag: s.tg };
    var deal = [], go = [];
    if (s.c) deal.push(fmt(T.code, v));
    if (s.o) deal.push(fmt(T.offer, v));
    if (fb) go.push(fmt(s.amazon ? T.amz : T.link, v));
    if (s.c) go.push(T.how);
    if (!fb) go.push(s.amazon ? T.amz_ig : T.more_ig);
    else if (!s.amazon) go.push(fmt(T.more, v));
    return [[fmt(name ? T.h_name : s.c ? T.h_code : T.h_plain, v)], deal, go, [fmt(s.c ? T.tag_code : T.tag_deal, v)]]
      .filter(function (g) { return g.length; })
      .map(function (g) { return g.join("\n"); }).join("\n\n");
  }
  function postBox(s, link) {
    if (s.nocap) return null;
    var box = el("div", "cf-post");
    box.appendChild(el("h3", "cf-post-title", T.post));
    var lab = el("label", "cf-post-name"), name = el("input");
    lab.appendChild(el("span", "", T.pname));
    name.type = "text";
    name.maxLength = 80;
    name.autocomplete = "off";
    name.placeholder = T.pname_ph;
    lab.appendChild(name);
    box.appendChild(lab);
    var grid = el("div", "cf-post-grid");
    var areas = [["facebook", T.fb, true], ["instagram", T.ig, false]].map(function (x) {
      var item = el("div", "cf-post-item"), head = el("div", "cf-post-head"), ta = el("textarea");
      ta.readOnly = true;
      ta.rows = 10;
      ta.dir = "auto";
      ta.setAttribute("aria-label", T.post + ": " + x[1]);
      var b = copyBtn(function () { return ta.value; }, T.copy_post, ta);
      b.setAttribute("data-track", "cf_post_copy");
      b.setAttribute("data-brand", s.k);
      b.setAttribute("data-store", x[0]);
      head.appendChild(el("b", "", x[1]));
      head.appendChild(b);
      item.appendChild(head);
      item.appendChild(ta);
      grid.appendChild(item);
      return [ta, x[2]];
    });
    function fill() { areas.forEach(function (a) { a[0].value = caption(s, link, name.value.trim(), a[1]); }); }
    name.addEventListener("input", fill);
    fill();
    box.appendChild(grid);
    box.appendChild(el("p", "note", T.post_note));
    return box;
  }
  function result(s, btns, note, link) {
    var row = el("div", "cf-actions");
    btns.forEach(function (b) { row.appendChild(b); });
    show([el("h2", "h2", T.found.replace("{store}", s.n)), row, note ? el("p", "note pk-note", note) : null, tickets(s), postBox(s, link)]);
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
      var asin = m[1].toUpperCase();
      result(s, [openBtn(CF.store + "/dp/" + asin + "?tag=" + encodeURIComponent(CF.tag), s, true)], T.aff, CF.self + "#amazon.eg/dp/" + asin);
      return;
    }
    if (s.ref) {
      u.searchParams.set(s.ref, s.code);
      result(s, [openBtn(u.href, s, true), copyBtn(function () { return u.href; }, T.copy, input)], T.ref, clean(u));
      return;
    }
    result(s, [openBtn(u.href, s, false)], null, clean(u));
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  input.addEventListener("paste", function () { setTimeout(run, 0); });   // on a phone the paste is the whole job: no need to press the button too
  // a shared post opens this page as /code-finder/#amazon.eg/dp/ASIN: fill the box and show that product, then take the link
  // out of the address bar, so it isn't sent anywhere from here
  var hash = location.hash.slice(1);
  if (hash) {
    try { hash = decodeURIComponent(hash); } catch (e) {}
    if (parse(hash)) {
      input.value = hash;
      if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      run();
    }
  }
})();
