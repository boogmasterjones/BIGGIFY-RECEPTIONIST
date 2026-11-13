/* The form on the three "I do it for you" free offers: /tools/xray/, /tools/trial/ and /tools/tuneup/.
   Needs /tools/config.js first (Biggify.send, Biggify.showFieldError, ...). The request contract is docs/lead-magnets/INTAKE_CONTRACT.md in Hubert.

   Markup it expects:
     <form id="svc-form" data-magnet="gbp_xray"> with <div class="field" data-name="email"> ... <p class="error"></p></div> per field.
       Inputs named name, business, city, state, trade, phone, email, smsConsent, website (honeypot) go at the top level of the request.
       Inputs with data-answer go into "answers" (e.g. mapsLink).
     <section id="svc-thanks" hidden> with [data-show-email], [data-service-message], and optional [data-when="waitlist"] / [data-when="requested"] blocks.
     An optional <button data-interest="gbp_tuneup"> on the thank-you view, with #svc-interest-done and #svc-interest-error. */
(function () {
  "use strict";
  var form = document.getElementById("svc-form");
  if (!form) return;
  var B = window.Biggify;
  var magnet = form.getAttribute("data-magnet");
  var err = form.querySelector(".form-error");
  var btn = form.querySelector('button[type="submit"]');
  var btnText = btn.textContent;
  var thanks = document.getElementById("svc-thanks");
  var key = null;

  function value(name) {
    var el = form.elements[name];
    return el ? String(el.value || "").trim() : "";
  }
  function fieldError(name, message) {
    var box = form.querySelector('.field[data-name="' + name + '"]');
    if (!box) return false;
    box.setAttribute("data-error", "");
    var p = box.querySelector(".error");
    if (p) p.textContent = message;
    var input = box.querySelector("input,select,textarea");
    if (input) input.focus();
    return true;
  }
  function showError(message) {
    err.textContent = message;
    err.setAttribute("data-show", "");
  }
  function check() {
    var bad = null;
    Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (el) {
      if (!bad && !String(el.value || "").trim()) bad = [el.name, "Please fill this in."];
    });
    if (bad) return bad;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value("email"))) return ["email", "Enter your email."];
    var digits = value("phone").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (value("phone") && digits.length !== 10) return ["phone", "Enter a 10-digit phone number."];
    if (form.elements.smsConsent && form.elements.smsConsent.checked && !value("phone")) return ["phone", "Add your phone number, or untick the texting box."];
    var one = form.getAttribute("data-one-of");
    if (one) {
      var names = one.split(",");
      if (!names.some(function (n) { return value(n); })) return [names[0], "Paste your Google Maps link or type your address."];
    }
    return null;
  }

  function showThanks(json) {
    var service = (json && json.service) || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-show-email]"), function (el) { el.textContent = value("email"); });
    if (service.message) Array.prototype.forEach.call(document.querySelectorAll("[data-service-message]"), function (el) { el.textContent = service.message; });
    var state = service.status === "waitlist" ? "waitlist" : "requested";
    Array.prototype.forEach.call(document.querySelectorAll("[data-when]"), function (el) { el.hidden = el.getAttribute("data-when") !== state; });
    form.closest("[data-form-wrap]").hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: "smooth", block: "start" });
    var h = thanks.querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    err.removeAttribute("data-show");
    Array.prototype.forEach.call(form.querySelectorAll(".field[data-error]"), function (f) { f.removeAttribute("data-error"); });
    var bad = check();
    if (bad) { if (!fieldError(bad[0], bad[1])) showError(bad[1]); return; }
    if (!B) { showError("This form isn't working right now. Call or text me at (941) 401-8288."); return; }

    var answers = {};
    Array.prototype.forEach.call(form.querySelectorAll("[data-answer]"), function (el) { var v = String(el.value || "").trim(); if (v) answers[el.name] = v.slice(0, 1000); });
    var body = { action: "submit", magnet: magnet, email: value("email"), state: (value("state") || "FL").toUpperCase(), smsConsent: !!(form.elements.smsConsent && form.elements.smsConsent.checked), website: value("website"), answers: answers };
    ["name", "business", "city", "trade", "phone"].forEach(function (n) { if (value(n)) body[n] = value(n); });
    if (key) body.submissionKey = key;

    btn.disabled = true;
    btn.textContent = "Sending…";
    B.send(body).then(function (r) {
      key = r.submissionKey; // a retry after an error is the same request, not a second one
      btn.disabled = false;
      btn.textContent = btnText;
      if (r.status === 200 && r.json && r.json.ok) return showThanks(r.json);
      if ((r.status === 400 || r.status === 422) && r.json && r.json.field) {
        var name = String(r.json.field).replace(/^answers\./, "");
        if (fieldError(name, r.json.error || "Please check this.")) return;
      }
      if (r.status === 503) return showError("This isn't switched on yet. Call or text me at (941) 401-8288 and I'll do it by hand.");
      showError(B.failMessage ? B.failMessage(r) : "That didn't go through. Call or text me at (941) 401-8288.");
    });
  });

  var interest = document.querySelector("[data-interest]");
  if (interest) {
    interest.addEventListener("click", function () {
      var done = document.getElementById("svc-interest-done");
      var fail = document.getElementById("svc-interest-error");
      fail.removeAttribute("data-show");
      interest.disabled = true;
      B.send({ action: "interest", magnet: magnet, submissionKey: key, interest: interest.getAttribute("data-interest") }).then(function (r) {
        if (r.status === 200 && r.json && r.json.ok) { done.setAttribute("data-show", ""); interest.hidden = true; return; }
        interest.disabled = false;
        fail.textContent = "That didn't go through. Call or text me at (941) 401-8288.";
        fail.setAttribute("data-show", "");
      });
    });
  }
})();
