/* Video pages config (owner 2026-11-16). ONE place for every YouTube ID on gobiggify.com/videos.
   youtube: script slug (biggify-studio/scripts/<slug>.json) -> { id, uploaded, title }.
     - id: the 11-character YouTube ID (the part after watch?v=). Empty = no player on the page (nothing broken shows).
     - uploaded: YYYY-MM-DD the video went up on YouTube (Google wants it for the video in search results).
     - title: the video title, used as the video name in the page schema.
   draft: page slug -> why. A draft page is noindex and left out of the /videos hub, the sitemap and related links.
   After an edit run "npm run videos" in dashboard/ (the build runs it too), then commit the changed pages.
   The part after "=" must stay plain JSON (double quotes, no trailing commas, no comments inside the braces). */
window.BIGGIFY_VIDEO_PAGES = {
  "youtube": {
    "agency-trust-long": { "id": "", "uploaded": "", "title": "How I Make Sure a Marketing Agency Is Trustworthy" },
    "agency-trust-short-first-question": { "id": "", "uploaded": "", "title": "The First Question I'd Ask Any Marketing Agency" },
    "agency-trust-short-number-one": { "id": "", "uploaded": "", "title": "If a Marketing Guy Promises You #1 on Google, Here's What I'd Say" },
    "best-choice-long": { "id": "", "uploaded": "", "title": "How I Make a Small Contractor Look Like the Best Choice in Town (Without Lying)" },
    "best-choice-short-proof-button": { "id": "", "uploaded": "", "title": "Where I Put the Proof on Every Client's Website" },
    "best-choice-short-real-photos": { "id": "", "uploaded": "", "title": "Stock Photos Make You Look Like Everyone Else. Here's What I Use." },
    "best-choice-short-true-claims": { "id": "", "uploaded": "", "title": "I Never Take a True Claim Off a Client's Website. Here's Why." },
    "calls-100-long": { "id": "", "uploaded": "", "title": "I Called 100 Contractors. Here's How Many Didn't Answer (and Lost the Job)." },
    "calls-100-short-demo": { "id": "", "uploaded": "", "title": "What Happens When You Call One of My Trade Businesses and They're Busy" },
    "calls-100-short-result": { "id": "", "uploaded": "", "title": "I Called 100 Contractors. [X] Didn't Answer." },
    "calls-100-short-trial": { "id": "", "uploaded": "", "title": "Try My AI Receptionist Free for 30 Days" },
    "chatgpt-picks-me-long": { "id": "", "uploaded": "", "title": "Customers Are Asking ChatGPT Who to Hire. Here's How I Make Sure AI Picks Me." },
    "chatgpt-picks-me-short-in-common": { "id": "", "uploaded": "", "title": "Every Business ChatGPT Recommended Had This in Common" },
    "chatgpt-picks-me-short-one-audit": { "id": "", "uploaded": "", "title": "Why ChatGPT Recommends This Business, in 45 Seconds" },
    "chatgpt-picks-me-short-reveal": { "id": "", "uploaded": "", "title": "I Asked ChatGPT Who the Best Plumber in Town Is" },
    "estimates-ghosted-long": { "id": "", "uploaded": "", "title": "How I Turn More Estimates Into Booked Jobs" },
    "estimates-ghosted-short-close-out": { "id": "", "uploaded": "", "title": "The 5-Word Text That Brings Back Ghosted Estimates" },
    "estimates-ghosted-short-same-day": { "id": "", "uploaded": "", "title": "Why I Tell My Trade Businesses to Send Every Estimate the Same Day" },
    "estimates-ghosted-short-two-questions": { "id": "", "uploaded": "", "title": "The 2 Questions I Tell My Trade Businesses to Ask at Every Estimate" },
    "google-changes-long": { "id": "", "uploaded": "", "title": "How I Change My Clients' Google Profiles Without Getting Them Suspended" },
    "google-changes-short-pay-to-fix": { "id": "", "uploaded": "", "title": "Someone Wants Money to Fix Your Google Profile? Here's What I'd Do." },
    "google-changes-short-phone-swap": { "id": "", "uploaded": "", "title": "How I Change a Shop's Phone Number on Google Without Breaking Anything" },
    "google-changes-short-same-week": { "id": "", "uploaded": "", "title": "The Google Profile Changes I Never Make in the Same Week" },
    "google-likes-me-long": { "id": "", "uploaded": "", "title": "How I Make Google Like My Trade Businesses Over My Competitors" },
    "google-likes-me-short-3-rules": { "id": "", "uploaded": "", "title": "Google Tells You Exactly How It Ranks Businesses: Its 3 Rules" },
    "google-likes-me-short-fake-address": { "id": "", "uploaded": "", "title": "Why I Never Use a Fake Address on a Google Profile" },
    "google-likes-me-short-what-i-track": { "id": "", "uploaded": "", "title": "I Don't Care Where You Show on the Map. Here's What I Track Instead." },
    "invest-calls-short": { "id": "", "uploaded": "", "title": "\"I'd Like to Invest in Your Business.\" What I Do With These Calls." },
    "jobs-marketing-math-short": { "id": "", "uploaded": "", "title": "How Many Extra Jobs Does Marketing Need to Bring You? Here's My Math." },
    "one-job-five-long": { "id": "", "uploaded": "", "title": "How I Turn One Finished Job Into 5 Pieces of Marketing" },
    "one-job-five-short-3-photos": { "id": "", "uploaded": "", "title": "The 3 Photos I Ask For on Every Job" },
    "one-job-five-short-five-places": { "id": "", "uploaded": "", "title": "One Finished Job, Five Posts. Here's How." },
    "one-job-five-short-no-ai": { "id": "", "uploaded": "", "title": "Why I Never Use AI Pictures for My Trade Businesses" },
    "one-per-town-short": { "id": "", "uploaded": "", "title": "Why I Only Take One Plumber Per Town" },
    "personal-cell-short": { "id": "", "uploaded": "", "title": "Still Giving Customers Your Personal Cell? Here's Why Every Client of Mine Gets a Business Line." },
    "profiles-50-long": { "id": "", "uploaded": "", "title": "I Checked 50 Contractor Google Profiles. Most Were Missing the Same [3] Things." },
    "profiles-50-short-phone-stopped": { "id": "", "uploaded": "", "title": "The Phone Stopped Ringing? This Is What I Check First." },
    "profiles-50-short-top-miss": { "id": "", "uploaded": "", "title": "I Checked 50 Contractor Google Profiles. [DATA: X] Were Missing [MISS 1]." },
    "review-replies-short-setup": { "id": "", "uploaded": "", "title": "How My Review Replies Are Set Up So a Bad Review Never Gets Worse" },
    "reviews-most-long": { "id": "", "uploaded": "", "title": "How I Get My Trade Businesses the Most Reviews Possible" },
    "reviews-most-short-exact-text": { "id": "", "uploaded": "", "title": "The Exact Text I Send to Get Google Reviews" },
    "reviews-most-short-past-customers": { "id": "", "uploaded": "", "title": "How My Clients Get Dozens of Review Asks Out in Week One" },
    "reviews-most-short-qr-card": { "id": "", "uploaded": "", "title": "The Card I Hand Every Customer That Gets Reviews Before I Leave the Driveway" },
    "reviews-needed-long": { "id": "", "uploaded": "", "title": "How Many Google Reviews Do You Really Need? I Checked for My Clients." },
    "reviews-needed-short-164": { "id": "", "uploaded": "", "title": "164 Google Reviews and Still Invisible. Here's What I Found." },
    "reviews-needed-short-30": { "id": "", "uploaded": "", "title": "How Many Google Reviews Do You Need? Here's My Number." },
    "reviews-needed-short-big-shop": { "id": "", "uploaded": "", "title": "The Big Shop Has 2,000 Reviews. Here's the Fight I Pick Instead." },
    "rst-16k-long": { "id": "", "uploaded": "", "title": "How a Contractor I Work With Got $16,000 in New Jobs in 3 Months" },
    "rst-16k-short-first-change": { "id": "", "uploaded": "", "title": "His Google Calls Tripled. Here's the First Thing I Changed." },
    "rst-16k-short-promise": { "id": "", "uploaded": "", "title": "The Promise I Make to Every Trade Owner" },
    "rst-16k-short-result": { "id": "", "uploaded": "", "title": "$16,000 in New Jobs in 3 Months. He Didn't Lift a Finger." },
    "second-listing-short": { "id": "", "uploaded": "", "title": "A Client's Reviews Were on a Second Google Listing. He Had No Idea." },
    "seo-calls-short": { "id": "", "uploaded": "", "title": "\"We Can Get You to Page One of Google.\" Here's What I Think of These Calls." },
    "three-numbers-short": { "id": "", "uploaded": "", "title": "The 3 Numbers I Track to Know If Marketing Works" },
    "website-or-google-short": { "id": "", "uploaded": "", "title": "Do I Need a Website If I Have a Google Profile? Here's What I Think." },
    "website-ownership-short": { "id": "", "uploaded": "", "title": "How I Check Who Really Owns a Business's Website" },
    "websites-50-long": { "id": "", "uploaded": "", "title": "I Checked 50 Contractor Websites on My Phone. Most Failed the Same [3] Tests." },
    "websites-50-short-call-button": { "id": "", "uploaded": "", "title": "[DATA: X] of 50 Contractor Websites Had No Button to Call" },
    "websites-50-short-form-test": { "id": "", "uploaded": "", "title": "Two of My Clients' Website Forms Were Broken. Here's the 1-Minute Test That Catches It." },
    "word-of-mouth-long": { "id": "", "uploaded": "", "title": "Most Contractors Tell Me \"I Get All My Work From Word of Mouth.\" Here's What I Show Them." },
    "word-of-mouth-short-10-seconds": { "id": "", "uploaded": "", "title": "What Happens 10 Seconds After Someone Recommends You" },
    "word-of-mouth-short-name-test": { "id": "", "uploaded": "", "title": "Look Up Your Own Business Name. Here's What I Look For." },
    "word-of-mouth-short-reviews-strangers": { "id": "", "uploaded": "", "title": "A Review Is Word of Mouth That Strangers Can Read" },
    "xray-live-long": { "id": "", "uploaded": "", "title": "I X-Rayed [PROSPECT NAME]'s Google Profile Live. Here's Why His Phone Is Quiet." }
  },
  "draft": {
    "rst-16k": "Waiting on the source for $16,000 and calls tripled, and which 3 months (rst-16k-long notes: SOURCE NEEDED before filming)."
  }
};
