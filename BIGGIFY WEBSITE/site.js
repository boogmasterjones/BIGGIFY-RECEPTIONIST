/* Biggify marketing pages (homepage, how-it-works, privacy). Small and deferred: menu, quick reveals, the one-time call
   signature, before/after sliders, the work carousel, card glare, the phone call bar and the late-loaded booking calendar.
   Animations always play (owner 2026-10-26); everything here is transform/opacity and stops when it is off screen. */
(function () {
  "use strict";
  var d = document, w = window;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var hasIO = "IntersectionObserver" in w;
  var finePointer = w.matchMedia && w.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ---- menu ---- */
  var menuBtn = $(".menu-btn"), panel = $(".menu-panel");
  if (menuBtn && panel) {
    var setMenu = function (open) {
      panel.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
      d.body.classList.toggle("menu-open", open);
    };
    menuBtn.addEventListener("click", function (e) { e.stopPropagation(); setMenu(panel.hidden); });
    $$("a", panel).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    d.addEventListener("click", function (e) { if (!panel.hidden && !e.target.closest("header")) setMenu(false); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---- reveals: quick, early, once ---- */
  var rv = $$(".rv");
  if (hasIO && rv.length) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        // stagger siblings that arrive together, a little
        var sibs = en.target.parentNode ? $$(":scope > .rv:not(.in)", en.target.parentNode) : [];
        var i = Math.max(0, sibs.indexOf(en.target));
        en.target.style.setProperty("--rd", Math.min(i, 3) * 0.07 + "s");
        en.target.classList.add("in");
        seen.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    rv.forEach(function (el) { seen.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- the signature: plays once when it is properly on screen, then rests ---- */
  var sig = $("[data-callsig]");
  if (sig && hasIO && sig.classList.contains("armed")) {
    var sigSeen = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      sig.classList.add("play");
      sigSeen.disconnect();
    }, { threshold: 0.35 });
    sigSeen.observe(sig);
  }

  /* ---- the ambient pauses when its band is off screen ---- */
  if (hasIO) {
    var amb = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-off", !en.isIntersecting); });
    });
    $$(".hero").forEach(function (h) { amb.observe(h); });
  }

  /* ---- before/after sliders ---- */
  $$("[data-cmp]").forEach(function (box) {
    var range = $("input[type=range]", box);
    if (!range) return;
    var set = function (v) { box.style.setProperty("--pos", v + "%"); };
    range.addEventListener("input", function () { box.dataset.touched = "1"; set(range.value); });
    set(range.value);
  });
  // one small nudge on the first slider, so people see it moves
  var firstCmp = $("[data-cmp]");
  if (firstCmp && hasIO) {
    var nudge = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      nudge.disconnect();
      var t0 = null, range = $("input[type=range]", firstCmp);
      var step = function (t) {
        if (firstCmp.dataset.touched) return;
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 1500);
        var v = 50 + Math.sin(p * Math.PI * 2) * 14 * (1 - p * 0.35);
        firstCmp.style.setProperty("--pos", v + "%");
        if (p < 1) w.requestAnimationFrame(step);
        else { firstCmp.style.setProperty("--pos", "50%"); range.value = 50; }
      };
      w.setTimeout(function () { w.requestAnimationFrame(step); }, 500);
    }, { threshold: 0.6 });
    nudge.observe(firstCmp);
  }

  /* ---- work carousel arrows ---- */
  var track = $("[data-car]");
  if (track) {
    var prev = $("[data-car-prev]"), next = $("[data-car-next]");
    var cardStep = function () {
      var c = track.firstElementChild;
      return c ? c.getBoundingClientRect().width + 20 : 400;
    };
    var sync = function () {
      if (!prev || !next) return;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
    };
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -cardStep(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: cardStep(), behavior: "smooth" }); });
    track.addEventListener("scroll", function () { w.requestAnimationFrame(sync); }, { passive: true });
    track.addEventListener("keydown", function (e) {
      if (e.target !== track) return; // the sliders keep their own arrow keys
      if (e.key === "ArrowRight") { e.preventDefault(); track.scrollBy({ left: cardStep(), behavior: "smooth" }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); track.scrollBy({ left: -cardStep(), behavior: "smooth" }); }
    });
    sync();
  }

  /* ---- card glare + a small tilt (mouse only) ---- */
  if (finePointer) {
    $$(".fx").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
    });
    $$("[data-tilt]").forEach(function (el) {
      var host = el.closest(".callsig") || el.parentNode;
      host.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(1100px) rotateY(" + (x * 5).toFixed(2) + "deg) rotateX(" + (-y * 4).toFixed(2) + "deg)";
      });
      host.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- phone call bar: after the hero, away from the booking calendar and the footer ---- */
  var bar = $("[data-callbar]"), hero = $(".hero");
  if (bar && hero && hasIO) {
    bar.hidden = false;
    var state = { hero: true, contact: false, foot: false };
    var paint = function () { bar.classList.toggle("show", !state.hero && !state.contact && !state.foot); };
    var watch = function (el, key) {
      if (!el) return;
      new IntersectionObserver(function (en) { state[key] = en[0].isIntersecting; paint(); }).observe(el);
    };
    watch(hero, "hero"); watch($("#contact"), "contact"); watch($("footer"), "foot");
  }

  /* ---- booking calendar: load Calendly only when it is nearly on screen ---- */
  var cal = $(".calendly-inline-widget");
  if (cal) {
    var loadCal = function () {
      if (loadCal.done) return; loadCal.done = true;
      var s = d.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js"; s.async = true;
      d.body.appendChild(s);
    };
    if (hasIO) {
      var calSeen = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { loadCal(); calSeen.disconnect(); } }, { rootMargin: "900px 0px" });
      calSeen.observe(cal);
    } else loadCal();
    // a tap on any "book"/"quote" link should not wait for the scroll
    $$('a[href$="#contact"]').forEach(function (a) { a.addEventListener("click", loadCal); });
  }
})();
