import type { Metadata } from 'next';
import { homeCss } from './home-css';
import HomeBehavior from './home-behavior';

// gobiggify.com homepage. 2026-11-13 ("option B"): the redesign's look (truck-door lettering on cream paper, ink bands,
// signal red, Archivo + DM Serif Display, the missed-call signature in the hero, the rising-arrow ambient) on the live
// content: the official plan names, the $16k case study, "How we work with you", and every anchor other pages link to
// (#plans, #contact, #faq, #services, #case-studies, #work ...).
// Order (owner): hero, then the before/after website carousel, then the free tools, then the rest.
// Client work (owner 2026-11-13): pictures only. No business names, no links to client sites, a plain trade + area
// caption at most. Jason's Mobile Mechanics is never shown (dropped client).
// Numbers: only the two sourced stats and the $16k case study. Nothing invented.

export const metadata: Metadata = {
  title: 'Biggify — Marketing & AI Receptionist for Home Service Businesses',
  description:
    'Biggify helps service businesses anywhere in the US make more money: custom websites, Google profiles worked every week, steady reviews and an AI receptionist that answers every call.',
  alternates: { canonical: 'https://www.gobiggify.com/' },
};

const RECEPTIONIST_TEL = 'tel:+19414018288';
const RECEPTIONIST_DISPLAY = '(941) 401-8288';

type Work = { key: string; trade: string; before?: boolean; tag?: string };
// The pictures are the ones already in public/work. Captions are a trade and an area only.
const WORK: Work[] = [
  { key: 'rapidwaterheater', trade: 'Plumbing & water heaters · Southwest Florida', before: true },
  { key: 'clearvant', trade: 'Window cleaning · Southwest Florida', before: true },
  { key: 'tropicalbaybuilders', trade: 'Remodeling & construction · Southwest Florida', before: true },
  { key: 'rsitile', trade: 'Tile contractor · Southwest Florida', before: true },
  { key: 'interiormotives', trade: 'Interior design · Southwest Florida', tag: 'New website' },
  { key: 'tropicalbayrentals', trade: 'E-bike & jet ski rentals · Southwest Florida', tag: 'New website' },
];

type Tool = { slug: string; name: string; kind: string };
const TOOL_FAMILIES: { title: string; blurb: string; tools: Tool[] }[] = [
  {
    title: "Calls you can't pick up",
    blurb: "For when you're on a ladder, under a sink, or driving.",
    tools: [
      { slug: 'missed-calls', name: 'Missed Call Money Leak', kind: 'Calculator · 1 minute' },
      { slug: 'missed-call-guide', name: 'Missed Call Fix-It Guide', kind: 'Guide · 5 minutes' },
      { slug: 'demo-line', name: 'Call the Demo Receptionist', kind: 'Try it · 1 minute' },
      { slug: 'trial', name: '30-Day AI Receptionist Trial', kind: 'Free trial · 30 days' },
    ],
  },
  {
    title: 'Google reviews',
    blurb: 'More reviews help more people pick you.',
    tools: [
      { slug: 'review-kit', name: 'Review Booster Kit', kind: 'Make it now · 2 minutes' },
      { slug: 'review-guide', name: 'The 30-Second Review Ask', kind: 'Guide · 5 minutes' },
    ],
  },
  {
    title: 'Your Google profile',
    blurb: 'The listing people see before they call you.',
    tools: [
      { slug: 'xray', name: 'X-Ray: Google, website & social', kind: 'Report · 1 business day' },
      { slug: 'google-posts', name: '4 Free Google Posts', kind: 'Done for you · 4 posts' },
      { slug: 'tuneup', name: 'Google Profile Tune-Up', kind: 'Done for you · 5 a month' },
    ],
  },
];

const I = ({ id }: { id: string }) => <svg aria-hidden="true"><use href={`#i-${id}`} /></svg>;

function Icons() {
  const s = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-phone" viewBox="0 0 24 24" {...s} strokeWidth="2.2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24" {...s} strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
        <symbol id="i-left" viewBox="0 0 24 24" {...s} strokeWidth="2.6"><path d="M15 5l-7 7 7 7" /></symbol>
        <symbol id="i-right" viewBox="0 0 24 24" {...s} strokeWidth="2.6"><path d="M9 5l7 7-7 7" /></symbol>
        <symbol id="i-web" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01M7 13h6M7 16h10" /></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></symbol>
        <symbol id="i-social" viewBox="0 0 24 24" {...s} strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M4 15l4.5-4.5 4 4 2.5-2.5L20 17" /><circle cx="15.5" cy="8" r="1.5" /></symbol>
        <symbol id="i-headset" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2.5" y="13" width="4.5" height="6.5" rx="1.8" /><rect x="17" y="13" width="4.5" height="6.5" rx="1.8" /><path d="M19.5 19.5c0 1.7-2 2.5-5 2.5" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24" {...s} strokeWidth="2.6"><path d="M6 6l12 12M18 6 6 18" /></symbol>
        <symbol id="i-msg" viewBox="0 0 24 24" {...s} strokeWidth="2.2"><path d="M4 5h16v11H9l-5 4z" /></symbol>
        <symbol id="i-cal" viewBox="0 0 24 24" {...s} strokeWidth="2.2"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></symbol>
      </defs>
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="bz">
      {/* the shared design system (same file as the free tools and guides), then the homepage layer; both in place so
          they leave with the page */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- deliberate: a plain in-place link leaves with the page */}
      <link rel="stylesheet" href="/tools/tools.css" />
      <style dangerouslySetInnerHTML={{ __html: homeCss }} />
      <Icons />
      <a className="skip" href="#main">Skip to content</a>

      <header>
        <div className="wrap">
          <nav aria-label="Main">
            <a className="logo" href="#top" aria-label="Biggify home"><img src="/logo.webp" alt="Biggify" width={239} height={132} /></a>
            <div className="nav-links">
              <a className="nav-link" href="#work">Our work</a>
              <a className="nav-link" href="#services">Services</a>
              <a className="nav-link" href="#plans">Plans</a>
              <a className="nav-link" href="/how-it-works">How it works</a>
              <a className="nav-link" href="/tools">Free tools</a>
              <a className="nav-link" href="/guides">Guides</a>
            </div>
            <div className="nav-cta">
              <a className="nav-phone" href={RECEPTIONIST_TEL}><I id="phone" />{RECEPTIONIST_DISPLAY}</a>
              <a className="nav-signin" href="/login">Sign in</a>
              <a className="btn btn-primary btn-small nav-quote" href="#contact">Get a free quote</a>
              <button type="button" className="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="menu-panel"><span></span><span></span><span></span></button>
            </div>
          </nav>
        </div>
        <div className="menu-panel" id="menu-panel" hidden>
          <div className="wrap">
            <p className="menu-label">Services</p>
            <div className="menu-grid">
              <a href="#websites">Websites</a>
              <a href="#gbp">Google Business Profile</a>
              <a href="#social">Social media</a>
              <a href="#receptionist">AI receptionist</a>
            </div>
            <p className="menu-label">More</p>
            <div className="menu-grid">
              <a href="#work">Our work</a>
              <a href="#case-studies">Case study</a>
              <a href="#plans">Plans</a>
              <a href="/how-it-works">How it works</a>
              <a href="#faq">FAQ</a>
              <a href="/tools">Free tools</a>
              <a href="/guides">Guides</a>
              <a href="/login">Sign in</a>
            </div>
            <a className="btn btn-primary btn-block" href="#contact">Get a free quote</a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className="hero hero-home" id="top">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow light">For service businesses anywhere in the US</p>
              <h1><span className="l">Get found.</span> <span className="l">Get chosen.</span> <span className="l grad">Never miss the call.</span></h1>
              <p className="lead">Biggify builds your website. We run your Google profile and social media. And an AI receptionist answers your phone 24/7. So you stop losing jobs at every step.</p>
              <div className="hero-cta">
                <a className="btn btn-primary btn-lg btn-sweep" href="#contact">Get a free quote<I id="arrow" /></a>
                <a className="btn btn-ghost btn-lg call-btn" href={RECEPTIONIST_TEL}><I id="phone" /><span className="label">Call our receptionist</span></a>
              </div>
              <ul className="chips" aria-label="Good to know">
                <li>Keep your number</li>
                <li>Your phone rings first</li>
                <li>9 free tools. No card.</li>
              </ul>
            </div>

            {/* THE SIGNATURE: a missed call gets answered and lands as a text. Plays once when it scrolls into view, then
                rests exactly as drawn here. The caller in the text is an example and is labelled as one. */}
            <div className="hero-visual">
              <figure className="callsig" data-callsig aria-label="Example: what happens when you miss a call">
                <div className="device" data-tilt>
                  <div className="device-top"><span className="device-tag">Example call</span><span className="device-dot" aria-hidden="true"></span></div>
                  <ol className="cs-list">
                    <li className="cs cs-ring" style={{ ['--d' as string]: '.1s' }}>
                      <span className="cs-ico" aria-hidden="true"><I id="phone" /></span>
                      <div><b>A customer calls your number</b><small>Your phone rings first.</small></div>
                    </li>
                    <li className="cs cs-miss" style={{ ['--d' as string]: '1.5s' }}>
                      <span className="cs-ico" aria-hidden="true"><I id="x" /></span>
                      <div><b>You can&apos;t pick up</b><small>On a ladder. Under a sink. Driving.</small></div>
                    </li>
                    <li className="cs cs-ai" style={{ ['--d' as string]: '2.6s' }}>
                      <span className="cs-ico" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                      <div><b>Biggify answers</b><small>It says it&apos;s an AI assistant, then takes their name and what they need.</small></div>
                    </li>
                    <li className="cs cs-text" style={{ ['--d' as string]: '4.1s' }}>
                      <span className="cs-ico" aria-hidden="true"><I id="msg" /></span>
                      <div>
                        <b>You get a text right away</b>
                        <div className="sms">
                          <span className="sms-head"><span>Text message</span><span>now</span></span>
                          <span className="sms-body"><strong>New caller: Dana</strong>Needs: water heater is leaking, wants a quote.<br />Tap to call back.</span>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
                <figcaption>An example. Your text has the caller&apos;s name, number and what they need.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* OUR WORK: before & after. Pictures only (owner 2026-11-13): no names, no links. */}
        <section className="band band-dots" id="work">
          <div className="wrap">
            <div className="section-head head-row rv">
              <div>
                <span className="eyebrow">Our work</span>
                <h2>Before <span className="serif-accent">&amp;</span> after</h2>
                <p>Real businesses. Same company, same trade — a website that finally works as hard as they do.</p>
              </div>
              <div className="car-nav" aria-label="Move through the websites">
                <button type="button" className="car-btn" data-car-prev aria-label="Previous website"><I id="left" /></button>
                <button type="button" className="car-btn" data-car-next aria-label="Next website"><I id="right" /></button>
              </div>
            </div>
          </div>
          <div className="work-track" data-car tabIndex={0} aria-label="Websites built by Biggify. Swipe or use the arrow buttons.">
            {WORK.map((w) => (
              <article className="work-card" key={w.key}>
                {w.before ? (
                  <div className="cmp" data-cmp style={{ ['--pos' as string]: '50%' }}>
                    <img className="cmp-after" src={`/work/${w.key}-after.jpg`} alt={`${w.trade.split(' · ')[0]}: the new website by Biggify`} width={1200} height={750} loading="lazy" decoding="async" />
                    <div className="cmp-before"><img src={`/work/${w.key}-before.jpg`} alt={`${w.trade.split(' · ')[0]}: the old website`} width={1200} height={750} loading="lazy" decoding="async" /></div>
                    <span className="tag tag-before">Before</span><span className="tag tag-after">After</span>
                    <span className="cmp-handle" aria-hidden="true"></span>
                    <input type="range" min={0} max={100} defaultValue={50} aria-label={`Slide to compare the old and new website (${w.trade.split(' · ')[0].toLowerCase()})`} />
                  </div>
                ) : (
                  <div className="cmp single">
                    <img className="cmp-after" src={`/work/${w.key}-after.jpg`} alt={`${w.trade.split(' · ')[0]}: website by Biggify`} width={1200} height={750} loading="lazy" decoding="async" />
                    <span className="tag tag-after">{w.tag}</span>
                  </div>
                )}
                <div className="meta"><span className="trade">{w.trade}</span></div>
              </article>
            ))}
          </div>
          <div className="wrap"><p className="car-hint">Drag the red handle on a picture to compare. Swipe sideways for the next website.</p></div>
        </section>

        {/* FREE TOOLS: the low-risk first step. Names and one-liners are the ones on /tools. */}
        <section className="band dark band-tools" id="free-tools">
          <div className="wrap">
            <div className="section-head rv">
              <span className="eyebrow light">Start free</span>
              <h2>Not ready to talk? <span className="serif-accent blk">Try a free tool.</span></h2>
              <p>Pick the one that fits your biggest problem. Each one is free. No card.</p>
            </div>
            <div className="fam-grid">
              {TOOL_FAMILIES.map((f) => (
                <div className="fam rv" key={f.title}>
                  <h3>{f.title}</h3>
                  <p>{f.blurb}</p>
                  <ul>
                    {f.tools.map((t) => (
                      <li key={t.slug}><a href={`/tools/${t.slug}`}><span><b>{t.name}</b><small>{t.kind}</small></span><I id="arrow" /></a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="cta-row rv">
              <a className="btn btn-primary" href="/tools">See all 9 free tools</a>
              <a className="btn btn-ghost" href="/guides">Read the guides</a>
            </div>
          </div>
        </section>

        {/* WHERE JOBS GET LOST */}
        <section className="band band-rules" id="leaks">
          <div className="wrap">
            <div className="section-head rv">
              <span className="eyebrow">The problem</span>
              <h2>Jobs leak out at three points. <span className="serif-accent blk">We plug all three.</span></h2>
              <p>Most home-service businesses don&apos;t have a demand problem — they have a leak problem. Here&apos;s where the work slips away before it ever hits your schedule.</p>
            </div>
            <div className="leak">
              <div className="card fx rv">
                <div className="stage"><span>Leak</span><b>1</b></div>
                <h3>They never find you</h3>
                <p>People search for your trade in your town. The shops on the map get the call. Is your Google profile thin? Is your website hard to find? Then they can&apos;t see you when they&apos;re ready to buy.</p>
                <div className="fix"><span>Fixed by</span><a href="#gbp">Google Business Profile</a><a href="#websites">Website</a></div>
              </div>
              <div className="card fx rv">
                <div className="stage"><span>Leak</span><b>2</b></div>
                <h3>They find you, but don&apos;t pick you</h3>
                <p>An old site, no reviews, no photos of your work. They hit the back button and call the next name. You lost the job and never knew they looked.</p>
                <div className="fix"><span>Fixed by</span><a href="#websites">Website</a><a href="#social">Social Media</a></div>
              </div>
              <div className="card fx rv">
                <div className="stage"><span>Leak</span><b>3</b></div>
                <h3>They call, and nobody answers</h3>
                <p>You&apos;re on a ladder or under a sink. The call goes to voicemail. Most callers won&apos;t leave one — they call your competitor, who picks up.</p>
                <div className="fix"><span>Fixed by</span><a href="#receptionist">AI Receptionist</a></div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES OVERVIEW */}
        <section className="band band-tint" id="services">
          <div className="wrap">
            <div className="section-head rv">
              <span className="eyebrow">What we do</span>
              <h2>Four services. <span className="serif-accent blk">One goal: more booked jobs.</span></h2>
              <p>Take the whole stack, or start with the one piece that&apos;s leaking the most.</p>
            </div>
            <div className="svc-grid">
              <a className="svc card fx rv" href="#websites"><span className="ico" aria-hidden="true"><I id="web" /></span><h3>Website Design</h3><p>A fast site built for phones that turns visitors into calls. Your reviews, your work, and call buttons everywhere.</p><span className="more">See our work<I id="arrow" /></span></a>
              <a className="svc card fx rv" href="#gbp"><span className="ico" aria-hidden="true"><I id="pin" /></span><h3>Google Business Profile</h3><p>Own the map pack in the towns you serve. Optimized profile, active posting, citations, and a steady stream of reviews.</p><span className="more">Learn more<I id="arrow" /></span></a>
              <a className="svc card fx rv" href="#social"><span className="ico" aria-hidden="true"><I id="social" /></span><h3>Social Media</h3><p>Steady posts that turn your job photos into proof. People keep you in mind, and you don&apos;t lift a finger.</p><span className="more">Learn more<I id="arrow" /></span></a>
              <a className="svc card fx hot rv" href="#receptionist"><span className="ico" aria-hidden="true"><I id="headset" /></span><h3>AI Receptionist</h3><p>Answers every call 24/7 in a natural voice. Books the job on your calendar. Texts the customer for details.</p><span className="more">Hear it work<I id="arrow" /></span></a>
            </div>
          </div>
        </section>

        {/* WEBSITES */}
        <section className="band band-dots" id="websites">
          <div className="wrap">
            <div className="split">
              <div className="rv">
                <span className="eyebrow">Website Design</span>
                <h2>A website that&apos;s built to <span className="serif-accent blk">get the phone to ring</span></h2>
                <p className="lead">Most contractor websites are online brochures nobody reads. We build yours like a salesperson. It loads fast and names the towns you serve. It shows your work. And it makes calling you the easy next step.</p>
                <ul className="checks">
                  <li><b>Fast, and built for phones</b> — most of your customers search on their phone. On the couch, or in the middle of a leak.</li>
                  <li><b>Click-to-call everywhere</b> — your number is one tap away from every screen.</li>
                  <li><b>Pages for the towns you work</b> — so you show up for &quot;water heater repair Sarasota.&quot; Not just for your name.</li>
                  <li><b>Reviews, licenses, and real photos up front</b> — the trust signals people check before they call.</li>
                  <li><b>Wired to your receptionist</b> — chat and call buttons go straight to Biggify. So the site doesn&apos;t just look good. It books.</li>
                </ul>
                <div className="actions">
                  <a className="btn btn-primary" href="#contact">Get a free quote</a>
                  <a className="btn btn-outline" href="#work">See before &amp; afters</a>
                </div>
              </div>
              <div className="browser fx rv" data-tilt>
                <div className="browser-bar" aria-hidden="true"><i></i><i></i><i></i></div>
                <img src="/work/interiormotives-after.jpg" alt="Interior design studio: website built by Biggify" width={1200} height={750} loading="lazy" decoding="async" />
                <div className="browser-meta">Interior design · Southwest Florida</div>
              </div>
            </div>
          </div>
        </section>

        {/* GOOGLE BUSINESS PROFILE */}
        <section className="band band-tint" id="gbp">
          <div className="wrap">
            <div className="split rev">
              <div className="card fx included rv">
                <div className="card-label">What&apos;s included</div>
                <ul className="checks">
                  <li><b>Profile optimization</b> — categories, services, hours, service areas, photos, and description dialed in.</li>
                  <li><b>Regular posts</b> — 4 a month on the Authority Plan, 10 on the Domination System. Google sees a busy shop.</li>
                  <li><b>The towns you serve</b> — your home town on the Authority Plan. 3–5 towns on the Domination System.</li>
                  <li><b>Keyword coverage</b> — your core services, expanding to your full service line and long-tail searches.</li>
                  <li><b>Citations &amp; links</b> — foundational listings, then active link-building as you scale.</li>
                  <li><b>Reviews</b> — a request system that runs itself, or a fully managed review campaign.</li>
                  <li><b>Reporting</b> — a monthly summary, or full attribution: calls → booked → closed.</li>
                </ul>
              </div>
              <div className="rv">
                <span className="eyebrow">Google Business Profile</span>
                <h2>Own the map <span className="serif-accent blk">in the towns you serve</span></h2>
                <p className="lead">Someone searches &quot;AC repair near me.&quot; The top three shops on the map get the calls. Getting there and staying there takes steady work. Most owners don&apos;t have time for it. We do it every week.</p>
                <p>Your profile gets filled in and kept busy with posts and photos. Your reviews grow on a schedule, not by luck. And your listing gets the backup Google wants to see. Google checks other listings and pages before it trusts you with the top spot.</p>
                <div className="actions">
                  <a className="btn btn-primary" href="#contact">Get a free quote</a>
                  <a className="btn btn-outline" href="/tools/xray">Free profile X-Ray</a>
                </div>
                <p className="aside"><a className="link" href="#plans">Compare plans</a></p>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL MEDIA */}
        <section className="band band-rules" id="social">
          <div className="wrap">
            <div className="split">
              <div className="rv">
                <span className="eyebrow">Social Media</span>
                <h2>Stay top of mind between jobs — <span className="serif-accent blk">without posting a thing</span></h2>
                <p className="lead">Nobody hires a roofer off a viral post. But say a neighbor asks who to call. The shop they&apos;ve seen all month is the one that gets named. That&apos;s what steady posts do.</p>
                <ul className="checks">
                  <li><b>Your job photos become posts</b> — send us the before-and-afters from the truck. We turn them into proof.</li>
                  <li><b>Steady posts</b> — 4 a month on the Authority Plan, 10 on the Domination System. On Facebook, Instagram and your Google profile. You never go dark.</li>
                  <li><b>Local voice</b> — posts that sound like a business people know, not a marketing agency.</li>
                  <li><b>Reviews get reused</b> — every new five-star review becomes content that works twice.</li>
                </ul>
                <div className="actions">
                  <a className="btn btn-primary" href="#contact">Get a free quote</a>
                  <a className="btn btn-outline" href="/tools/google-posts">Get 4 free Google posts</a>
                </div>
              </div>
              {/* A drawing of how a post is laid out, not a real post: no client name and no made-up job. */}
              <div className="post fx rv" data-tilt aria-label="How a post is laid out">
                <div className="post-head"><span className="post-av" aria-hidden="true">YB</span><div><b>Your business name</b><span>Your town · Example post layout</span></div></div>
                <div className="post-shots" aria-hidden="true"><div className="ps ps-before"><span>Your before photo</span></div><div className="ps ps-after"><span>Your after photo</span></div></div>
                <p>What the job was, where it was, and how it turned out. In your words, from the photos you text us.</p>
                <div className="post-foot" aria-hidden="true"><span>Like</span><span>Comment</span><span>Share</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* AI RECEPTIONIST: the two sourced numbers, word for word */}
        <div className="stats dark" id="receptionist">
          <div className="wrap">
            <div className="stat-grid">
              <div className="stat rv"><div className="n">85%</div><div className="l">of missed calls don&apos;t leave a voicemail<small className="src">Quo, 18 million missed calls</small></div></div>
              <div className="stat rv"><div className="n">1 in 5</div><div className="l">callers go straight to a competitor when you don&apos;t answer<small className="src">CallRail survey of 1,000 US consumers: 21% call another business right away</small></div></div>
            </div>
            <p className="stat-kicker rv">Stack that up over the year, and that&apos;s huge.</p>
          </div>
        </div>
        <section className="band band-dots">
          <div className="wrap">
            <div className="split">
              <div className="rv">
                <span className="eyebrow">AI Receptionist</span>
                <h2>Every call answered. Every job booked. <span className="serif-accent blk">Even at 9 PM on a Sunday.</span></h2>
                <p className="lead">Marketing brings the calls. The receptionist makes sure none of them slip away. It picks up right away in a natural voice. It answers questions about your services. It books the job on your real calendar. Then it texts the customer for the details. And you keep working.</p>
                <ul className="checks">
                  <li><b>Answers 24/7</b> — no voicemail, no hold music, no &quot;we&apos;ll call you back.&quot;</li>
                  <li><b>Books straight to your calendar</b> while the customer is still on the line.</li>
                  <li><b>Texts a quick survey</b> — address, issue, preferred time — so you show up ready.</li>
                  <li><b>Alerts you instantly</b> by text and email with everything attached.</li>
                  <li><b>Keep your number</b> — forward the calls you can&apos;t grab, or all of them.</li>
                  <li><b>Your own dashboard</b> — every call, booking, and conversation logged in one place.</li>
                </ul>
                <div className="actions">
                  <a className="btn btn-primary call-btn" href={RECEPTIONIST_TEL}><I id="phone" /><span className="label">Call it right now</span></a>
                  <a className="btn btn-outline" href="/tools/trial">Try it free for 30 days</a>
                </div>
                <p className="aside"><a className="link" href="/how-it-works#calculator">What are missed calls costing you?</a></p>
              </div>
              <div className="chat fx rv" data-tilt aria-label="Example call">
                <div className="chat-head"><span className="dot" aria-hidden="true"></span><span>Example call — answered by Biggify</span></div>
                <div className="bubble b-in">Thanks for calling! I can get you booked. What&apos;s the issue you&apos;re having?</div>
                <div className="bubble b-out">My AC stopped blowing cold air.</div>
                <div className="bubble b-in">Got it. I have Tuesday 9–11 AM open — shall I book that?</div>
                <div className="bubble b-out">Yes please</div>
                <div className="bubble b-in">You&apos;re booked! I just texted you 3 quick questions so the tech arrives ready.</div>
              </div>
            </div>
          </div>
        </section>

        {/* CASE STUDY: the trade and the area only. No name, no link (owner 2026-11-13). */}
        <section className="band band-tint" id="case-studies">
          <div className="wrap">
            <div className="section-head rv">
              <span className="eyebrow">Case study</span>
              <h2>Proof, <span className="serif-accent">not promises</span></h2>
              <p>Real businesses, real numbers.</p>
            </div>
            <div className="proof card rv">
              <div className="proof-shot"><img src="/work/rsitile-after.jpg" alt="Tile contractor: the new website by Biggify" width={1200} height={750} loading="lazy" decoding="async" /><span className="chip">Tile contractor · Southwest Florida</span></div>
              <div>
                <span className="who">A tile contractor in Southwest Florida</span>
                <div className="proof-stat"><b>$16k</b><span>added in first 3 months</span></div>
                <p>A tile contractor in Southwest Florida became a founding client. Biggify rebuilt his website. We took over the marketing. Three months in, the work it brought in added up to sixteen thousand dollars.</p>
                <div className="actions"><a className="btn btn-primary" href="#contact">Get a free quote</a></div>
              </div>
            </div>
            <p className="proof-more rv">More case studies are on the way. Our founding clients are passing their first 90 days.</p>
          </div>
        </section>

        {/* HOW WE WORK WITH YOU */}
        <section className="band band-rules" id="how-we-work">
          <div className="wrap">
            <div className="section-head rv">
              <span className="eyebrow">How we work with you</span>
              <h2>What actually changes, <span className="serif-accent blk">month by month</span></h2>
              <p>This is not a logo and a brochure. It is every place a customer meets your business. We fix them in order. Then we keep them working while you work.</p>
            </div>
            <div className="how-grid">
              <ol className="timeline">
                <li><span className="when">Week 1</span><h3>We find the leaks</h3><p>A free look at how you show up online. Your Google listing, your site, your reviews, and what happens when someone calls. You get a straight list of what costs you jobs. <b>You get it whether or not you hire us</b>.</p></li>
                <li><span className="when">Month 1</span><h3>The front door gets fixed</h3><p>Your website goes live, built to get the phone to ring. Your Google Business Profile is set up properly. Review requests start going out on their own. If you take the receptionist, <b>every call gets answered from day one</b>.</p></li>
                <li><span className="when">Months 2–3</span><h3>The town starts to notice</h3><p>Posts go out every week on Google, Facebook and Instagram. They&apos;re made from your real job photos. Pages go up for the towns you serve. Reviews climb. <b>You do none of the posting.</b></p></li>
                <li><span className="when">Month 3 and on</span><h3>It compounds, and you can see it</h3><p>More towns, more pages, more reviews. Plus a report that shows calls → booked → closed. So you know what the marketing is really worth. <b>One tile contractor&apos;s first three months: $16k added.</b></p></li>
              </ol>
              <div className="value card rv">
                <span className="eyebrow">What gets added</span>
                <h3>Every month, on the plan</h3>
                <div className="rows">
                  <div className="row"><span><b>A website</b> that is built to convert, not just exist</span><span className="v">Day 1</span></div>
                  <div className="row"><span><b>Google Business posts</b>, so Google sees an active business</span><span className="v">4–10 / mo</span></div>
                  <div className="row"><span><b>Social posts</b> from your job photos, written in your voice</span><span className="v">4–10 / mo</span></div>
                  <div className="row"><span><b>New pages</b> for the towns and services you want to win</span><span className="v">1–6 / mo</span></div>
                  <div className="row"><span><b>Review requests</b> that go out by themselves after every job</span><span className="v">Every job</span></div>
                  <div className="row"><span><b>Calls answered and booked</b> by the receptionist, nights and weekends included</span><span className="v">24/7</span></div>
                  <div className="row"><span><b>A report</b> that ties calls to booked jobs to money</span><span className="v">Monthly</span></div>
                </div>
                <div className="math">
                  <span className="label">The math, at a $1,500 average job</span>
                  <div className="line"><span>One extra booked job a week</span><b>$6,000 / mo</b></div>
                  <div className="line"><span>Two extra booked jobs a week</span><b>$12,000 / mo</b></div>
                  <div className="line"><span>Over a year, at one a week</span><b>$78,000</b></div>
                  <small>Arithmetic, not a promise. Your quote is built on your trade, your towns and your call volume.</small>
                </div>
              </div>
            </div>

            <div className="fit card rv">
              <div>
                <span className="eyebrow">Who we work with</span>
                <h3>Serious businesses that want to grow</h3>
                <p>We put real work into every client. So we only take shops ready to grow and ready to work with us. Here is the bar.</p>
                <p className="or"><b>Just want a website?</b> We also build one-off sites. They&apos;re for shops not ready for a marketing plan yet. Same build quality, no monthly commitment. <a className="link" href="#contact">Ask for a website quote</a>.</p>
              </div>
              <ul className="crit">
                <li><span className="k">$</span><span><b>Average job of $1,500 or more</b>One more booked job must pay you real money. If not, the plan does not pay.</span></li>
                <li><span className="k">2+</span><span><b>In your market two years or more</b>You already do good work. You have the reviews and photos to prove it. We make sure more people see it.</span></li>
                <li><span className="k">GO</span><span><b>Ready to make changes and work together</b>Send the job photos. Approve the posts. Forward the calls. Marketing works when the owner is in on it.</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* PLANS */}
        <section className="band dark band-plans" id="plans">
          <div className="wrap">
            <div className="section-head rv">
              <span className="eyebrow light">Plans</span>
              <h2>Pick your <span className="serif-accent">level of growth</span></h2>
              <p>Every plan is quoted to your business — your trade, your service area, your goals. No two shops are the same, so no price tags here. Tell us about yours and we&apos;ll build the number.</p>
            </div>

            <div className="plan-grid">
              <div className="plan rv">
                <div className="tier">Tier 1</div>
                <h3>The Professional Business Authority Plan</h3>
                <p className="for">For the shop that needs to get found and get chosen in its home town.</p>
                <div className="price">Custom quote<small>Built around your business</small></div>
                <ul>
                  <li>Custom, mobile-first website</li>
                  <li>Google Business Profile optimization</li>
                  <li>4 Google Business posts per month</li>
                  <li>1 city/town targeted</li>
                  <li>Core-service keywords</li>
                  <li>1–2 new content pages per month</li>
                  <li>Foundational citations</li>
                  <li>Review-request setup</li>
                  <li>Social media — 4 posts per month</li>
                  <li>Monthly summary report</li>
                </ul>
                <a className="btn btn-ghost" href="#contact">Get a custom quote</a>
              </div>

              <div className="plan featured rv">
                <span className="tag">Most complete</span>
                <div className="tier">Tier 2</div>
                <h3>The Lead-Printer Domination System</h3>
                <p className="for">For the shop ready to dominate multiple towns and stop missing calls entirely.</p>
                <div className="price">Custom quote<small>Built around your business</small></div>
                <ul>
                  <li>Everything in the Authority Plan</li>
                  <li className="plus">3–5 towns targeted</li>
                  <li className="plus">10 Google Business posts per month</li>
                  <li className="plus">Full service line + long-tail keywords</li>
                  <li className="plus">4–6 new content pages per month</li>
                  <li className="plus">Active link-building + citations</li>
                  <li className="plus">Managed review campaign</li>
                  <li className="plus">Social media — 10 posts per month</li>
                  <li className="plus">Attribution reporting: calls → booked → closed</li>
                  <li className="plus"><b>AI Receptionist included</b> — 24/7 answering &amp; booking</li>
                </ul>
                <a className="btn btn-primary" href="#contact">Get a custom quote</a>
              </div>

              <div className="plan rv">
                <div className="tier">Standalone</div>
                <h3>The AI Receptionist on its own</h3>
                <p className="for">Already have your marketing handled? Just stop missing the calls it brings in.</p>
                <div className="price">Custom quote<small>Built around your call volume</small></div>
                <ul>
                  <li>24/7 AI call answering</li>
                  <li>Appointment booking to your calendar</li>
                  <li>Automated SMS customer survey</li>
                  <li>Instant text &amp; email lead alerts</li>
                  <li>Your own branded dashboard</li>
                  <li>Setup &amp; onboarding included</li>
                </ul>
                <a className="btn btn-ghost" href="#contact">Get a custom quote</a>
              </div>
            </div>

            <details className="compare-wrap rv">
              <summary>Compare the plans line by line</summary>
              <div className="compare-scroll" tabIndex={0} role="region" aria-label="Plan comparison table">
                <table className="compare">
                  <thead>
                    <tr><th>What you get</th><th>Authority Plan</th><th className="hi">Domination System</th><th>Receptionist on its own</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Website</td><td>Custom build</td><td>Custom build</td><td className="no">—</td></tr>
                    <tr><td>Service areas</td><td>1 city/town</td><td>3–5 towns</td><td className="no">—</td></tr>
                    <tr><td>Google Business posts</td><td>4 / month</td><td>10 / month</td><td className="no">—</td></tr>
                    <tr><td>Keywords</td><td>Core services</td><td>Full service line + long-tail</td><td className="no">—</td></tr>
                    <tr><td>Content cadence</td><td>1–2 pages/mo</td><td>4–6 pages/mo</td><td className="no">—</td></tr>
                    <tr><td>Off-page</td><td>Foundational citations</td><td>Active links + citations</td><td className="no">—</td></tr>
                    <tr><td>Reviews</td><td>Basic request setup</td><td>Managed campaign</td><td className="no">—</td></tr>
                    <tr><td>Social media posts</td><td>4 / month</td><td>10 / month</td><td className="no">—</td></tr>
                    <tr><td>Reporting</td><td>Monthly summary</td><td>+ attribution loop (calls → booked → closed)</td><td>Call &amp; booking dashboard</td></tr>
                    <tr><td>AI Receptionist</td><td className="no">Add-on</td><td>Included</td><td>Included</td></tr>
                  </tbody>
                </table>
              </div>
            </details>
            <p className="plans-note">Not sure which fits? <a href="#contact">Book a 15-minute call</a> — we&apos;ll tell you honestly where your leak is.</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="band band-rules" id="faq">
          <div className="wrap faq-wrap">
            <div className="section-head rv">
              <span className="eyebrow">FAQ</span>
              <h2>Questions, <span className="serif-accent">answered</span></h2>
              <p>Something else? <a className="link" href="#contact">Book a free 15-minute call</a> or email <a className="link" href="mailto:gobiggify@gmail.com">gobiggify@gmail.com</a>.</p>
            </div>
            <div className="faq rv">
              <details open><summary>Do I have to take everything, or can I start with one service?</summary><p>Start wherever your biggest leak is. Lots of shops start with just the receptionist, or just the Authority Plan. They add on later. The plans are built so the pieces work on their own and work better together.</p></details>
              <details><summary>Do I have to change my phone number?</summary><p>No. You keep your existing number. You just forward the calls you can&apos;t answer to Biggify. So the calls you&apos;d miss get caught. And you still take every call you can.</p></details>
              <details><summary>Will the receptionist sound like a robot?</summary><p>No. Biggify uses a natural AI voice. It greets callers and answers common questions. It books the job like a great front desk would. Call <a className="link" href={RECEPTIONIST_TEL}>{RECEPTIONIST_DISPLAY}</a> right now and hear it. Or try it on your own calls with the <a className="link" href="/tools/trial">free 30-day trial</a>.</p></details>
              <details><summary>Do I own my website and domain?</summary><p>Yes. Your domain stays in your name and the site is yours. We build it, host it, and keep it updated while you&apos;re with us. But it belongs to your business, not to us.</p></details>
              <details><summary>How does the text survey work?</summary><p>After a call, the customer gets a short text with a few quick questions. Then you have the address, the issue and the best time before you call back. Customers can reply STOP at any time to opt out.</p></details>
              <details><summary>What do the reports actually show me?</summary><p>On the Authority Plan, you get a monthly recap. It shows your rankings, profile activity and reviews. On the Domination System, you see the whole path. Where each call came from, which ones got booked, and which ones closed. You see marketing turn into money.</p></details>
              <details><summary>How fast can I get set up?</summary><p>The receptionist is usually live within a few days. Website and marketing timing depends on your plan and how much we build. We&apos;ll give you a clear schedule in your quote.</p></details>
              <details><summary>What does it cost me to find out?</summary><p>Nothing. We start with a free 15-minute call and a demo built on your real business. You see and hear it before you commit to anything.</p></details>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="band band-red" id="contact">
          <div className="wrap">
            <div className="contact-grid">
              <div className="contact-copy rv">
                <span className="eyebrow light">Free 15-minute call</span>
                <h2>Let&apos;s find <span className="serif-accent">your leak</span></h2>
                <p>Book a free 15-minute call. We&apos;ll look at how you show up online. We&apos;ll tell you straight where the jobs are slipping. Then we&apos;ll quote a plan that fits. Or call our receptionist right now and hear it yourself.</p>
                <div className="contact-ways">
                  <a className="way" href={RECEPTIONIST_TEL}><span className="way-ico" aria-hidden="true"><I id="phone" /></span><span><small>Call our receptionist</small><b>{RECEPTIONIST_DISPLAY}</b></span></a>
                  <a className="way" href="mailto:gobiggify@gmail.com"><span className="way-ico" aria-hidden="true"><I id="msg" /></span><span><small>Or email us</small><b>gobiggify@gmail.com</b></span></a>
                </div>
              </div>
              <div className="cal-card rv">
                <div className="cal-head"><I id="cal" /><span>Pick a time that works</span></div>
                <div className="calendly-inline-widget" data-url="https://calendly.com/boogmasterjones/biggify-appointment?hide_event_type_details=1&hide_gdpr_banner=1" suppressHydrationWarning></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <a className="logo" href="#top" aria-label="Back to the top"><img src="/logo-light.webp" alt="Biggify" width={239} height={132} loading="lazy" /></a>
              <p>Marketing &amp; AI receptionist for home service businesses. Get found, get chosen, never miss the call.</p>
              <a className="foot-phone" href={RECEPTIONIST_TEL}><I id="phone" />{RECEPTIONIST_DISPLAY}</a>
              <div className="foot-social" aria-label="Biggify on social media">
                <a href="https://www.facebook.com/profile.php?id=61596442231096" target="_blank" rel="noopener">Facebook</a>
                <a href="https://www.instagram.com/gobiggify/" target="_blank" rel="noopener">Instagram</a>
                <a className="foot-yelp" href="https://www.yelp.com/writeareview/biz/fyMw080KhnER2sEkdSMJGQ" target="_blank" rel="noopener"><span aria-hidden="true">★</span> Review us on Yelp!</a>
              </div>
            </div>
            <div className="foot-cols">
              <div>
                <p className="foot-h">Services</p>
                <a href="#websites">Websites</a>
                <a href="#gbp">Google Business Profile</a>
                <a href="#social">Social Media</a>
                <a href="#receptionist">AI Receptionist</a>
              </div>
              <div>
                <p className="foot-h">Biggify</p>
                <a href="#work">Our Work</a>
                <a href="#plans">Plans</a>
                <a href="/how-it-works">How it works</a>
                <a href="/partners">Partners</a>
                <a href="#faq">FAQ</a>
                <a href="/login">Sign in</a>
              </div>
              <div>
                <p className="foot-h">Free help</p>
                <a href="/tools">Free tools</a>
                <a href="/guides">Guides</a>
                <a href="/videos">Videos</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms</a>
                <a href="/sms">Text Messaging</a>
                <a href="mailto:gobiggify@gmail.com">Contact</a>
              </div>
            </div>
          </div>
          <div className="foot-bot">
            <span>© <span id="yr">2026</span> Biggify. All rights reserved. Biggify is a service of <strong>BIGGIFY LLC</strong>.</span>
            <span>Made for the trades, anywhere in the US.</span>
          </div>
        </div>
      </footer>

      {/* phone-only call bar: shows after the hero, steps aside at the booking calendar and the footer */}
      <div className="callbar" data-callbar hidden>
        <a className="btn btn-primary" href={RECEPTIONIST_TEL}><I id="phone" />Call us</a>
        <a className="btn btn-outline" href="/tools">Free tools</a>
      </div>

      <HomeBehavior />
    </div>
  );
}
