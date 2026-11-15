/**
 * The in-page editor. It is added only to pages shown at /editor/preview/… to a signed-in editor (see
 * app/editor/preview/[...page]/route.ts); the public guides and tools never contain it.
 *
 * - Everything the server marked with data-ed="N" outlines on hover; clicking text edits it in place, clicking a
 *   photo replaces it.
 * - A small toolbar offers Bold, Italic, Link, add a paragraph / list item / photo below, Remove, Done, Cancel.
 * - Saves go to /api/editor/save with the page version; the server cleans the HTML and writes the file.
 * - The bar at the bottom: back to all pages, save status, page title & description, "Click links" mode, view live.
 *
 * Written as plain browser JavaScript in a string (no build step, no template literals inside).
 */

export const OVERLAY_CSS = String.raw`
html.ed-on [data-ed]{cursor:text;outline:2px dashed transparent;outline-offset:3px;border-radius:3px;transition:outline-color .12s,background-color .12s}
html.ed-on [data-ed][data-ed-k="img"]{cursor:pointer}
html.ed-on [data-ed]:hover{outline-color:rgba(207,0,0,.55);background-color:rgba(255,214,0,.10)}
html.ed-on [data-ed].ed-editing{outline:2px solid #CF0000!important;background-color:#fffbea!important;color:#16130d!important;-webkit-text-fill-color:#16130d!important;caret-color:#CF0000}
html.ed-on [data-ed].ed-saving{opacity:.5}
html.ed-on [data-ed].ed-error{outline:2px solid #b00000!important}
html.ed-browse [data-ed]{cursor:auto}
html.ed-browse [data-ed]:hover{outline-color:transparent;background-color:transparent}
body{padding-bottom:72px!important}
.ed-ui,.ed-ui *{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;letter-spacing:normal;text-transform:none}
.ed-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 14px;background:#16130d;color:#fff;box-shadow:0 -10px 30px -12px rgba(0,0,0,.45);font-size:14px}
.ed-bar a,.ed-bar button,.ed-tools button,.ed-modal button{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:0 14px;border-radius:999px;font-weight:700;font-size:14px;line-height:1;white-space:nowrap}
.ed-bar a,.ed-bar button{background:rgba(255,255,255,.1);color:#fff}
.ed-bar a:hover,.ed-bar button:hover{background:rgba(255,255,255,.2)}
.ed-bar .ed-primary{background:#CF0000}
.ed-bar .ed-primary:hover{background:#e10a0a}
.ed-bar .ed-on-btn{background:#ffd600;color:#16130d}
.ed-bar .ed-status{flex:1;min-width:140px;color:#d9d3c4;font-size:13.5px;padding:0 6px}
.ed-bar .ed-status b{color:#fff}
.ed-bar .ed-status.ed-bad{color:#ffb4a6}
.ed-tools{position:absolute;z-index:2147483001;display:flex;flex-wrap:wrap;gap:4px;padding:5px;background:#16130d;border-radius:12px;box-shadow:0 14px 34px -12px rgba(0,0,0,.6);max-width:calc(100vw - 16px)}
.ed-tools button{color:#fff;background:transparent;min-height:34px;padding:0 11px;font-size:13.5px}
.ed-tools button:hover{background:rgba(255,255,255,.14)}
.ed-tools .ed-done{background:#CF0000}
.ed-tools .ed-danger:hover{background:#7a1010}
.ed-tools .ed-sep{width:1px;background:rgba(255,255,255,.2);margin:4px 2px}
.ed-modal-bg{position:fixed;inset:0;z-index:2147483002;background:rgba(10,8,4,.55);display:grid;place-items:center;padding:16px}
.ed-modal{background:#fff;color:#16130d;border-radius:18px;padding:22px;width:min(560px,100%);box-shadow:0 30px 70px -20px rgba(0,0,0,.5)}
.ed-modal h3{margin:0 0 6px;font-size:20px;font-weight:800}
.ed-modal p{margin:0 0 14px;color:#5b5446;font-size:14px;line-height:1.45}
.ed-modal label{display:block;font-weight:700;font-size:14px;margin:12px 0 6px}
.ed-modal input,.ed-modal textarea{width:100%;border:1px solid #d8cfb6;border-radius:10px;padding:10px 12px;font-size:15px;color:#16130d;background:#fff}
.ed-modal textarea{min-height:90px;resize:vertical}
.ed-modal small{display:block;color:#7a7262;font-size:12.5px;margin-top:4px}
.ed-modal .ed-row{display:flex;gap:8px;justify-content:flex-end;margin-top:18px}
.ed-modal button{background:#efe8d6;color:#16130d}
.ed-modal button.ed-primary{background:#CF0000;color:#fff}
.ed-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483003;background:#16130d;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600;box-shadow:0 12px 30px -10px rgba(0,0,0,.5)}
.ed-toast.ed-bad{background:#8a1010}
`;

export const OVERLAY_JS = String.raw`
(function () {
  "use strict";
  var ED = window.__ED || {};
  var doc = document, root = doc.documentElement;
  var version = ED.version;
  var browsing = false;
  var active = null; // { el, before, index }
  var tools = null;
  var busy = false;
  root.classList.add("ed-on");

  // ---------------------------------------------------------------- helpers
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(label, cls, fn, title) {
    var b = el("button", cls || "", label); b.type = "button"; if (title) b.title = title;
    b.addEventListener("mousedown", function (e) { e.preventDefault(); });
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
    return b;
  }
  function toast(msg, bad) {
    var t = el("div", "ed-ui ed-toast" + (bad ? " ed-bad" : ""), msg); doc.body.appendChild(t);
    setTimeout(function () { t.remove(); }, bad ? 6000 : 2200);
  }
  function setStatus(html, bad) { status.innerHTML = html; status.classList.toggle("ed-bad", !!bad); }
  function api(path, body) {
    return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("Error " + r.status)); return j; }); });
  }
  function save(op) {
    return api("/api/editor/save", { page: ED.page, version: version, op: op }).then(function (j) { version = j.version; return j; });
  }
  var SCROLL_KEY = "ed-scroll:" + location.pathname;
  function reload() { try { sessionStorage.setItem(SCROLL_KEY, String(scrollY)); } catch (e) {} location.reload(); }
  try { var y = sessionStorage.getItem(SCROLL_KEY); if (y) { sessionStorage.removeItem(SCROLL_KEY); scrollTo(0, Number(y) || 0); } } catch (e) {}

  // ---------------------------------------------------------------- bottom bar
  var bar = el("div", "ed-ui ed-bar");
  var back = el("a", "", "← All pages"); back.href = "/editor";
  var status = el("span", "ed-status");
  var details = btn("Title & description", "", openDetails, "The page title and description Google shows");
  var browse = btn("Click links", "", toggleBrowse, "Turn editing off for a moment to click links and open sections");
  var live = el("a", "", "View live page"); live.href = ED.livePath || "/"; live.target = "_blank"; live.rel = "noopener";
  var publish = el("a", "ed-primary", "Changes & Publish"); publish.href = "/editor#changes";
  bar.appendChild(back); bar.appendChild(status); bar.appendChild(details); bar.appendChild(browse); bar.appendChild(live); bar.appendChild(publish);
  doc.body.appendChild(bar);
  setStatus(ED.mode === "local"
    ? "<b>Editing (on this computer).</b> Click any words or photo to change them."
    : "<b>Click any words or photo to change them.</b> Changes save as drafts until you publish.");

  function toggleBrowse() {
    if (active) finish(true);
    browsing = !browsing;
    root.classList.toggle("ed-browse", browsing);
    browse.textContent = browsing ? "Back to editing" : "Click links";
    browse.classList.toggle("ed-on-btn", browsing);
    setStatus(browsing ? "<b>Editing is off.</b> Links and sections work. Press “Back to editing” when done." : "<b>Click any words or photo to change them.</b>");
  }

  // ---------------------------------------------------------------- links and clicks
  function previewHref(a) {
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#") return { hash: href.slice(1) };
    var u; try { u = new URL(href, location.origin + (ED.livePath || "/")); } catch (e) { return null; }
    if (u.origin === location.origin && /^\/(guides|tools)(\/|$)/.test(u.pathname) && !/\.[a-z0-9]+$/i.test(u.pathname.replace(/\/index\.html$/, ""))) {
      return { url: "/editor/preview" + u.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "") + u.hash };
    }
    return { external: u.href };
  }

  doc.addEventListener("click", function (e) {
    var t = e.target;
    if (!(t instanceof Element) || t.closest(".ed-ui")) return;
    if (!browsing) {
      var ed = t.closest("[data-ed]");
      if (ed) {
        e.preventDefault(); e.stopPropagation();
        if (ed.getAttribute("data-ed-k") === "img") { if (active) finish(true); pickPhoto(function (src) { replacePhoto(ed, src); }); }
        else if (!active || active.el !== ed) start(ed);
        return;
      }
      if (active && !t.closest(".ed-editing")) { finish(true); }
    }
    var a = t.closest("a[href]");
    if (a) {
      var p = previewHref(a);
      e.preventDefault();
      if (!p) return;
      if (p.hash != null) { var target = doc.getElementById(p.hash); if (target) target.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (p.url) { location.href = p.url; return; }
      if (p.external) window.open(p.external, "_blank", "noopener");
      return;
    }
    if (!browsing && t.closest("summary,label")) e.preventDefault();
  }, true);
  doc.addEventListener("submit", function (e) { e.preventDefault(); }, true);

  // ---------------------------------------------------------------- text editing
  var ONE_LINE = /^(H1|H2|H3|H4|H5|H6|SUMMARY|SPAN|A|B|STRONG|EM|I|SMALL|LABEL|CAPTION|LEGEND|CITE|MARK|Q)$/;

  function start(ed) {
    if (busy) return;
    if (active) finish(true);
    active = { el: ed, before: ed.innerHTML, index: Number(ed.getAttribute("data-ed")) };
    ed.setAttribute("contenteditable", "true");
    ed.setAttribute("spellcheck", "true");
    ed.classList.add("ed-editing");
    ed.focus();
    showTools(ed);
    setStatus("<b>Typing…</b> Press Done (or Enter) to save, Esc to cancel.");
  }

  function stop(ed) {
    ed.removeAttribute("contenteditable"); ed.removeAttribute("spellcheck"); ed.classList.remove("ed-editing");
    if (tools) { tools.remove(); tools = null; }
  }

  function finish(keep) {
    if (!active) return Promise.resolve();
    var a = active; active = null;
    stop(a.el);
    if (!keep) { a.el.innerHTML = a.before; setStatus("Change cancelled."); return Promise.resolve(); }
    var html = a.el.innerHTML;
    if (html === a.before) { setStatus("<b>Click any words or photo to change them.</b>"); return Promise.resolve(); }
    a.el.classList.add("ed-saving"); busy = true; setStatus("Saving…");
    return save({ type: "text", index: a.index, html: html }).then(function () {
      a.el.classList.remove("ed-saving"); busy = false;
      setStatus(ED.mode === "local" ? "<b>Saved</b> to the file." : "<b>Saved as a draft.</b> Publish when you’re ready.");
    }).catch(function (err) {
      a.el.classList.remove("ed-saving"); busy = false; a.el.innerHTML = a.before; a.el.classList.add("ed-error");
      setTimeout(function () { a.el.classList.remove("ed-error"); }, 4000);
      setStatus("Not saved: " + err.message, true); toast("Not saved: " + err.message, true);
    });
  }

  doc.addEventListener("keydown", function (e) {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); finish(false); return; }
    if (e.key === "Enter") {
      if (e.shiftKey && !ONE_LINE.test(active.el.tagName)) { e.preventDefault(); doc.execCommand("insertLineBreak"); return; }
      e.preventDefault(); finish(true); return;
    }
  }, true);

  doc.addEventListener("paste", function (e) {
    if (!active || !active.el.contains(e.target)) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
    doc.execCommand("insertText", false, text.replace(/\s*\n\s*/g, " "));
  }, true);
  doc.addEventListener("drop", function (e) { if (active) e.preventDefault(); }, true);

  function showTools(ed) {
    tools = el("div", "ed-ui ed-tools");
    tools.appendChild(btn("B", "", function () { doc.execCommand("bold"); }, "Bold"));
    tools.appendChild(btn("I", "", function () { doc.execCommand("italic"); }, "Italic"));
    tools.appendChild(btn("Link", "", addLink, "Turn the selected words into a link"));
    var ops = (ed.getAttribute("data-ed-ops") || "").split(" ");
    if (ops.indexOf("add-paragraph") > -1 || ops.indexOf("add-item") > -1 || ops.indexOf("add-photo") > -1 || ops.indexOf("remove") > -1) tools.appendChild(el("span", "ed-sep"));
    if (ops.indexOf("add-paragraph") > -1) tools.appendChild(btn("+ Paragraph", "", function () { blockOp({ type: "insert", what: "paragraph" }); }, "Add a new paragraph below this one"));
    if (ops.indexOf("add-item") > -1) tools.appendChild(btn("+ Item", "", function () { blockOp({ type: "insert", what: "item" }); }, "Add a new list item below this one"));
    if (ops.indexOf("add-photo") > -1) tools.appendChild(btn("+ Photo", "", addPhotoBelow, "Add a photo below this"));
    if (ops.indexOf("remove") > -1) tools.appendChild(btn("Remove", "ed-danger", removeBlock, "Remove this from the page"));
    tools.appendChild(el("span", "ed-sep"));
    tools.appendChild(btn("Cancel", "", function () { finish(false); }));
    tools.appendChild(btn("Done", "ed-done", function () { finish(true); }));
    doc.body.appendChild(tools);
    var r = ed.getBoundingClientRect();
    var top = r.top + scrollY - tools.offsetHeight - 10;
    if (top < scrollY + 6) top = r.bottom + scrollY + 10;
    tools.style.top = top + "px";
    tools.style.left = Math.max(8, Math.min(r.left + scrollX, scrollX + innerWidth - tools.offsetWidth - 8)) + "px";
  }

  function addLink() {
    var sel = getSelection();
    if (!sel || sel.isCollapsed) { toast("First select the words that should become a link."); return; }
    var range = sel.getRangeAt(0);
    var url = prompt("Link to (a web address like https://…, a page like /guides/still-no-calls, or tel:+1…). Leave empty to remove a link.", "https://");
    sel.removeAllRanges(); sel.addRange(range);
    if (url === null) return;
    url = url.trim();
    if (!url || url === "https://") { doc.execCommand("unlink"); return; }
    if (!/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url)) url = "https://" + url;
    doc.execCommand("createLink", false, url);
  }

  function blockOp(op) {
    if (!active || busy) return;
    var a = active;
    var changed = a.el.innerHTML !== a.before;
    var first = changed ? finish(true) : (finish(false), Promise.resolve());
    first.then(function () {
      busy = true; setStatus("Saving…");
      op.index = a.index;
      return save(op).then(reload);
    }).catch(function (err) { busy = false; setStatus("Not saved: " + err.message, true); toast("Not saved: " + err.message, true); });
  }

  function removeBlock() {
    if (!confirm("Remove this from the page? (You can undo it from “Changes & Publish” until you publish.)")) return;
    if (active) active.el.innerHTML = active.before;
    blockOp({ type: "remove" });
  }

  // ---------------------------------------------------------------- photos
  function pickPhoto(done) {
    if (ED.section == null) { toast("Photos can't be added on this page.", true); return; }
    var input = el("input"); input.type = "file"; input.accept = "image/jpeg,image/png,image/webp,image/heic";
    input.addEventListener("change", function () {
      var f = input.files && input.files[0]; if (!f) return;
      setStatus("Getting the photo ready…");
      shrink(f).then(function (blob) {
        setStatus("Uploading the photo…");
        return fetch("/api/editor/upload?page=" + encodeURIComponent(ED.page), {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": blob.type || "application/octet-stream", "X-File-Name": encodeURIComponent(f.name.slice(0, 80)) },
          body: blob
        }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Upload failed"); return j.src; }); });
      }).then(done).catch(function (err) { setStatus("Photo not added: " + err.message, true); toast("Photo not added: " + err.message, true); });
    });
    input.click();
  }

  // Photos are made web-ready in the browser: turned upright, longest side at most 2000 px, saved as WebP (or JPEG).
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file); var img = new Image();
      img.onload = function () {
        var max = 2000, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = doc.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (b && b.type === "image/webp") return resolve(b);
          c.toBlob(function (j) { j ? resolve(j) : reject(new Error("This browser couldn't read the photo.")); }, "image/jpeg", 0.85);
        }, "image/webp", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("That file isn't a photo this browser can read. Try a JPEG.")); };
      img.src = url;
    });
  }

  function askAlt(current) {
    var alt = prompt("Describe the photo in a few words (for Google and for people who can't see it):", current || "");
    return alt == null ? (current || "") : alt;
  }

  function replacePhoto(img, src) {
    var alt = askAlt(img.getAttribute("alt"));
    setStatus("Saving…");
    save({ type: "image", index: Number(img.getAttribute("data-ed")), src: src, alt: alt }).then(reload)
      .catch(function (err) { setStatus("Not saved: " + err.message, true); toast("Not saved: " + err.message, true); });
  }

  function addPhotoBelow() {
    if (!active) return;
    var a = active;
    pickPhoto(function (src) {
      var alt = askAlt("");
      var changed = a.el.innerHTML !== a.before;
      (changed ? finish(true) : (finish(false), Promise.resolve())).then(function () {
        return save({ type: "insert", what: "photo", index: a.index, src: src, alt: alt });
      }).then(reload).catch(function (err) { setStatus("Not saved: " + err.message, true); toast("Not saved: " + err.message, true); });
    });
  }

  // ---------------------------------------------------------------- page title & description
  function openDetails() {
    if (active) finish(true);
    var bg = el("div", "ed-ui ed-modal-bg"), m = el("div", "ed-modal");
    m.appendChild(el("h3", "", "Title & description"));
    m.appendChild(el("p", "", "What Google shows for this page in search results. Keep the title under about 60 characters and the description under about 155."));
    var l1 = el("label", "", "Title"); var t = el("input"); t.value = ED.title || ""; t.maxLength = 200;
    var c1 = el("small"); var l2 = el("label", "", "Description"); var d = el("textarea"); d.value = ED.description || ""; d.maxLength = 400;
    var c2 = el("small");
    function count() { c1.textContent = t.value.length + " characters"; c2.textContent = d.value.length + " characters"; }
    t.addEventListener("input", count); d.addEventListener("input", count); count();
    m.appendChild(l1); m.appendChild(t); m.appendChild(c1); m.appendChild(l2); m.appendChild(d); m.appendChild(c2);
    var row = el("div", "ed-row");
    row.appendChild(btn("Cancel", "", function () { bg.remove(); }));
    row.appendChild(btn("Save", "ed-primary", function () {
      save({ type: "meta", title: t.value, description: d.value }).then(function () {
        ED.title = t.value; ED.description = d.value; bg.remove(); toast("Saved"); setStatus("<b>Saved.</b>");
      }).catch(function (err) { toast("Not saved: " + err.message, true); });
    }));
    m.appendChild(row); bg.appendChild(m); doc.body.appendChild(bg);
    bg.addEventListener("click", function (e) { if (e.target === bg) bg.remove(); });
    t.focus();
  }

  addEventListener("beforeunload", function (e) { if (active && active.el.innerHTML !== active.before) { e.preventDefault(); e.returnValue = ""; } });
})();
`;
