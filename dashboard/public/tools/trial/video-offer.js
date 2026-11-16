/* The video offer on the free trial page (owner 2026-11-16). A viewer who came through a video link (gobiggify.com/100-calls goes to
   /tools/trial?src=yt-100-calls&...) sees that video's offer instead of the prices, on this visit and on later ones for 30 days
   (config.js keeps the tags in this browser). The same tags go with the form to Hubert, which stores them on the trial and flags the
   offer. Needs /tools/config.js and /tools/videos.js first; loaded in the <head> so the right version shows from the start:
   it marks <html data-video="<slug>"> straight away (CSS swaps [data-default-only] / [data-video-only]) and fills the words once the
   page is read. An unknown or missing tag changes nothing. */
(function () {
  "use strict";
  var videos = window.BIGGIFY_VIDEOS || {};
  var tags = window.Biggify && window.Biggify.tracking ? window.Biggify.tracking() : {};
  var m = /^yt-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(String(tags.src || ""));
  if (!m || !Object.prototype.hasOwnProperty.call(videos, m[1])) return;
  var slug = m[1];
  var video = videos[slug];
  document.documentElement.setAttribute("data-video", slug);

  function fill() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-video-title]"), function (el) { el.textContent = video.title; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-video-offer]"), function (el) { el.textContent = video.offerText; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill);
  else fill();
})();
