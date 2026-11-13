// Biggify guides: reading progress, contents rail that follows you, tick-off checklists that remember (this browser only),
// copy/text/email/print buttons, quick reveals. No dependencies.
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;

  // reading progress (top bar)
  var bar = doc.querySelector(".g-progress span"), article = doc.querySelector(".g-article");
  function progress() {
    if (!bar || !article) return;
    var r = article.getBoundingClientRect(), total = r.height - innerHeight * 0.6;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    bar.style.transform = "scaleX(" + p + ")";
  }

  // contents rail: highlight the section you're in, tick ones you've passed
  var links = [].slice.call(doc.querySelectorAll(".g-toc a[href^='#']"));
  var sections = links.map(function (a) { return doc.getElementById(a.getAttribute("href").slice(1)); });
  function spy() {
    var line = innerHeight * 0.3, current = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) current = i; });
    links.forEach(function (a, i) {
      a.classList.toggle("is-active", i === current);
      a.classList.toggle("is-done", i < current);
      if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }

  // the contents list starts open on wide screens, folded on phones
  var toc = doc.querySelector(".g-toc");
  function tocMode() { if (toc) toc.open = matchMedia("(min-width:1080px)").matches || toc.dataset.userOpen === "1"; }
  if (toc) {
    toc.querySelector("summary").addEventListener("click", function (e) {
      if (matchMedia("(min-width:1080px)").matches) { e.preventDefault(); return; }
      toc.dataset.userOpen = toc.open ? "0" : "1";
    });
    links.forEach(function (a) { a.addEventListener("click", function () { if (!matchMedia("(min-width:1080px)").matches) { toc.open = false; toc.dataset.userOpen = "0"; } }); });
    tocMode(); addEventListener("resize", tocMode);
  }

  var ticking = false;
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { progress(); spy(); ticking = false; }); }
  addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); onScroll();

  // checklists: remember ticks in this browser (fine if storage is blocked)
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  [].slice.call(doc.querySelectorAll(".g-check")).forEach(function (box, n) {
    var key = "biggify-guide:" + location.pathname + ":" + (box.id || n);
    var inputs = [].slice.call(box.querySelectorAll("input[type=checkbox]"));
    var count = box.querySelector(".g-check-count"), fill = box.querySelector(".g-check-bar span");
    var saved = (store(key) || "").split(",");
    inputs.forEach(function (inp, i) { inp.checked = saved.indexOf(String(i)) > -1; });
    function update(save) {
      var done = inputs.filter(function (i) { return i.checked; }).length;
      if (count) count.textContent = done + " of " + inputs.length + " done";
      if (fill) fill.style.width = (inputs.length ? (done / inputs.length) * 100 : 0) + "%";
      box.classList.toggle("is-complete", done === inputs.length && inputs.length > 0);
      if (save) store(key, inputs.map(function (inp, i) { return inp.checked ? i : ""; }).filter(String).join(","));
    }
    inputs.forEach(function (inp) { inp.addEventListener("change", function () { update(true); }); });
    var reset = box.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", function () { inputs.forEach(function (i) { i.checked = false; }); update(true); });
    update(false);
  });

  // share buttons
  var url = (doc.querySelector("link[rel=canonical]") || {}).href || location.href;
  var title = doc.title.replace(/\s*\|\s*Biggify$/, "");
  [].slice.call(doc.querySelectorAll("[data-share]")).forEach(function (b) {
    var kind = b.getAttribute("data-share");
    if (kind === "sms") b.href = "sms:?&body=" + encodeURIComponent(title + " " + url);
    if (kind === "email") b.href = "mailto:?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent("Thought this might help:\n\n" + url);
    b.addEventListener("click", function (e) {
      if (kind === "print") { e.preventDefault(); print(); }
      if (kind === "copy") {
        e.preventDefault();
        var label = b.querySelector("span"), old = label ? label.textContent : "";
        var done = function () { b.classList.add("is-copied"); if (label) label.textContent = "Link copied"; setTimeout(function () { b.classList.remove("is-copied"); if (label) label.textContent = old; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
      }
    });
  });

  // quick reveals, early (sections only; the hero and short version are visible from the start)
  var rev = [].slice.call(doc.querySelectorAll(".g-article>section, .g-share, .g-end, .g-card"));
  if ("IntersectionObserver" in window) {
    rev.forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) el.classList.add("g-reveal"); });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    rev.forEach(function (el) { io.observe(el); });
    addEventListener("beforeprint", function () { rev.forEach(function (el) { el.classList.add("is-in"); }); });
  }
  root.classList.add("g-js");
})();
