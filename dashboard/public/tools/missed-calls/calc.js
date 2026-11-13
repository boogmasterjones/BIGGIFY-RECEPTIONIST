/* Missed Call Money Leak calculator (magnet #1, missed_call_calc).
   The same sum as Hubert's lib/lead-magnets/missed-call.ts and the guide's pen-and-paper version:
   missed a week x (booked out of 10 / 10) x average job = a week; x 52 = a year; a month = a year / 12.
   Keep the two in step: Hubert's tests pin 8 missed, 5 of 10, $400 = $1,600 a week, $83,200 a year, $6,933 a month. */
(function () {
  "use strict";
  var B = window.Biggify;
  var $ = function (id) { return document.getElementById(id); };
  var WEEKS_PER_YEAR = 52, WEEKS_PER_MONTH = 52 / 12;

  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var num = function (n) { return n.toLocaleString("en-US", { maximumFractionDigits: 1 }); };
  var round = function (n, p) { var f = Math.pow(10, p); return Math.round(n * f) / f; };

  function leak(missed, booked, avgJob) {
    missed = Math.max(missed, 0);
    booked = Math.min(Math.max(booked, 0), 10);
    avgJob = Math.max(avgJob, 0);
    var jobsWeek = missed * (booked / 10);
    var week = jobsWeek * avgJob;
    var r = {
      lostJobsPerWeek: round(jobsWeek, 2),
      lostJobsPerMonth: round(jobsWeek * WEEKS_PER_MONTH, 1),
      lostPerWeek: Math.round(week),
      lostPerMonth: Math.round(week * WEEKS_PER_MONTH),
      lostPerYear: Math.round(week * WEEKS_PER_YEAR),
      breakEven: avgJob > 0 ? Math.ceil(B.config.RECEPTIONIST_MONTHLY / avgJob) : null,
    };
    r.working = [
      num(missed) + " missed calls a week x " + num(booked) + " out of 10 who'd book = " + num(r.lostJobsPerWeek) + " jobs a week",
      num(r.lostJobsPerWeek) + " jobs x " + money(avgJob) + " average job = " + money(r.lostPerWeek) + " a week",
      money(r.lostPerWeek) + " x 52 weeks = " + money(r.lostPerYear) + " a year (" + money(r.lostPerMonth) + " a month)",
    ];
    return r;
  }

  var fields = { missedPerWeek: [0, 1000], bookedOutOf10: [0, 10], avgJob: [1, 1000000] };
  function read() {
    var out = {}, ok = true;
    Object.keys(fields).forEach(function (k) {
      var raw = $(k).value.trim().replace(/[$,]/g, "");
      var v = raw === "" ? NaN : Number(raw);
      var box = $(k).closest(".field");
      var bad = raw !== "" && (!isFinite(v) || v < fields[k][0] || v > fields[k][1]);
      if (bad) box.setAttribute("data-error", ""); else box.removeAttribute("data-error");
      if (!isFinite(v) || bad) ok = false;
      out[k] = v;
    });
    return ok ? out : null;
  }

  var last = null;
  function fillWorking(list, lines) {
    list.innerHTML = "";
    lines.forEach(function (l) { var li = document.createElement("li"); li.textContent = l; list.appendChild(li); });
  }
  function render() {
    var v = read();
    if (!v) { last = null; return; }
    var r = leak(v.missedPerWeek, v.bookedOutOf10, v.avgJob);
    last = { inputs: v, result: r };
    $("perYear").textContent = money(r.lostPerYear) + " a year";
    $("perMonth").textContent = money(r.lostPerMonth);
    $("perWeek").textContent = money(r.lostPerWeek);
    $("jobsMonth").textContent = num(r.lostJobsPerMonth);
    fillWorking($("working"), r.working);
  }
  ["missedPerWeek", "bookedOutOf10", "avgJob"].forEach(function (k) { $(k).addEventListener("input", render); });
  $("calc").addEventListener("submit", function (e) { e.preventDefault(); });

  // --- Save my result ---
  var submissionKey = null;
  var saveForm = $("save");
  saveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    B.clearErrors(saveForm);
    $("save-error").removeAttribute("data-show");
    render();
    if (!last) {
      ["missedPerWeek", "bookedOutOf10", "avgJob"].forEach(function (k) { if ($(k).value.trim() === "") $(k).closest(".field").setAttribute("data-error", ""); });
      $("missedPerWeek").focus();
      return;
    }
    var email = $("email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { B.showFieldError(saveForm, "email", "Enter your email."); return; }
    var phone = $("phone").value.trim();
    if (phone && phone.replace(/\D/g, "").replace(/^1/, "").length !== 10) { B.showFieldError(saveForm, "phone", "Enter a 10-digit phone number."); return; }
    if ($("smsConsent").checked && !phone) { B.showFieldError(saveForm, "phone", "Enter your phone number, or untick the texting box."); return; }

    var btn = $("save-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";
    B.send({
      magnet: "missed_call_calc",
      email: email,
      name: $("name").value.trim(),
      business: $("business").value.trim(),
      phone: phone,
      smsConsent: $("smsConsent").checked,
      website: $("website").value,
      answers: last.inputs,
    }).then(function (res) {
      btn.disabled = false;
      btn.textContent = "Save my result";
      if (res.status === 400 && res.json && res.json.field && B.showFieldError(saveForm, res.json.field, res.json.error)) return;
      submissionKey = res.status === 200 ? res.submissionKey : null;
      showThanks(res.status === 200 ? null : B.failMessage(res));
    });
  });

  function showThanks(problem) {
    var r = last.result;
    $("t-perYear").textContent = money(r.lostPerYear) + " a year";
    $("t-perMonth").textContent = money(r.lostPerMonth);
    $("t-perWeek").textContent = money(r.lostPerWeek);
    fillWorking($("t-working"), r.working);
    if (r.breakEven) {
      var be = $("t-breakeven");
      be.hidden = false;
      be.textContent = "After the trial it's $" + B.config.RECEPTIONIST_MONTHLY + " a month. At your average job, " + (r.breakEven === 1 ? "1 saved job a month" : r.breakEven + " saved jobs a month") + " pays for it.";
    }
    if (problem) $("t-saved-note").textContent = problem;
    $("tool").hidden = true;
    var t = $("thanks");
    t.hidden = false;
    t.focus();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
  }

  $("trial-btn").addEventListener("click", function () {
    var btn = this;
    var err = $("trial-error");
    err.removeAttribute("data-show");
    if (!submissionKey) {
      err.textContent = "I couldn't save that on my side. Call or text me at " + B.config.PHONE_DISPLAY + " and I'll set up your trial.";
      err.setAttribute("data-show", "");
      return;
    }
    btn.disabled = true;
    B.send({ action: "interest", magnet: "missed_call_calc", submissionKey: submissionKey, interest: "receptionist_trial" }).then(function (res) {
      if (res.status === 200) {
        btn.hidden = true;
        $("trial-done").setAttribute("data-show", "");
      } else {
        btn.disabled = false;
        err.textContent = B.failMessage(res);
        err.setAttribute("data-show", "");
      }
    });
  });

  // Test hook (no effect on the page): lets a check confirm this sum matches Hubert's.
  window.BiggifyMissedCallLeak = leak;
})();
