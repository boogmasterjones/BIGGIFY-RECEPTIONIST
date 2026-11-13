/* Shared settings and helpers for the free tools on gobiggify.com/tools/.
   The request contract is docs/lead-magnets/INTAKE_CONTRACT.md in the Hubert repo (branch feat/lead-magnets).
   Every tools page loads this file first: <script src="/tools/config.js"></script> */
(function () {
  "use strict";

  var config = {
    // Where every form posts. Change it here only. While testing locally, Hubert's LEAD_MAGNET_ALLOWED_ORIGINS must list this site's origin.
    HUBERT_INTAKE_URL: "https://biggify-dashboard.netlify.app/api/public/lead-magnet",
    // The demo receptionist line (#4). OFF while (941) 646-3030 is Wyatt's cold-call practice line. To switch it on, see
    // tools/demo-line/README.md: set this to true, and nothing else on the site needs to change.
    DEMO_LINE_ON: false,
    DEMO_LINE_DISPLAY: "(941) 646-3030",
    DEMO_LINE_TEL: "+19416463030",
    // Biggify's own number, shown as the fallback on every page.
    PHONE_DISPLAY: "(941) 401-8288",
    PHONE_TEL: "+19414018288",
    // The stand-alone AI receptionist with no commitment, for the calculator's "pays for itself" line (Hubert uses the same number).
    RECEPTIONIST_MONTHLY: 147,
  };

  // The texting opt-in words. Copy exactly; Hubert stores the same text with every ticked box.
  var CONSENT_TEXT =
    "By providing your phone number and checking this box, you agree to receive SMS customer care messages from BIGGIFY LLC: callback confirmations, follow-ups on a request you made, appointment reminders and a short intake survey, and a review request after a completed job. Message frequency may vary. Standard message and data rates may apply. Reply STOP to opt out. Reply HELP for help. We will not share mobile information with third parties for promotional or marketing purposes. Consent is not a condition of purchase.";

  var TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src"];
  var STORE_KEY = "biggify_tracking";
  var THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  var loadedAt = Date.now();

  // Tracking first: the ad, partner or channel tags from the address bar, kept 30 days in this browser so a second visit still counts.
  function tracking() {
    var fromUrl = {};
    try {
      var params = new URLSearchParams(window.location.search);
      TRACK_KEYS.forEach(function (k) {
        var v = (params.get(k) || "").trim().slice(0, 150);
        if (v) fromUrl[k] = v;
      });
    } catch (e) { /* old browser: no tags */ }
    var stored = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null");
      if (stored && (!stored.at || Date.now() - stored.at > THIRTY_DAYS)) stored = null;
    } catch (e) { stored = null; }
    if (Object.keys(fromUrl).length) {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify({ at: Date.now(), tags: fromUrl })); } catch (e) { /* private mode */ }
      return fromUrl;
    }
    return (stored && stored.tags) || {};
  }
  tracking(); // remember the tags as soon as the page loads

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  // Posts to Hubert. Adds submissionKey, elapsedMs, page and utm when missing. Never throws: { status, json }; status 0 = no connection.
  function send(body) {
    var payload = Object.assign({}, body);
    if (!payload.submissionKey) payload.submissionKey = uuid();
    if (payload.elapsedMs === undefined) payload.elapsedMs = Date.now() - loadedAt;
    if (!payload.page) payload.page = window.location.pathname;
    if (!payload.utm) payload.utm = tracking();
    return fetch(config.HUBERT_INTAKE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) { return { status: res.status, json: json, submissionKey: payload.submissionKey }; });
      })
      .catch(function () { return { status: 0, json: {}, submissionKey: payload.submissionKey }; });
  }

  // Plain-words message for a failed send.
  function failMessage(r) {
    if (r.status === 429) return "Too many tries. Please wait a few minutes, or call or text me at " + config.PHONE_DISPLAY + ".";
    if (r.json && r.json.error && r.status === 400) return r.json.error;
    return "That didn't go through on my side. Your result is still here. Call or text me at " + config.PHONE_DISPLAY + " and I'll sort it out.";
  }

  // Shows a field's error next to it (fields use <div class="field" data-name="phone">... <p class="error"></p></div>).
  function showFieldError(form, field, message) {
    var key = String(field || "").replace(/^answers\./, "");
    var box = form.querySelector('.field[data-name="' + key + '"]');
    if (!box) return false;
    box.setAttribute("data-error", "");
    var p = box.querySelector(".error");
    if (p) p.textContent = message;
    var input = box.querySelector("input,select,textarea");
    if (input) input.focus();
    return true;
  }
  function clearErrors(form) {
    Array.prototype.forEach.call(form.querySelectorAll(".field[data-error]"), function (f) { f.removeAttribute("data-error"); });
  }

  // Fills every element with data-consent-text with the consent words, so pages never drift from them.
  function fillConsent() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-consent-text]"), function (el) { el.textContent = CONSENT_TEXT; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-phone-link]"), function (a) { a.textContent = config.PHONE_DISPLAY; a.href = "tel:" + config.PHONE_TEL; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillConsent);
  else fillConsent();

  window.Biggify = { config: config, CONSENT_TEXT: CONSENT_TEXT, tracking: tracking, send: send, uuid: uuid, failMessage: failMessage, showFieldError: showFieldError, clearErrors: clearErrors };
})();
