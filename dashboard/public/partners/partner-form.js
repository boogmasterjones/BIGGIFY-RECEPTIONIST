/* The Biggify Partners sign-up form on gobiggify.com/partners (owner 2026-11-18).
   Needs /tools/config.js first (Biggify.config.HUBERT_PARTNER_URL, Biggify.tracking). The request contract is
   docs/affiliates/PARTNER_API.md in the Hubert repo. Every word shown here follows the owner's 3rd-grade reading rule
   (tests/partners-page.test.ts checks MESSAGES).

   No code is ever shown after sign-up: Hubert answers with a thank-you message, and Wyatt sends the code once he says yes. */
(function () {
  "use strict";

  var PHONE = "(941) 401-8288";
  var MESSAGES = {
    required: "Please fill this in.",
    email: "Enter your email.",
    phone: "Enter a 10-digit phone number.",
    payoutKind: "Pick how you want to be paid.",
    kindOther: "Tell me what kind of business.",
    checkForm: "Please check the form.",
    tooMany: "Too many tries. Please wait a few minutes, or call or text me at " + PHONE + ".",
    notOpen: "Sign-ups are not open yet. Please call or text me at " + PHONE + ".",
    offline: "That did not go through. It may be your connection. Please try again, or call or text me at " + PHONE + ".",
    broken: "Something went wrong on my side. Please call or text me at " + PHONE + ".",
    thanks: "Thanks! I got your sign-up. I will call you soon. Once you are all set, I will send you your own code. Wyatt",
    sending: "Sending…",
  };
  var FIELDS = ["name", "business", "email", "phone", "city", "kind", "kindOther", "payoutKind", "message"];
  var KIND_OTHER_MAX = 60;
  var KINDS = ["supply_house", "bookkeeper", "insurance", "school", "sign_shop", "equipment", "banker", "payroll", "web_designer", "realtor", "client", "other"];

  /** First problem in the typed values, as [field, message], or null. */
  function check(v) {
    var req = ["name", "business", "email", "phone", "city"];
    for (var i = 0; i < req.length; i++) if (!v[req[i]]) return [req[i], req[i] === "email" ? MESSAGES.email : req[i] === "phone" ? MESSAGES.phone : MESSAGES.required];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return ["email", MESSAGES.email];
    if (v.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").length !== 10) return ["phone", MESSAGES.phone];
    if (v.kind === "other" && !v.kindOther) return ["kindOther", MESSAGES.kindOther];
    if (v.payoutKind !== "cash" && v.payoutKind !== "percent") return ["payoutKind", MESSAGES.payoutKind];
    return null;
  }

  /** The request body (PARTNER_API.md section 1). Blank optional fields are left out; the amount is never sent.
      Hubert has no field for an "Other" kind's words yet (owner 2026-11-18): they go first in message as "Business type: ...". */
  function buildBody(v, extra) {
    var body = { name: v.name, email: v.email, payoutKind: v.payoutKind, website: v.website || "", elapsedMs: extra.elapsedMs, page: extra.page, utm: extra.utm || {} };
    ["business", "phone", "city"].forEach(function (k) { if (v[k]) body[k] = v[k]; });
    if (v.kind && KINDS.indexOf(v.kind) !== -1) body.kind = v.kind;
    var lines = [];
    var other = v.kind === "other" ? String(v.kindOther || "").slice(0, KIND_OTHER_MAX) : "";
    if (other) lines.push("Business type: " + other);
    if (v.message) lines.push(v.message);
    if (lines.length) body.message = lines.join("\n").slice(0, 1000);
    return body;
  }

  /** What to show for an answer: { ok, message } or { ok: false, field, message }. status 0 = no connection. */
  function describe(status, json) {
    json = json || {};
    if (status === 200 && json.ok) return { ok: true, message: json.message || MESSAGES.thanks };
    if (status === 0) return { ok: false, message: MESSAGES.offline };
    if (status === 400) return json.field ? { ok: false, field: String(json.field), message: json.error || MESSAGES.checkForm } : { ok: false, message: json.error || MESSAGES.checkForm };
    if (json.error) return { ok: false, message: json.error };
    if (status === 429) return { ok: false, message: MESSAGES.tooMany };
    if (status === 503) return { ok: false, message: MESSAGES.notOpen };
    return { ok: false, message: MESSAGES.broken };
  }

  window.BiggifyPartner = { MESSAGES: MESSAGES, check: check, buildBody: buildBody, describe: describe };

  var form = typeof document !== "undefined" && document.getElementById("partner-form");
  if (!form) return;
  var B = window.Biggify;
  var err = form.querySelector(".form-error");
  var btn = form.querySelector('button[type="submit"]');
  var btnText = btn.textContent;
  var thanks = document.getElementById("partner-thanks");
  var sending = false;

  // The "Other" box shows (and is needed) only when Other is picked.
  var kindSel = form.elements.kind;
  var otherBox = form.querySelector('.field[data-name="kindOther"]');
  function syncOther() {
    var on = kindSel.value === "other";
    otherBox.hidden = !on;
    form.elements.kindOther.required = on;
    if (!on) { otherBox.removeAttribute("data-error"); form.elements.kindOther.removeAttribute("aria-invalid"); }
  }
  if (kindSel && otherBox) { kindSel.addEventListener("change", syncOther); syncOther(); }

  function values() {
    var v = {};
    FIELDS.concat(["website"]).forEach(function (n) {
      var el = form.elements[n];
      v[n] = el ? String(el.value || "").trim() : "";
    });
    return v;
  }
  function clearErrors() {
    err.removeAttribute("data-show");
    err.textContent = "";
    Array.prototype.forEach.call(form.querySelectorAll(".field[data-error]"), function (f) {
      f.removeAttribute("data-error");
      Array.prototype.forEach.call(f.querySelectorAll("input,select,textarea"), function (i) { i.removeAttribute("aria-invalid"); });
    });
  }
  function fieldError(name, message) {
    var box = form.querySelector('.field[data-name="' + name + '"]');
    if (!box) return false;
    box.setAttribute("data-error", "");
    var p = box.querySelector(".error");
    if (p) {
      p.textContent = message;
      if (!p.id) p.id = "err-" + name;
    }
    var inputs = box.querySelectorAll("input,select,textarea");
    Array.prototype.forEach.call(inputs, function (i) {
      i.setAttribute("aria-invalid", "true");
      if (p) i.setAttribute("aria-errormessage", p.id);
    });
    if (inputs[0]) inputs[0].focus();
    return true;
  }
  function showError(message) {
    err.textContent = message;
    err.setAttribute("data-show", "");
    err.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function showThanks(message) {
    var p = thanks.querySelector("[data-partner-message]");
    if (p) p.textContent = message;
    form.closest("[data-form-wrap]").hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: "smooth", block: "start" });
    var h = thanks.querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (sending) return;
    clearErrors();
    var v = values();
    var bad = check(v);
    if (bad) { if (!fieldError(bad[0], bad[1])) showError(bad[1]); return; }
    var url = B && B.config && B.config.HUBERT_PARTNER_URL;
    if (!url) { showError(MESSAGES.broken); return; }

    var body = buildBody(v, {
      elapsedMs: Math.round(window.performance && performance.now ? performance.now() : 0),
      page: window.location.pathname,
      utm: B.tracking ? B.tracking() : {},
    });
    sending = true;
    btn.disabled = true;
    btn.textContent = MESSAGES.sending;
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) { return { status: res.status, json: json }; });
      })
      .catch(function () { return { status: 0, json: {} }; })
      .then(function (r) {
        sending = false;
        btn.disabled = false;
        btn.textContent = btnText;
        var d = describe(r.status, r.json);
        if (d.ok) return showThanks(d.message);
        if (d.field && fieldError(d.field, d.message)) return;
        showError(d.message);
      });
  });
})();
