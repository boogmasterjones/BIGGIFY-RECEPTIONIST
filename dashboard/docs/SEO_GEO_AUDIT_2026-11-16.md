# SEO + GEO audit: free guides and tools (2026-11-16)

Owner (Wyatt, 2026-11-16): "make sure that all free guides and tools have 100% optimized SEO and GEO, but make sure that
optimizing those doesn't sacrifice the quality of the content."

Branch `feat/seo-geo` (receptionist repo, off origin/main + `feat/video-trial-link`). Local commits only, nothing pushed.
The rules below are enforced by `tests/seo-geo.test.ts`, so a new or edited page that breaks one fails the tests.

## What was wrong across the whole site (before)

| Check | Before | After |
|---|---|---|
| Canonical host | `https://gobiggify.com/...`, but gobiggify.com 308-redirects to www, so every canonical pointed at a redirect | `https://www.gobiggify.com/...` on every page, og:url, JSON-LD and the home page |
| robots.txt | none: `/robots.txt` redirected to `/login` | 200, allows everyone, names Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-SearchBot, Google-Extended, Applebot and others; blocks only /api/, /editor, /login, /auth |
| sitemap.xml | none: redirected to `/login` | 200, 36 URLs (home, how-it-works, privacy, terms + all 32 guide/tool pages), built from the folders, so new pages join automatically |
| llms.txt | none | `/llms.txt`, one line per guide and tool, built from each page's own title and description |
| Titles <= 60 chars | 3 of 32 | 32 of 32 |
| Descriptions <= 155 chars | 9 of 32 | 32 of 32 |
| One H1 | 31 of 32 (trial had two) | 32 of 32 |
| Canonical present | 29 of 32 | 32 of 32 |
| og tags | 18 of 32 | 32 of 32 (+ og:site_name, og:image:alt) |
| Twitter card | 0 of 32 | 32 of 32 |
| JSON-LD | 18 of 32; author/publisher as loose objects; quote-follow-up had FAQ schema with no visible FAQ | 32 of 32: one graph per page with Organization (Biggify LLC, Port Charlotte FL), Person (Wyatt Brunderman, Founder), WebSite, the page node, BreadcrumbList |
| FAQ schema matches the visible questions word for word | not enforced; several reworded, one with no visible FAQ | 20 of 20 pages with a visible FAQ; regenerated from the page, test-enforced |
| Byline | "By Wyatt, Biggify" | "By Wyatt, founder of Biggify, Port Charlotte FL" (guides) and "Wyatt, founder of Biggify / Port Charlotte, FL." in the sign-off |
| Primary-source links (Google help, FTC, ICANN, vendor pricing) | 3 pages | 16+ pages (vendor pricing links on crm-for-trades not counted), every URL fetched and checked against the claim |
| Tools hub links the playbooks | no (4 playbooks only reachable from /guides) | new "Free playbooks" family on /tools |
| Thank-you and print pages | noindex | still noindex (test-enforced), never in the sitemap |
| Site-editor "new guide" template | old host, old schema, no twitter, long titles | same conventions as the hand-built guides (title/description clipped at a word, shared entity nodes) |

Image alt: no problems found (every img has alt or is decorative). Mobile: no horizontal scroll at 375 px on the
10 pages spot-checked; one visible H1 each. Lighthouse was not available in this environment; the changes are head tags,
JSON-LD and text, so layout shift is unchanged (the new tool-page sections are plain text blocks below the form).

## Per-page scorecard (before → after)

Columns: title chars, meta description chars (raw HTML, so `&quot;` counts 6; how-much-on-the-phone is 150 decoded),
H1 count, canonical, og / twitter, schema page types (besides Org/Person/WebSite/Breadcrumb), question-style H2s,
primary-source domains linked (Google/FTC/ICANN pattern only, undercounts vendor links), links in from other
guide/tool pages (hubs include nav), words.

| Page | Title | Desc | H1 | Canonical | og / tw | Schema | Q-H2 | Cites | In-links | Words |
|---|---|---|---|---|---|---|---|---|---|---|
| /guides | 66 → 57 | 191 → 149 | 1 → 1 | apex → www | no / no → yes / yes | none → CollectionPage | 1 → 1 | 0 → 0 | 98 → 99 | 830 → 835 |
| /guides/ai-receptionist | 78 → 53 | 210 → 144 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 3 | 0 → 0 | 2 → 10 | 1274 → 1407 |
| /guides/crm-for-trades | 78 → 60 | 338 → 146 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 2 | 0 → 0 | 5 → 5 | 3338 → 3416 |
| /guides/fake-review-attack | 76 → 57 | 259 → 155 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+HowTo+FAQPage | 0 → 1 | 1 → 6 | 6 → 7 | 3403 → 3482 |
| /guides/google-profile-changes | 81 → 60 | 202 → 142 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 1 | 0 → 3 | 19 → 20 | 2375 → 2479 |
| /guides/home-warranty-jobs | 79 → 58 | 268 → 142 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 1 | 0 → 0 | 4 → 4 | 3046 → 3163 |
| /guides/how-much-on-the-phone | 84 → 53 | 307 → 160 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+HowTo+FAQPage | 0 → 0 | 0 → 0 | 5 → 5 | 3459 → 3518 |
| /guides/lsa-missed-calls | 89 → 56 | 218 → 152 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 1 | 0 → 6 | 2 → 3 | 3024 → 3097 |
| /guides/marketing-is-simple | 71 → 60 | 275 → 138 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 0 | 0 → 4 | 1 → 3 | 3860 → 3911 |
| /guides/missed-calls-competitors | 60 → 60 | 220 → 153 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 2 | 0 → 0 | 7 → 11 | 3065 → 3148 |
| /guides/questions-before-you-sign | 80 → 55 | 214 → 139 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 1 | 0 → 2 | 3 → 5 | 3026 → 3149 |
| /guides/quote-follow-up | 79 → 57 | 233 → 146 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+HowTo+FAQPage | 0 → 2 | 0 → 0 | 2 → 4 | 1142 → 1447 |
| /guides/reviews-disappeared | 71 → 58 | 200 → 149 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 1 → 3 | 0 → 3 | 4 → 4 | 3116 → 3219 |
| /guides/reviews-that-stick | 91 → 54 | 242 → 150 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 2 | 0 → 2 | 4 → 10 | 3808 → 3872 |
| /guides/social-media-real-job | 70 → 60 | 209 → 150 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 2 | 0 → 3 | 3 → 4 | 2624 → 2691 |
| /guides/spam-competitors | 82 → 50 | 233 → 146 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 1 → 3 | 2 → 3 | 1 → 4 | 3186 → 3226 |
| /guides/still-no-calls | 84 → 54 | 203 → 143 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 3 → 3 | 0 → 1 | 8 → 8 | 3128 → 3184 |
| /guides/who-owns-your-stuff | 81 → 49 | 208 → 146 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 0 | 0 → 1 | 5 → 7 | 3798 → 3904 |
| /tools | 36 → 57 | 146 → 152 | 1 → 1 | apex → www | no / no → yes / yes | none → CollectionPage | 0 → 0 | 0 → 0 | 94 → 94 | 293 → 405 |
| /tools/demo-line | 36 → 55 | 135 → 148 | 1 → 1 | none → www | no / no → yes / yes | none → WebPage | 0 → 1 | 0 → 0 | 2 → 3 | 465 → 643 |
| /tools/google-playbook | 71 → 60 | 204 → 144 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 1 | 0 → 2 | 4 → 6 | 1785 → 1835 |
| /tools/google-posts | 47 → 60 | 130 → 136 | 1 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 1 | 0 → 1 | 4 → 4 | 382 → 535 |
| /tools/missed-call-guide | 41 → 58 | 133 → 133 | 1 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 0 | 0 → 0 | 6 → 6 | 1043 → 1069 |
| /tools/missed-calls | 43 → 53 | 148 → 148 | 1 → 1 | none → www | no / no → yes / yes | none → WebPage+WebApplication | 0 → 1 | 0 → 0 | 13 → 13 | 521 → 763 |
| /tools/review-guide | 47 → 58 | 161 → 148 | 1 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 0 | 0 → 4 | 3 → 3 | 1145 → 1227 |
| /tools/review-kit | 33 → 59 | 159 → 145 | 1 → 1 | none → www | no / no → yes / yes | none → WebPage+WebApplication | 0 → 0 | 1 → 4 | 13 → 13 | 757 → 797 |
| /tools/social-playbook | 72 → 59 | 182 → 153 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 0 | 0 → 0 | 4 → 6 | 1636 → 1666 |
| /tools/trial | 43 → 54 | 177 → 150 | 2 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 1 | 0 → 0 | 13 → 13 | 619 → 777 |
| /tools/tuneup | 37 → 46 | 141 → 141 | 1 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 0 | 0 → 2 | 8 → 8 | 525 → 570 |
| /tools/warranty-packet | 53 → 60 | 207 → 155 | 1 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 0 | 0 → 0 | 3 → 5 | 878 → 883 |
| /tools/website-playbook | 67 → 60 | 188 → 155 | 1 → 1 | apex → www | yes / no → yes / yes | Article+FAQPage → Article+FAQPage | 0 → 0 | 0 → 0 | 2 → 3 | 1754 → 1764 |
| /tools/xray | 35 → 52 | 165 → 153 | 1 → 1 | apex → www | no / no → yes / yes | none → WebPage | 0 → 0 | 0 → 0 | 12 → 12 | 462 → 462 |

## GEO (being quotable by AI answer engines)

- **Answer first.** Every guide's lead paragraph now gives the direct 2-3 sentence answer (e.g. quote-follow-up: "Follow up
  twice ... Then stop."; lsa-missed-calls: yes, missed and voicemail calls over 20 seconds in business hours are charged).
  The "20-second version" box below it was already there and stays.
- **Definitions** added where a page leaned on a term: AI receptionist, CRM, 10DLC, home warranty, LSA (already there),
  Google post, Business Redressal Complaint Form.
- **Question headings** where people really ask it that way (33 question H2s, up from 6), e.g. "Why did my Google reviews
  disappear?" style headings, "How many times should you follow up on a quote?", "Does posting on Facebook help you rank
  on Google?". Most headings were left alone where they already read well. Section ids kept, TOCs in sync.
- **Entity named the same way** on the page, in the schema and in llms.txt: Wyatt (Brunderman), founder of Biggify,
  Port Charlotte FL.
- **Citations** to the primary source wherever a page says "Google says", "the FTC rule", etc. Claims that could not be
  verified on a public page were left as written and unlinked (listed below).
- HowTo only where the page's main job is a step-by-step procedure (fake-review-attack, quote-follow-up,
  how-much-on-the-phone). Note: Google stopped showing HowTo rich results in 2023 and FAQ rich results are limited to
  government/health sites, so these mainly help AI engines and other parsers; they are accurate, not decorative.

## Pages that needed real content work

- **quote-follow-up**: had FAQ schema but no visible FAQ (a "fake FAQ" for Google). Added a real "Quick answers" section
  (4 questions answered from the page body), two more reply cases, question headings, HowTo for the 5 steps.
- **ai-receptionist**: answer-first lead, a plain definition, a new "How do I know if I miss enough calls to need one?" answer.
- **Thin tool pages** (300-600 words): missed-calls got "How does the calculator work?" (the formula from calc.js and a
  worked example using the sample numbers already in the boxes), demo-line got "What is an AI receptionist?", trial got
  "How does the free trial work?" (from the thank-you text; no prices), google-posts got "What is a Google post?".
- **trial**: two H1s (default + video variant). Now one H1 shared by both; only the callout and lead switch.
- **/tools hub**: added the 4 playbooks, and a link to /guides.

## Decisions

- **No dates in schema.** The brief asked for dateModified, but the guides carry the owner rule "Guides never show a date ...
  No dates in schema either." The owner rule wins; the test enforces it. If the owner wants dateModified back, it is a
  small change in the sweep, lib/editor/newguide.ts and the test.
- **No sameAs.** No real Biggify profile links were found in the code or notes. Placeholders would be worse than none.
- **No llms-full.txt.** It would duplicate every guide as plain text on another URL; llms.txt links straight to the pages.

## Needs the owner

1. **Real profile links for sameAs**: Biggify's Google Business Profile URL, Facebook page, YouTube channel, Instagram,
   LinkedIn (whichever exist). Add them to `ORGANIZATION` in `dashboard/lib/seo/entities.ts` and to the same node in the
   pages (or ask Claude to run the sweep).
2. **Google Search Console** (after the deploy): submit `https://www.gobiggify.com/sitemap.xml`, and make sure the
   property is the www host (or a Domain property). Request indexing for /guides and /tools.
3. **Bing Webmaster Tools** (feeds ChatGPT search and Copilot): import from Search Console and submit the same sitemap.
   (Owner rule "Google-only listings" is about Bing Places for clients; this is Biggify's own site. Ask before doing it.)
4. Claims a helper could not verify on a public page, left as written: reviews-disappeared "pauses usually lift within a
   few days" and "unusual volumes or patterns" wording; reviews-that-stick "more than $50,000 per violation" (FTC civil
   penalty figure not on the page checked); fake-review-attack "typically lifted within a few days" (from Google's email);
   missed-calls-competitors HBR "within an hour, nearly 7 times as likely"; who-owns-your-stuff Meta and FCC porting lines.
5. /tools/xray body is being changed by another helper; only its head tags changed here, so a merge may touch the same
   lines in `<head>`.
