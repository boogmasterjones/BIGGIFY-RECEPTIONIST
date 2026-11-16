/* Video links: one short address per YouTube video, e.g. gobiggify.com/100-calls (owner 2026-11-16).
   Each one sends the viewer to the free trial page (/tools/trial) tagged src=yt-<slug>, so Hubert knows which video they came from
   and flags their offer. The trial page swaps in the video's offer while that tag is on this browser (30 days, see config.js).

   To add a video: add one line below, then add the same slug to VIDEO_LINKS in Hubert (lib/lead-magnets/videos.ts) so the owner
   sees the offer on the trial. next.config.ts reads this file for the short addresses, so the part after "=" must stay plain JSON
   (double quotes, no trailing commas, no comments inside the braces). Never put a price here: the page shows offerText only. */
window.BIGGIFY_VIDEOS = {
  "100-calls": { "title": "I called 100 contractors", "offer": "50_off_after_trial", "offerText": "50% off after your free month" }
};
