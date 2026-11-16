/* Visit counting for the free guides and tools (owner 2026-11-16: "how many lifetime and how many in last 30 days for each thing").
   Every guide and tool page loads this with <script defer src="/tools/beacon.js"></script>. Once per page open it sends Hubert
   (the agency dashboard) which page this is, the host name of the site that sent the visitor (e.g. l.facebook.com, never the full
   address), the utm_source / utm_campaign / utm_content tags from the address bar, and a random id this browser makes up so a reload
   within 30 minutes counts once. Nothing typed, no cookies, no IP kept. Counts show on Hubert's "Free stuff" tab.
   The owner's own visits: open any page once with ?nocount=1 and this browser is never counted again (?nocount=0 undoes it). */
(function () {
  "use strict";
  var ENDPOINT = "https://biggify-dashboard.netlify.app/api/public/free-stuff-view";
  var host = window.location.hostname;
  if (host !== "gobiggify.com" && host !== "www.gobiggify.com") return; // previews and local copies are not counted
  if (navigator.webdriver) return;

  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  var get = function (k) { return params ? (params.get(k) || "").trim().slice(0, 100) : ""; };

  try {
    var nc = get("nocount");
    if (nc === "1") window.localStorage.setItem("biggify_nocount", "1");
    if (nc === "0") window.localStorage.removeItem("biggify_nocount");
    if (window.localStorage.getItem("biggify_nocount") === "1") return;
  } catch (e) { /* private mode: count it */ }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  var visitor = null;
  try {
    visitor = window.localStorage.getItem("biggify_vid");
    if (!/^[0-9a-f-]{36}$/.test(visitor || "")) {
      visitor = uuid();
      window.localStorage.setItem("biggify_vid", visitor);
    }
  } catch (e) { visitor = uuid(); }

  var referrer = "";
  try { referrer = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) { referrer = ""; }

  var body = { path: window.location.pathname.slice(0, 200), visitor: visitor };
  if (referrer) body.referrer = referrer;
  ["utm_source", "utm_campaign", "utm_content"].forEach(function (k) {
    var v = get(k);
    if (v) body[k] = v;
  });
  var json = JSON.stringify(body);

  // A plain-text beacon: no preflight, survives the visitor leaving the page, and the page never waits for it.
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, json)) return;
  } catch (e) { /* fall through */ }
  try {
    window.fetch(ENDPOINT, { method: "POST", body: json, keepalive: true, mode: "no-cors", credentials: "omit" });
  } catch (e) { /* counting never breaks the page */ }
})();
