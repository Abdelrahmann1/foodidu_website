/* Foodidu Business demo QR menu (/business/menu-demo/, built by tools/build.pl from data/menu-demo.json).
   A made-up restaurant that shows every QR menu feature: the order (cart), a suggestion that completes it, the table
   number from ?t=, a group order with split bill (synced between phones through Firestore "demoGroups", or on one
   phone when that is not possible), "show the order to the waiter", loyalty stamps and "Rate us". Nothing is paid
   and nothing goes to a kitchen: it is a demo, and the page says so. */
(function () {
  "use strict";
  var root = document.querySelector(".md");
  if (!root) return;
  var DATA = JSON.parse(document.getElementById("fd-data").textContent).md;
  var U = DATA.ui, ITEMS = DATA.items;
  var sheet = document.querySelector(".md-sheet"), back = document.querySelector(".md-back"), toastEl = document.querySelector(".md-toast");

  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    sget: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };
  function money(n) { return U.egp.replace("{n}", String(n)); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function rid(n) { var a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", s = ""; var r = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(r); for (var i = 0; i < n; i++) s += a[r[i] % a.length]; return s; }
  function cleanName(v) { return String(v || "").replace(/\s+/g, " ").trim().slice(0, 20); }
  var toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 2600); }

  /* ---------- the table number (?t=7) ---------- */
  var table = (new URLSearchParams(location.search).get("t") || "").replace(/\D/g, "").slice(0, 4);
  if (table) { var tb = document.querySelector(".md-table"); tb.querySelector("b").textContent = table; tb.hidden = false; }
  // the language link keeps the table and the group
  var langA = document.querySelector(".md-lang");
  function syncLang() { langA.href = langA.getAttribute("href").split(/[?#]/)[0] + (table ? "?t=" + table : "") + (group && !group.local ? "#g=" + group.id : ""); }

  /* ---------- the order: alone (solo) or with friends (group) ---------- */
  var solo = {};          // item id -> quantity
  var group = null;       // { id, local, ref, me, people: [], items: [{ k, id, by }] }
  var offered = {};       // suggestions already shown

  function myQty(id) {
    if (!group) return solo[id] || 0;
    return group.items.filter(function (e) { return e.id === id && e.by === group.me; }).length;
  }
  function lines(by) {   // [{ id, qty }] for one person (group) or the whole order
    var q = {};
    if (!group) Object.keys(solo).forEach(function (id) { if (solo[id] > 0) q[id] = solo[id]; });
    else group.items.forEach(function (e) { if (by == null || e.by === by) q[e.id] = (q[e.id] || 0) + 1; });
    return Object.keys(q).filter(function (id) { return ITEMS[id]; }).map(function (id) { return { id: id, qty: q[id] }; });
  }
  function sum(ls) { return ls.reduce(function (t, l) { return t + ITEMS[l.id].p * l.qty; }, 0); }
  function count(ls) { return ls.reduce(function (t, l) { return t + l.qty; }, 0); }
  function people() {   // everyone at the table, the ones with dishes included even if they left the list
    if (!group) return [];
    var p = group.people.slice();
    group.items.forEach(function (e) { if (p.indexOf(e.by) === -1) p.push(e.by); });
    return p;
  }

  var FV = function () { return window.firebase.firestore.FieldValue; };
  function add(id, quiet) {
    if (!group) solo[id] = (solo[id] || 0) + 1;
    else {
      var e = { k: rid(8), id: id, by: group.me };
      if (group.local) group.items.push(e);
      else group.ref.update({ items: FV().arrayUnion(e) }).catch(function () { toast(U.err); });
    }
    render();
    if (!quiet) suggest(id);
  }
  function remove(id) {
    if (!group) { solo[id] = Math.max(0, (solo[id] || 0) - 1); }
    else {
      var mine = group.items.filter(function (e) { return e.id === id && e.by === group.me; });
      var e = mine[mine.length - 1];
      if (!e) return;
      if (group.local) group.items.splice(group.items.indexOf(e), 1);
      else group.ref.update({ items: FV().arrayRemove(e) }).catch(function () { toast(U.err); });
    }
    render();
  }

  /* ---------- the menu: quantity buttons, the bar at the bottom ---------- */
  function qtyControl(id) {
    var n = myQty(id), name = ITEMS[id].n;
    if (!n) return [el("button", { class: "md-add", type: "button", "data-add": id, "aria-label": U.add + " " + name, text: "+ " + U.add })];
    return [el("button", { class: "md-step", type: "button", "data-minus": id, "aria-label": "−1 " + name, text: "−" }),
      el("b", { class: "md-n", "aria-live": "polite", text: String(n) }),
      el("button", { class: "md-step", type: "button", "data-add": id, "aria-label": "+1 " + name, text: "+" })];
  }
  var bar = document.querySelector(".md-bar");
  function render() {
    document.querySelectorAll(".md-qty").forEach(function (q) { q.replaceChildren.apply(q, qtyControl(q.getAttribute("data-id"))); });
    var all = lines(), n = count(all);
    bar.hidden = !n;
    document.querySelector(".md-count").textContent = String(n);
    document.querySelector(".md-total").textContent = money(sum(all));
    renderGroupBar();
    if (!sheet.hidden && sheet.getAttribute("data-view") === "cart") openCart(true);
    if (!sheet.hidden && sheet.getAttribute("data-view") === "share") openShare(true);
    syncLang();
  }
  document.addEventListener("click", function (ev) {   // the menu and the order sheet
    var a = ev.target.closest && ev.target.closest("[data-add]"), m = ev.target.closest && ev.target.closest("[data-minus]");
    if (a) add(a.getAttribute("data-add"));
    else if (m) remove(m.getAttribute("data-minus"));
  });
  document.querySelector(".md-view").addEventListener("click", function () { openCart(); });

  /* ---------- bottom sheet ---------- */
  var lastFocus = null;
  function openSheet(view, kids, keep) {
    if (!keep) lastFocus = document.activeElement;
    sheet.setAttribute("data-view", view);
    sheet.replaceChildren.apply(sheet, [el("button", { class: "md-x", type: "button", "aria-label": U.close, onclick: closeSheet, text: "×" })].concat(kids));
    sheet.hidden = false; back.hidden = false; document.body.classList.add("md-lock");
    if (!keep) { var f = sheet.querySelector("input, .md-pri, button:not(.md-x)"); if (f) f.focus(); }
  }
  function closeSheet() {
    sheet.hidden = true; back.hidden = true; document.body.classList.remove("md-lock"); sheet.removeAttribute("data-view");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  back.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

  /* ---------- a suggestion that completes the order ---------- */
  function suggest(id) {
    var key = ITEMS[id] && ITEMS[id].s, sg = key && DATA.suggestions[key];
    if (!sg || offered[key] || myQty(sg.add) > 0) return;
    offered[key] = 1;
    var it = ITEMS[sg.add];
    setTimeout(function () {
      openSheet("suggest", [
        el("div", { class: "md-sug" }, [el("span", { class: "md-ph", style: "--bg:" + it.bg }, [el("span", { "aria-hidden": "true", text: it.e })]),
          el("div", null, [el("h2", { id: "md-sheet-t", text: sg.t }), el("p", { text: sg.x }), el("b", { class: "md-price", text: money(it.p) })])]),
        el("div", { class: "md-btns" }, [el("button", { class: "md-pri", type: "button", text: "+ " + U.addIt, onclick: function () { add(sg.add, true); closeSheet(); } }),
          el("button", { class: "md-ghost", type: "button", text: U.noThanks, onclick: closeSheet })])
      ]);
    }, 250);
  }

  /* ---------- the order sheet: lines, per person in a group, the split ---------- */
  var splitMode = "order";
  function lineRow(l, editable) {
    var it = ITEMS[l.id];
    return el("li", null, [el("span", { class: "md-ph sm", style: "--bg:" + it.bg }, [el("span", { "aria-hidden": "true", text: it.e })]),
      el("span", { class: "md-ln" }, [el("b", { text: it.n }), el("small", { text: money(it.p) })]),
      editable ? el("span", { class: "md-qty" }, qtyControl(l.id)) : el("span", { class: "md-x2", text: "× " + l.qty }),
      el("b", { class: "md-lt", text: money(it.p * l.qty) })]);
  }
  function openCart(keep) {
    var all = lines(), kids = [el("h2", { id: "md-sheet-t", text: U.yourOrder + (table ? " · " + U.table + " " + table : "") })];
    if (!all.length) kids.push(el("p", { class: "md-empty", text: U.empty }));
    else if (!group) kids.push(el("ul", { class: "md-lines" }, all.map(function (l) { return lineRow(l, true); })));
    else people().forEach(function (p) {
      var ls = lines(p);
      if (!ls.length) return;
      kids.push(el("div", { class: "md-person" + (p === group.me ? " me" : "") }, [
        el("h3", null, [p + (p === group.me ? " (" + U.you + ")" : ""), el("b", { text: money(sum(ls)) })]),
        el("ul", { class: "md-lines" }, ls.map(function (l) { return lineRow(l, p === group.me); }))]));
    });
    if (all.length) {
      kids.push(el("div", { class: "md-sum" }, [el("span", { text: U.total }), el("b", { text: money(sum(all)) })]), el("p", { class: "md-note", text: U.taxNote }));
      var who = people().filter(function (p) { return lines(p).length; });
      if (group && who.length > 1) {
        var each = Math.ceil(sum(all) / who.length);
        kids.push(el("div", { class: "md-split" }, [el("h3", { text: U.split }),
          el("div", { class: "md-seg", role: "group", "aria-label": U.split }, [["order", U.byOrder], ["equal", U.equally]].map(function (o) {
            return el("button", { type: "button", "aria-pressed": String(splitMode === o[0]), text: o[1], onclick: function () { splitMode = o[0]; openCart(true); } });
          })),
          el("ul", { class: "md-shares" }, who.map(function (p) { return el("li", null, [el("span", { text: p }), el("b", { text: money(splitMode === "equal" ? each : sum(lines(p))) })]); }))]));
      }
      kids.push(el("button", { class: "md-pri wide", type: "button", text: U.showWaiter, onclick: waiter }));
    }
    if (!group) kids.push(el("button", { class: "md-ghost wide", type: "button", text: "👥 " + U.group, onclick: startGroup }));
    openSheet("cart", kids, keep);
  }

  /* ---------- show the order to the waiter (and a loyalty stamp) ---------- */
  var stamped = "";
  function waiter() {
    var all = lines();
    var kids = [el("h2", { id: "md-sheet-t", text: table ? U.waiterTitle.replace("{t}", table) : U.yourOrder })];
    if (group && people().length > 1) people().forEach(function (p) {
      var ls = lines(p); if (!ls.length) return;
      kids.push(el("div", { class: "md-person" }, [el("h3", null, [p, el("b", { text: money(sum(ls)) })]), el("ul", { class: "md-lines big" }, ls.map(function (l) { return lineRow(l, false); }))]));
    });
    else kids.push(el("ul", { class: "md-lines big" }, all.map(function (l) { return lineRow(l, false); })));
    kids.push(el("div", { class: "md-sum" }, [el("span", { text: U.total }), el("b", { text: money(sum(all)) })]),
      el("p", { class: "md-note demo", text: U.waiterNote }),
      el("button", { class: "md-ghost wide", type: "button", text: U.back, onclick: closeSheet }));
    openSheet("waiter", kids, true);
    sheet.classList.add("full");
    var sig = JSON.stringify(all);
    if (all.length && sig !== stamped) { stamped = sig; stamp(); }
  }
  new MutationObserver(function () { if (sheet.hidden) sheet.classList.remove("full"); }).observe(sheet, { attributes: true, attributeFilter: ["hidden"] });

  /* ---------- loyalty stamps (kept on this phone) ---------- */
  var MAX = DATA.stamps, stamps = parseInt(store.get("md-stamps") || DATA.start, 10);
  if (!(stamps >= 0 && stamps <= MAX)) stamps = DATA.start;
  function drawStamps(pop) {
    var lis = document.querySelectorAll(".md-stamps li");
    lis.forEach(function (li, i) { li.className = i < stamps ? "on" + (pop && i === stamps - 1 ? " pop" : "") : i === MAX - 1 ? "gift" : ""; li.textContent = i < stamps ? "✓" : i === MAX - 1 ? "🎁" : ""; });
    document.querySelector(".md-loyal-left").textContent = stamps >= MAX ? U.loyaltyFull : U.loyaltyLeft.replace("{n}", String(MAX - stamps));
  }
  function stamp() { stamps = stamps >= MAX ? 1 : stamps + 1; store.set("md-stamps", String(stamps)); drawStamps(true); toast("🎟️ " + U.loyaltyGot); }
  drawStamps();
  document.querySelector(".md-rate").addEventListener("click", function () { toast("⭐ " + U.rateDemo); });

  /* ---------- group order ---------- */
  function core() { return window.FoodiduCore ? window.FoodiduCore.loadCore() : Promise.reject(new Error("no core")); }
  function groupUrl(id) { return location.origin + location.pathname + (table ? "?t=" + table : "") + "#g=" + id; }
  function nameForm(title, text, btn, done) {
    var input = el("input", { id: "md-name", type: "text", maxlength: "20", autocomplete: "given-name", placeholder: U.yourName, required: "" });
    var go = el("button", { class: "md-pri wide", type: "submit", text: btn });
    var form = el("form", { class: "md-nameform", novalidate: "" }, [el("label", { class: "sr-only", for: "md-name", text: U.yourName }), input, go]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var n = cleanName(input.value);
      if (!n) { input.focus(); input.classList.add("bad"); return; }
      go.disabled = true; done(n, function () { go.disabled = false; });
    });
    openSheet("name", [el("h2", { id: "md-sheet-t", text: title }), el("p", { class: "md-lead", text: text }), form]);
  }
  function startGroup() {
    nameForm("👥 " + U.groupTitle, U.groupText, U.start, function (name, fail) {
      var mine = [];
      Object.keys(solo).forEach(function (id) { for (var i = 0; i < solo[id]; i++) mine.push({ k: rid(8), id: id, by: name }); });
      var id = rid(16);
      core().then(function (db) {
        var ref = db.collection("demoGroups").doc(id), fs = window.firebase.firestore;
        return ref.set({ createdAt: fs.FieldValue.serverTimestamp(), expireAt: fs.Timestamp.fromDate(new Date(Date.now() + 864e5)), lang: DATA.lang, table: table, people: [name], items: mine })
          .then(function () { solo = {}; attach(id, ref, name); openShare(); });
      }).catch(function () {   // no connection or no access: the group lives on this phone
        solo = {}; group = { local: true, me: name, people: [name], items: mine };
        render(); openShare();
      }).then(fail, fail);
    });
  }
  function attach(id, ref, me) {
    if (group && group.unsub) group.unsub();
    group = { id: id, ref: ref, me: me, people: [me], items: [], local: false };
    store.sset("md-me-" + id, me);
    history.replaceState(null, "", location.pathname + location.search + "#g=" + id);
    group.unsub = ref.onSnapshot(function (s) {
      if (!group || group.id !== id) return;
      if (!s.exists) { leave(); toast(U.err); return; }
      var d = s.data(); group.people = d.people || []; group.items = d.items || []; render();
    }, function () { toast(U.err); });
    render();
  }
  function leave() {
    if (group && group.unsub) group.unsub();
    var me = group && group.me, items = group ? group.items : [];
    group = null; solo = {};
    items.forEach(function (e) { if (e.by === me) solo[e.id] = (solo[e.id] || 0) + 1; });   // keep my dishes
    history.replaceState(null, "", location.pathname + location.search);
    closeSheet(); render();
  }
  function qrSvg(text) {
    var q = window.FoodiduQR && window.FoodiduQR.encode(text);
    if (!q) return null;
    var n = q.size, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (q.mod[y][x]) d += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + (n + 8) + " " + (n + 8)); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", text);
    svg.innerHTML = '<rect width="100%" height="100%" fill="#fff"/><path fill="#1F1A17" d="' + d + '"/>';
    return svg;
  }
  function openShare(keep) {
    if (!group) return;
    var kids = [el("h2", { id: "md-sheet-t", text: "👥 " + U.group })];
    if (!group.local) {
      var url = groupUrl(group.id);
      kids.push(el("p", { class: "md-lead", text: U.shareTitle }), el("div", { class: "md-qr" }, [qrSvg(url)]),
        el("div", { class: "md-btns" }, [
          el("button", { class: "md-ghost", type: "button", text: U.copy, onclick: function () { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast(U.copied); }, function () { window.prompt(U.copy, url); }); } }),
          navigator.share ? el("button", { class: "md-ghost", type: "button", text: U.share, onclick: function () { navigator.share({ title: U.group, url: url }).catch(function () {}); } }) : null]),
        el("p", { class: "md-live", text: "● " + U.live }));
    } else kids.push(el("p", { class: "md-note demo", text: U.localNote }));
    kids.push(el("h3", { class: "md-ppl-t", text: U.people }), el("ul", { class: "md-ppl" }, people().map(function (p) {
      return el("li", { class: p === group.me ? "me" : "" }, [group.local ? el("button", { type: "button", "aria-pressed": String(p === group.me), text: p, onclick: function () { group.me = p; render(); } }) : el("span", { text: p + (p === group.me ? " (" + U.you + ")" : "") })]);
    })));
    if (group.local) {
      var inp = el("input", { type: "text", maxlength: "20", placeholder: U.addPerson, "aria-label": U.addPerson });
      kids.push(el("p", { class: "md-who", text: U.ordering }), el("form", { class: "md-addp" }, [inp, el("button", { class: "md-ghost", type: "submit", text: "+" })]));
      kids[kids.length - 1].addEventListener("submit", function (e) { e.preventDefault(); var n = cleanName(inp.value); if (n && group.people.indexOf(n) === -1) { group.people.push(n); group.me = n; } render(); });
    }
    kids.push(el("button", { class: "md-pri wide", type: "button", text: U.viewOrder, onclick: function () { openCart(); } }),
      el("button", { class: "md-link", type: "button", text: U.leave, onclick: leave }));
    openSheet("share", kids, keep);
  }
  var gbar = document.querySelector(".md-groupbar");
  function renderGroupBar() {
    gbar.hidden = !group;
    if (!group) return;
    gbar.replaceChildren(el("button", { type: "button", class: "md-gb", onclick: function () { openShare(); } }, [
      el("span", { "aria-hidden": "true", text: "👥" }), el("b", { text: U.group }),
      el("span", { class: "md-gb-p", text: people().join("، ") }),
      el("span", { class: "md-gb-me", text: U.ordering.replace(/[?؟]$/, "") + ": " + group.me })]));
  }
  document.querySelector(".md-group-btn").addEventListener("click", function () { group ? openShare() : startGroup(); });

  // opened from a group link: join it
  var gm = location.hash.match(/^#g=([A-Za-z0-9]{16})$/);
  if (gm) {
    var gid = gm[1];
    core().then(function (db) {
      var ref = db.collection("demoGroups").doc(gid);
      return ref.get().then(function (s) {
        if (!s.exists) throw new Error("gone");
        var me = store.sget("md-me-" + gid);
        if (me) { attach(gid, ref, me); return; }
        nameForm("👥 " + U.joinTitle, U.joinText, U.join, function (name, fail) {
          ref.update({ people: window.firebase.firestore.FieldValue.arrayUnion(name) }).then(function () { attach(gid, ref, name); closeSheet(); toast("👥 " + U.live); }, function () { toast(U.err); fail(); });
        });
      });
    }).catch(function () { history.replaceState(null, "", location.pathname + location.search); toast(U.err); });
  }

  /* ---------- search and the category chips ---------- */
  function norm(s) { return String(s).toLowerCase().replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي"); }
  var none = document.querySelector(".md-none");
  document.getElementById("md-q").addEventListener("input", function () {
    var q = norm(this.value.trim()), any = false;
    document.querySelectorAll(".md-cat").forEach(function (c) {
      var shown = 0;
      c.querySelectorAll(".md-item").forEach(function (li) { var ok = !q || norm(li.querySelector(".md-info").textContent).indexOf(q) > -1; li.hidden = !ok; if (ok) shown++; });
      c.hidden = !shown; if (shown) any = true;
    });
    none.hidden = any;
  });
  var chips = document.querySelectorAll(".md-cats a");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        chips.forEach(function (a) {
          var on = a.getAttribute("data-cat") === e.target.getAttribute("data-cat");
          a.classList.toggle("on", on);
          if (on && a.scrollIntoView) a.parentNode.scrollTo({ left: a.offsetLeft - 40, behavior: "smooth" });
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll(".md-cat").forEach(function (c) { io.observe(c); });
  }

  /* ---------- on a computer: a code to open the menu on a phone ---------- */
  if (window.matchMedia && window.matchMedia("(min-width: 1000px)").matches) {
    var q = qrSvg(location.origin + location.pathname + "?t=" + (table || "7"));
    if (q) document.body.appendChild(el("aside", { class: "md-phone" }, [el("b", { text: "📱 " + U.openOnPhone }), q, el("small", { text: U.scanHint })]));
  }

  render();
})();
