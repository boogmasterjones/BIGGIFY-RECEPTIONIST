// Biggify video pages: the player loads only when someone taps it (no YouTube cookies or weight before that), and "Copy text"
// buttons on the copy-paste texts. guide.js does the rest (progress bar, checklists, share buttons). No dependencies.
(function () {
  "use strict";
  [].slice.call(document.querySelectorAll(".v-play[data-yt]")).forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-yt");
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      f.title = b.getAttribute("aria-label") || "Video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.allowFullscreen = true;
      b.parentNode.replaceChild(f, b);
    });
  });

  [].slice.call(document.querySelectorAll(".v-copy[data-copy]")).forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy"), label = b.querySelector("span"), old = label ? label.textContent : "";
      var done = function () {
        b.classList.add("is-copied");
        if (label) label.textContent = "Copied";
        setTimeout(function () { b.classList.remove("is-copied"); if (label) label.textContent = old; }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
    });
  });
})();
