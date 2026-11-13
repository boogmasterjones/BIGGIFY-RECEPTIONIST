/* Review Booster Kit (magnet #7, review_kit). Everything is built here in the browser (the card, the QR code, the 20 texts), so the kit
   works even if Hubert can't be reached. The form is also sent to Hubert so Wyatt gets the lead.
   Wording follows docs/lead-magnets/REVIEW_ASK_GUIDE.md and Google's rules: ask everyone, ask for an HONEST review, never offer anything,
   never say "5 stars". The link check matches Hubert's lib/lead-magnets/review-kit.ts checkReviewLink (only Google links, ever). */
(function () {
  "use strict";
  var B = window.Biggify;
  var $ = function (id) { return document.getElementById(id); };

  // --- The review link ------------------------------------------------------------------------------------------------------------
  var PLACE_ID = /^(ChIJ|GhIJ|EiI|Ei[A-Za-z0-9])[A-Za-z0-9_-]{10,}$/;
  var writeReview = function (placeId) { return "https://search.google.com/local/writereview?placeid=" + placeId; };

  function checkLink(raw) {
    var value = String(raw || "").trim();
    if (!value) return { ok: false, reason: "Paste your Google review link." };
    if (PLACE_ID.test(value)) return { ok: true, url: writeReview(value), kind: "review" };
    var u;
    try { u = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value); } catch (e) { return { ok: false, reason: "That doesn't look like a link. Copy it from your Google profile." }; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "That doesn't look like a link." };
    u.protocol = "https:";
    var host = u.hostname.toLowerCase();
    var isGoogle = /(^|\.)google\.[a-z.]{2,6}$/.test(host) || host === "g.page" || host === "goo.gl" || host === "maps.app.goo.gl" || host === "g.co";
    if (!isGoogle) return { ok: false, reason: "That isn't a Google link. Use the one from your Google profile." };
    if (u.username || u.password) return { ok: false, reason: "That doesn't look like a Google review link." };
    var text = decodeURIComponent(u.toString());
    // A Maps link that carries the Place ID ("place_id:ChIJ..."): build the direct review link, no paid API needed.
    var pid = text.match(/place_?id[:=]((?:ChIJ|GhIJ|EiI)[A-Za-z0-9_-]{10,})/i);
    if (pid) return { ok: true, url: writeReview(pid[1]), kind: "review" };
    var review = (host === "g.page" && /\/review\/?$/i.test(u.pathname)) || /writereview/i.test(u.pathname) || u.searchParams.has("placeid");
    if (review) return { ok: true, url: u.toString(), kind: "review" };
    if (/(^|\.)google\./.test(host) && u.pathname === "/search") return { ok: false, reason: "That's a Google search page. Use the link from \"Ask for reviews\" on your profile." };
    // A long Maps address holds the listing's number (the hex after "0x...:0x"). Turn it into a short, stable profile link.
    var cid = text.match(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/i);
    if (cid && typeof BigInt === "function") {
      try { return { ok: true, url: "https://maps.google.com/?cid=" + BigInt("0x" + cid[1]).toString(10), kind: "profile" }; } catch (e) { /* fall through */ }
    }
    if (u.toString().length > 600) return { ok: false, reason: "That link is too long. Use the short one from \"Ask for reviews\" or Share." };
    return { ok: true, url: u.toString(), kind: "profile" };
  }

  // --- The 20 texts ---------------------------------------------------------------------------------------------------------------
  var JOBS = { plumbing: "plumbing work", electrical: "electrical work", hvac: "AC service", roofing: "roof work", water_heater: "water heater work", tile_flooring: "tile and flooring work", remodeling: "project", painting: "painting job", pool: "pool service", cleaning: "cleaning", pressure_washing: "pressure washing", window_cleaning: "window cleaning", landscaping: "yard work", pest_control: "pest control service", garage_door: "garage door work", handyman: "repair work", auto: "car repair", other: "work" };

  function texts(biz, link, trade) {
    var job = JOBS[trade] || JOBS.other;
    return [
      ["The ask, same day", "Hi [Name], it's [Your name] from " + biz + ". Thanks again for having us out today! If you have a minute, a Google review would mean a lot to a small business like ours: " + link + " Thank you!"],
      ["One reminder, 3 days later", "Hi [Name], just a quick nudge in case the link got buried: " + link + " No worries if you're busy. Thanks again for choosing " + biz + "!"],
      ["Short and simple", "Hi [Name], [Your name] from " + biz + " here. Would you leave us a quick, honest Google review? " + link + " Thanks!"],
      ["Right after you finish", "Hi [Name], all done! Thanks for trusting " + biz + " with your " + job + ". If you have a minute, an honest Google review helps us a lot: " + link],
      ["Past customer (last month)", "Hi [Name], it's [Your name] from " + biz + ". We did your " + job + " last month. I hope it's all working well. Would you mind leaving us an honest Google review? " + link],
      ["Past customer (a while ago)", "Hi [Name], [Your name] from " + biz + " here. It's been a while since we did your " + job + ". If you have a minute, I'd be grateful for an honest Google review: " + link + " Thanks either way!"],
      ["Repeat customer", "Hi [Name], thanks for calling " + biz + " again! It means a lot. If you've never left us a Google review, here's the link: " + link],
      ["After a big project", "Hi [Name], it was great working on your " + job + " with you. Thanks for your patience along the way! If you have a few minutes, an honest Google review would really help " + biz + ": " + link],
      ["After a quick fix", "Hi [Name], glad we could get that sorted today. If you have 30 seconds, a quick Google review helps a small business like " + biz + ": " + link],
      ["Sent by your tech or helper", "Hi [Name], this is [Tech name] from " + biz + ". Thanks for having me out today! If you have a minute, a Google review helps our team a lot: " + link],
      ["After they pay", "Hi [Name], thanks for your payment, and for choosing " + biz + ". If you have a minute, an honest Google review would mean a lot: " + link],
      ["With the iPhone tip", "Hi [Name], [Your name] from " + biz + ". Would you leave us a quick Google review? " + link + " If the link won't open, search \"" + biz + "\" in Google Maps and tap Write a review. Thank you!"],
      ["They said \"I'll do it later\"", "Hi [Name], here's that review link I mentioned, so it's easy to find later: " + link + " Thanks so much! [Your name], " + biz],
      ["They texted you a thank-you", "Thank you, [Name]! That means a lot. If you'd be willing to share that on Google, here's the link: " + link + " No pressure at all."],
      ["Referred by a friend", "Hi [Name], thanks for giving " + biz + " a try, and please thank [Friend] for sending you our way! If you have a minute, an honest Google review helps others find us too: " + link],
      ["After a follow-up visit", "Hi [Name], thanks for letting us come back and check on things. If you have a minute, a Google review about how we handled it would help " + biz + ": " + link],
      ["Seasonal thank-you", "Hi [Name], [Your name] from " + biz + " here. Thanks for being a customer this year! If you have a minute, an honest Google review helps neighbors find us: " + link],
      ["In Spanish", "Hola [Nombre], soy [Su nombre] de " + biz + ". ¡Gracias por elegirnos! Si tiene un minuto, una reseña honesta en Google nos ayuda mucho: " + link + " ¡Gracias!"],
      ["Last note (then stop)", "Hi [Name], last note from me, I promise. If you'd like to share how the " + job + " went, here's the link: " + link + " Thanks either way! [Your name], " + biz],
      ["Thank them for their review", "Thank you so much for the review, [Name]! It really helps a small business like ours. We're here any time you need us. [Your name], " + biz],
    ];
  }

  // --- The card --------------------------------------------------------------------------------------------------------------------
  function qrSvg(url) {
    return new Promise(function (resolve) {
      if (!window.BiggifyQR) return resolve(null);
      window.BiggifyQR.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" }, function (err, svg) { resolve(err ? null : svg); });
    });
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function cardHtml(biz, svg) {
    return (
      '<div><div class="biz">' + escapeHtml(biz) + '</div><div class="head">How did we do?</div>' +
      '<div class="line">An honest Google review really helps us. Point your phone camera at the code. It takes about a minute.</div></div>' +
      '<div class="qr">' + (svg || "") + '</div><div class="foot">Thank you for choosing a local business.</div>'
    );
  }

  function fitCard() {
    var box = $("card-scale");
    var w = box.parentElement.clientWidth;
    var scale = Math.min(1.4, w / 336);
    box.style.transform = "scale(" + scale + ")";
    box.parentElement.style.height = 192 * scale + "px";
  }

  // The phone image: drawn on a canvas, so it saves as a normal picture (1080 x 1350).
  function saveImage(biz, svg) {
    var c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    var g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = "#cf0000"; g.fillRect(0, 0, 1080, 18);
    g.fillStyle = "#0d1224"; g.textAlign = "center";
    var size = 64;
    g.font = "800 " + size + "px -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    while (g.measureText(biz).width > 960 && size > 30) { size -= 2; g.font = "800 " + size + "px -apple-system, Segoe UI, Roboto, Arial, sans-serif"; }
    g.fillText(biz, 540, 150);
    g.font = "800 92px -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    g.fillText("How did we do?", 540, 280);
    g.font = "500 38px -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    g.fillStyle = "#333";
    g.fillText("An honest Google review really helps us.", 540, 1150);
    g.fillText("Point your phone camera at the code.", 540, 1205);
    g.font = "500 30px -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    g.fillStyle = "#666";
    g.fillText("Thank you for choosing a local business.", 540, 1290);
    var img = new Image();
    img.onload = function () {
      g.drawImage(img, 240, 350, 600, 600);
      c.toBlob(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = biz.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + "-review-card.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      }, "image/png");
    };
    var sized = svg.replace("<svg ", '<svg width="600" height="600" ');
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized);
  }

  // --- The form --------------------------------------------------------------------------------------------------------------------
  var form = $("kit-form");
  var submissionKey = null;
  var kit = null;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    B.clearErrors(form);
    $("kit-error").removeAttribute("data-show");
    var biz = $("business").value.replace(/\s+/g, " ").trim();
    if (!biz) return B.showFieldError(form, "business", "Enter your business name.");
    var link = checkLink($("reviewLink").value);
    if (!link.ok) return B.showFieldError(form, "reviewLink", link.reason);
    var email = $("email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return B.showFieldError(form, "email", "Enter your email.");
    var phone = $("phone").value.trim();
    if (phone && phone.replace(/\D/g, "").replace(/^1/, "").length !== 10) return B.showFieldError(form, "phone", "Enter a 10-digit phone number.");
    if ($("smsConsent").checked && !phone) return B.showFieldError(form, "phone", "Enter your phone number, or untick the texting box.");

    var btn = $("kit-btn");
    btn.disabled = true;
    btn.textContent = "Making your kit...";
    var trade = $("trade").value || "other";
    var sending = B.send({ magnet: "review_kit", email: email, business: biz, phone: phone, trade: trade, smsConsent: $("smsConsent").checked, website: $("website").value, answers: { reviewLink: link.url } });
    qrSvg(link.url).then(function (svg) {
      kit = { biz: biz, link: link, svg: svg, texts: texts(biz, link.url, trade) };
      sending.then(function (res) {
        btn.disabled = false;
        btn.textContent = "Make my review card";
        if (res.status === 400 && res.json && res.json.field && B.showFieldError(form, res.json.field, res.json.error)) return;
        if (res.status === 422 && res.json && res.json.field) return B.showFieldError(form, res.json.field, res.json.error);
        submissionKey = res.status === 200 ? res.submissionKey : null;
        showKit(res.status === 200 ? null : B.failMessage(res));
      });
    });
  });

  function showKit(problem) {
    $("t-biz").textContent = kit.biz;
    $("t-link").textContent = kit.link.url;
    $("t-link-kind").textContent = kit.link.kind === "profile" ? "This link opens your Google profile. People tap \"Write a review\" there. For a direct link, use \"Ask for reviews\" on your profile and make the kit again." : "";
    $("t-note").textContent = problem || "";
    $("card-preview").innerHTML = cardHtml(kit.biz, kit.svg);
    if (!kit.svg) $("t-note").textContent = "The QR code couldn't be drawn in this browser. Try another browser, or call me at " + B.config.PHONE_DISPLAY + ".";

    var list = $("texts");
    list.innerHTML = "";
    kit.texts.forEach(function (t, i) {
      var box = document.createElement("div");
      box.className = "msg";
      box.innerHTML = '<div class="meta"><b></b><span></span></div><pre></pre><button type="button" class="btn btn-outline btn-small copy">Copy text</button>';
      box.querySelector("b").textContent = t[0];
      box.querySelector("span").textContent = (i + 1) + " of " + kit.texts.length;
      box.querySelector("pre").textContent = t[1];
      box.querySelector("button").addEventListener("click", function () { copy(t[1], this); });
      list.appendChild(box);
    });

    // The print sheet: 10 cards on a letter page.
    var cards = "";
    for (var i = 0; i < 10; i += 1) cards += '<div class="rcard">' + cardHtml(kit.biz, kit.svg) + "</div>";
    $("print-sheet").innerHTML = '<div class="page"><div class="cards">' + cards + "</div></div>";

    $("tool").hidden = true;
    var t = $("thanks");
    t.hidden = false;
    fitCard();
    t.focus();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
  }

  function copy(text, button) {
    var done = function () { var old = button.textContent; button.textContent = "Copied!"; setTimeout(function () { button.textContent = old; }, 1600); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { button.textContent = "Press and hold the text to copy"; }
      ta.remove();
    }
  }

  window.addEventListener("resize", function () { if (!$("thanks").hidden) fitCard(); });
  $("print-btn").addEventListener("click", function () { window.print(); });
  $("img-btn").addEventListener("click", function () { if (kit && kit.svg) saveImage(kit.biz, kit.svg); });

  $("dfy-btn").addEventListener("click", function () {
    var btn = this, err = $("dfy-error");
    err.removeAttribute("data-show");
    if (!submissionKey) {
      err.textContent = "I couldn't save that on my side. Call or text me at " + B.config.PHONE_DISPLAY + ".";
      err.setAttribute("data-show", "");
      return;
    }
    btn.disabled = true;
    B.send({ action: "interest", magnet: "review_kit", submissionKey: submissionKey, interest: "done_for_you_reviews" }).then(function (res) {
      if (res.status === 200) { btn.hidden = true; $("dfy-done").setAttribute("data-show", ""); }
      else { btn.disabled = false; err.textContent = B.failMessage(res); err.setAttribute("data-show", ""); }
    });
  });

  // Test hooks (no effect on the page).
  window.BiggifyReviewKit = { checkLink: checkLink, texts: texts };
})();
