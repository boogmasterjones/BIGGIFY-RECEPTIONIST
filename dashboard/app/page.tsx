'use client';

import { useEffect } from 'react';

const css = `
  :root{
    --bg:#0b1020;
    --bg-2:#0f1630;
    --surface:#ffffff;
    --cream:#FFF6E1;
    --ink:#0d1224;
    --ink-soft:#4a5372;
    --muted:#6b7390;
    --line:#e7e9f2;
    --brand:#cf0000;
    --brand-2:#a30000;
    --brand-grad:linear-gradient(120deg,#e11a1a 0%,#cf0000 55%,#a30000 100%);
    --accent:#ffd166;
    --radius:16px;
    --shadow:0 20px 50px -20px rgba(20,16,80,.35);
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:var(--font);color:var(--ink);background:var(--cream);line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  .wrap{width:min(1140px,92vw);margin-inline:auto}
  .btn{display:inline-block;padding:14px 26px;border-radius:999px;font-weight:700;font-size:15px;cursor:pointer;border:none;transition:transform .15s ease,box-shadow .15s ease}
  .btn-primary{background:var(--brand-grad);color:#fff;box-shadow:0 12px 30px -10px rgba(207,0,0,.45)}
  .btn-primary:hover{transform:translateY(-2px)}
  .btn-ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25)}
  .btn-ghost:hover{background:rgba(255,255,255,.16)}
  .eyebrow{display:inline-block;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12.5px;color:var(--brand);background:rgba(207,0,0,.08);padding:6px 14px;border-radius:999px}

  /* NAV */
  header{position:sticky;top:0;z-index:50;background:rgba(255,246,225,.92);backdrop-filter:blur(10px);border-bottom:1px solid #ece3ca}
  nav{display:flex;align-items:center;justify-content:space-between;padding:10px 0}
  .logo{display:flex;align-items:center;gap:10px}
  .logo img{height:44px;display:block}
  .nav-links{display:flex;align-items:center;gap:28px;color:var(--ink-soft);font-weight:600;font-size:15px}
  .nav-links a:hover{color:var(--ink)}
  .nav-cta{display:flex;gap:14px;align-items:center}
  .nav-phone{font-weight:700;color:var(--ink);font-size:15px;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .nav-phone:hover{color:var(--brand)}
  /* dropdown menu — plain 3-line icon button (no <details> marker) */
  .menu{position:relative}
  .menu-btn{border:none;background:none;cursor:pointer;color:var(--ink-soft);padding:6px;display:flex;align-items:center;justify-content:center}
  .menu-btn svg{display:block}
  .menu-btn:hover{color:var(--brand)}
  .menu-panel{position:absolute;top:calc(100% + 8px);left:0;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:8px;min-width:190px;display:flex;flex-direction:column;gap:2px;z-index:60}
  .menu-panel[hidden]{display:none}
  .menu-panel a{padding:10px 14px;border-radius:8px;color:var(--ink-soft);font-weight:600;font-size:15px}
  .menu-panel a:hover{background:var(--cream);color:var(--ink)}
  @media(max-width:560px){
    .nav-phone{font-size:14px}
    .nav-cta{gap:9px}
    .btn{padding:12px 18px;font-size:14px}
  }

  /* HERO */
  .hero{position:relative;background:radial-gradient(1200px 600px at 70% -10%,rgba(207,0,0,.34),transparent 60%),radial-gradient(900px 500px at 10% 10%,rgba(255,90,60,.16),transparent 55%),var(--bg);color:#fff;overflow:hidden}
  .hero-inner{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:84px 0 96px}
  .hero h1{font-size:clamp(38px,5vw,60px);line-height:1.05;letter-spacing:-.03em;font-weight:800;margin:18px 0 18px}
  .hero h1 .grad{background:var(--brand-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
  .hero p.lead{font-size:19px;color:#c9cde3;max-width:560px}
  .hero-cta{display:flex;gap:14px;margin-top:30px;flex-wrap:wrap}
  .trust{margin-top:26px;color:#8a91b4;font-size:14px;display:flex;gap:22px;flex-wrap:wrap}
  .trust b{color:#fff}
  @media(max-width:900px){.hero-inner{grid-template-columns:1fr;padding:60px 0 70px}}

  /* Phone mock */
  .phone{justify-self:center;width:290px;background:#0c1330;border:1px solid rgba(255,255,255,.12);border-radius:30px;padding:16px;box-shadow:var(--shadow)}
  .phone .bar{height:26px;display:flex;align-items:center;gap:8px;color:#8a91b4;font-size:12px;padding:0 6px 6px}
  .bubble{padding:11px 14px;border-radius:14px;margin:8px 0;font-size:14px;max-width:85%}
  .b-in{background:#182046;color:#dfe3f5;border-bottom-left-radius:4px}
  .b-out{background:var(--brand-grad);color:#fff;margin-left:auto;border-bottom-right-radius:4px}
  .call-head{display:flex;align-items:center;gap:10px;padding:6px 6px 12px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:8px}
  .call-head .dot{width:9px;height:9px;border-radius:50%;background:#2ec77b;box-shadow:0 0 0 4px rgba(46,199,123,.18)}
  .call-head span{color:#c9cde3;font-size:13px;font-weight:600}

  /* SECTIONS */
  section{padding:88px 0}
  .section-head{text-align:center;max-width:680px;margin:0 auto 54px}
  .section-head h2{font-size:clamp(28px,3.6vw,42px);letter-spacing:-.02em;line-height:1.1;margin:14px 0 12px;font-weight:800}
  .section-head p{color:var(--ink-soft);font-size:18px}

  /* stats */
  .stats{background:linear-gradient(180deg,#0b1020,#0f1630);color:#fff}
  .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center}
  .stat{padding:20px}
  .stat .n{font-size:44px;font-weight:800;background:var(--brand-grad);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.02em}
  .stat .l{color:#aeb4d2;font-size:15px;margin-top:4px}
  @media(max-width:760px){.stat-grid{grid-template-columns:1fr;gap:8px}}

  /* steps */
  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
  .step{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:30px;position:relative;box-shadow:0 6px 24px -18px rgba(20,16,80,.4)}
  .step .num{width:44px;height:44px;border-radius:12px;background:var(--brand-grad);color:#fff;font-weight:800;display:grid;place-items:center;font-size:19px;margin-bottom:16px}
  .step h3{font-size:20px;margin-bottom:8px;letter-spacing:-.01em}
  .step p{color:var(--ink-soft);font-size:15.5px}
  @media(max-width:820px){.steps{grid-template-columns:1fr}}

  /* features */
  .features{background:#f7efd9}
  .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .feat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:26px}
  .feat .ico{width:46px;height:46px;border-radius:12px;background:rgba(207,0,0,.1);display:grid;place-items:center;font-size:22px;margin-bottom:14px}
  .feat h3{font-size:18px;margin-bottom:6px}
  .feat p{color:var(--ink-soft);font-size:15px}
  @media(max-width:820px){.feat-grid{grid-template-columns:1fr}}

  /* who */
  .chips{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:8px}
  .chip{background:#fff;border:1px solid var(--line);border-radius:999px;padding:12px 22px;font-weight:700;color:var(--ink);box-shadow:0 4px 16px -12px rgba(20,16,80,.4)}

  /* pricing */
  .pricing{background:linear-gradient(180deg,#0b1020,#141a38);color:#fff}
  .price-card{max-width:560px;margin:0 auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:40px;text-align:center;box-shadow:var(--shadow)}
  .price-card .tag{display:inline-block;background:var(--accent);color:#3a2c00;font-weight:800;font-size:13px;padding:6px 14px;border-radius:999px;margin-bottom:16px}
  .price-card .p{font-size:52px;font-weight:800;letter-spacing:-.02em}
  .price-card .p small{font-size:18px;color:#aeb4d2;font-weight:600}
  .price-list{text-align:left;max-width:360px;margin:22px auto 26px;color:#dfe3f5}
  .price-list li{list-style:none;padding:8px 0 8px 30px;position:relative}
  .price-list li:before{content:"✓";position:absolute;left:0;color:var(--brand-2);font-weight:800}

  /* faq */
  details{border:1px solid var(--line);border-radius:12px;padding:18px 22px;margin-bottom:14px;background:#fff}
  details summary{font-weight:700;cursor:pointer;font-size:17px;list-style:none;display:flex;justify-content:space-between;align-items:center}
  details summary::-webkit-details-marker{display:none}
  details summary:after{content:"+";font-size:24px;color:var(--brand);font-weight:400}
  details[open] summary:after{content:"–"}
  details p{color:var(--ink-soft);margin-top:12px;font-size:15.5px}

  /* CTA */
  .cta-final{background:var(--brand-grad);color:#fff;text-align:center}
  .cta-final h2{font-size:clamp(28px,3.6vw,42px);letter-spacing:-.02em;margin-bottom:14px;font-weight:800}
  .cta-final p{font-size:18px;opacity:.95;max-width:560px;margin:0 auto 28px}
  .cta-final .btn-primary{background:#fff;color:var(--brand)}

  /* footer */
  footer{background:#080c19;color:#8a91b4;padding:54px 0 40px;font-size:14.5px}
  .foot-top{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;padding-bottom:26px;border-bottom:1px solid rgba(255,255,255,.08)}
  .foot-top .logo{margin-bottom:10px}
  .foot-links{display:flex;gap:26px;flex-wrap:wrap}
  .foot-links a:hover{color:#fff}
  .foot-bot{padding-top:22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
`;

export default function LandingPage() {
  useEffect(() => {
    // tel: links only place a call on mobile. On desktop, reveal the number instead.
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
      || (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
    const NUMBER = '(941) 327-9667';
    document.querySelectorAll('.call-btn').forEach((btn: any) => {
      btn.addEventListener('click', (e: any) => {
        if (isMobile) return;
        e.preventDefault();
        if (btn.dataset.revealed) return;
        btn.dataset.revealed = '1';
        btn.textContent = '📞 ' + NUMBER;
      });
    });

    // header dropdown: toggle on click, close on link click / outside click
    const menuBtn = document.querySelector('.menu-btn');
    const menuPanel = document.querySelector('.menu-panel') as any;
    if (menuBtn && menuPanel) {
      const closeMenu = () => { menuPanel.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
      menuBtn.addEventListener('click', (e: any) => {
        e.stopPropagation();
        const willOpen = menuPanel.hidden;
        menuPanel.hidden = !willOpen;
        menuBtn.setAttribute('aria-expanded', String(willOpen));
      });
      menuPanel.querySelectorAll('a').forEach((a: any) => { a.addEventListener('click', closeMenu); });
      document.addEventListener('click', (e: any) => {
        if (!menuPanel.hidden && !e.target.closest('.menu')) closeMenu();
      });
    }

    document.getElementById('yr')!.textContent = new Date().getFullYear().toString();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header>
        <div className="wrap">
          <nav>
            <a className="logo" href="#top"><img src="/LOGO.png" alt="Biggify" /></a>
            <div className="nav-cta">
              <div className="menu">
                <button type="button" className="menu-btn" aria-label="Menu" aria-expanded="false">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
                </button>
                <div className="menu-panel" hidden>
                  <a href="#how">How it works</a>
                  <a href="#features">Features</a>
                  <a href="#pricing">Pricing</a>
                  <a href="#faq">FAQ</a>
                </div>
              </div>
              <a className="nav-phone" href="tel:+19413279667">📞 (941) 327-9667</a>
              <a className="btn btn-primary" href="#contact">Get a Free Demo</a>
            </div>
          </nav>
        </div>
      </header>

      <section className="hero" id="top" style={{padding:0}}>
        <div className="wrap">
          <div className="hero-inner">
            <div>
              <span className="eyebrow">AI Receptionist for Home Services</span>
              <h1>Never miss another <span className="grad">job</span> again.</h1>
              <p className="lead">Biggify answers every call, books the appointment, and instantly texts your customer a quick survey — so you show up prepared and never lose a lead to a missed call.</p>
              <div className="hero-cta">
                <a className="btn btn-primary" href="#contact">Get a Free Demo</a>
                <a className="btn btn-ghost call-btn" href="tel:+19413279667">📞 Call our receptionist</a>
              </div>
              <div className="trust">
                <span><b>24/7</b> call answering</span>
                <span><b>&lt;3 min</b> customer survey</span>
                <span><b>Books</b> straight to your calendar</span>
              </div>
            </div>
            <div className="phone">
              <div className="bar">9:41 &nbsp; ● ● ●</div>
              <div className="call-head"><span className="dot"></span><span>Incoming call — answered by Biggify</span></div>
              <div className="bubble b-in">Thanks for calling! I can get you booked. What's the issue you're having?</div>
              <div className="bubble b-out">My AC stopped blowing cold air.</div>
              <div className="bubble b-in">Got it. I have Tuesday 9–11 AM open — shall I book that?</div>
              <div className="bubble b-out">Yes please 👍</div>
              <div className="bubble b-in">You're booked! I just texted you 3 quick questions so the tech arrives ready.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="wrap">
          <div className="stat-grid">
            <div className="stat"><div className="n">62%</div><div className="l">of calls to small businesses go unanswered</div></div>
            <div className="stat"><div className="n">$1,200+</div><div className="l">average value of a single service job</div></div>
            <div className="stat"><div className="n">85%</div><div className="l">of missed callers won't call back — they call a competitor</div></div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2>Your front desk, fully automated</h2>
            <p>Biggify picks up when you can't — on the job, after hours, or when the phone's already ringing off the hook.</p>
          </div>
          <div className="steps">
            <div className="step"><div className="num">1</div><h3>Answers every call</h3><p>A professional AI receptionist greets every caller instantly, day or night — no voicemail, no hold music, no missed lead.</p></div>
            <div className="step"><div className="num">2</div><h3>Books the appointment</h3><p>It checks your availability and books the job straight into your calendar while the customer is still on the line.</p></div>
            <div className="step"><div className="num">3</div><h3>Texts a quick survey</h3><p>Right after, the caller gets a short text — address, issue, preferred time — so you have everything you need before you call back.</p></div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Features</span>
            <h2>Built for the trades</h2>
            <p>Everything a busy home-service business needs to capture every lead — nothing it doesn't.</p>
          </div>
          <div className="feat-grid">
            <div className="feat"><div className="ico">📞</div><h3>24/7 call answering</h3><p>Never send a paying customer to voicemail again. Biggify answers on the first ring, around the clock.</p></div>
            <div className="feat"><div className="ico">📅</div><h3>Instant booking</h3><p>Appointments drop straight into your calendar. No back-and-forth, no double-booking.</p></div>
            <div className="feat"><div className="ico">💬</div><h3>Smart SMS survey</h3><p>A 3-question text captures the job details so your team shows up ready to work.</p></div>
            <div className="feat"><div className="ico">🔔</div><h3>Instant alerts</h3><p>Get a text and email the second a new job comes in — with all the details attached.</p></div>
            <div className="feat"><div className="ico">📊</div><h3>Your own dashboard</h3><p>Every call, booking, and survey in one clean, branded place. It's your tool, your brand.</p></div>
            <div className="feat"><div className="ico">📵</div><h3>Catches missed calls</h3><p>Forward your existing line so calls you can't grab roll to Biggify — you keep your number.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Who it's for</span>
            <h2>Made for home service pros</h2>
            <p>If a missed call means a lost job, Biggify pays for itself the first week.</p>
          </div>
          <div className="chips">
            <span className="chip">HVAC</span><span className="chip">Plumbing</span><span className="chip">Electrical</span>
            <span className="chip">Roofing</span><span className="chip">Landscaping</span><span className="chip">Pest Control</span>
            <span className="chip">Garage Doors</span><span className="chip">Cleaning</span><span className="chip">Handyman</span>
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="section-head" style={{color:'#fff'}}>
            <span className="eyebrow" style={{color:'#fff',background:'rgba(255,255,255,.12)'}}>Pricing</span>
            <h2 style={{color:'#fff'}}>Simple, honest pricing</h2>
            <p style={{color:'#c9cde3'}}>One missed job usually costs more than a whole month of Biggify.</p>
          </div>
          <div className="price-card">
            <span className="tag">⭐ Founding Client Offer</span>
            <div className="p">$<span>147</span><small>/mo</small></div>
            <ul className="price-list">
              <li>24/7 AI call answering</li>
              <li>Appointment booking to your calendar</li>
              <li>Automated SMS customer survey</li>
              <li>Instant text &amp; email lead alerts</li>
              <li>Your own branded dashboard</li>
              <li>Setup &amp; onboarding included</li>
            </ul>
            <a className="btn btn-primary" href="#contact" style={{background:'#fff',color:'var(--brand)'}}>Claim your demo</a>
            <p style={{color:'#c9cde3',fontSize:'14.5px',marginTop:'18px'}}>Need something different? <a href="#contact" style={{color:'#fff',textDecoration:'underline'}}>Book a call</a> and we'll build a plan around your business.</p>
            <p style={{color:'#8a91b4',fontSize:'13.5px',marginTop:'10px'}}>Limited founding-client spots. Lock in this rate before we raise prices.</p>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="wrap" style={{maxWidth:'820px'}}>
          <div className="section-head">
            <span className="eyebrow">FAQ</span>
            <h2>Questions, answered</h2>
          </div>
          <details open><summary>Do I have to change my phone number?</summary><p>No. You keep your existing number. You simply forward calls you can't answer to Biggify, so the calls you'd otherwise miss get caught — while you still take every call you can.</p></details>
          <details><summary>Will it sound like a robot?</summary><p>No. Biggify uses a natural, professional AI voice that greets callers, answers common questions, and books the job like a great front-desk receptionist would.</p></details>
          <details><summary>How does the text survey work?</summary><p>After a call, the customer receives a short text with a few quick questions so you have the address, the issue, and their preferred time before you follow up. Customers can reply STOP at any time to opt out.</p></details>
          <details><summary>How fast can I get set up?</summary><p>Most businesses are live within a few days. We handle the setup and walk you through everything.</p></details>
          <details><summary>What does it cost me if I miss the value?</summary><p>Nothing to lose — we start with a free demo using your real business scenario so you can hear it before you commit.</p></details>
        </div>
      </section>

      <section className="cta-final" id="contact">
        <div className="wrap">
          <h2>Hear it answer your phone today</h2>
          <p>Call our receptionist right now and hear it for yourself — or book a free 15-minute demo below.</p>
          <div style={{display:'flex',gap:'14px',justifyContent:'center',flexWrap:'wrap',marginBottom:'36px'}}>
            <a className="btn btn-primary call-btn" href="tel:+19413279667" style={{background:'#fff',color:'var(--brand)'}}>📞 Call our receptionist</a>
          </div>
          <div className="calendly-inline-widget" data-url="https://calendly.com/boogmasterjones/biggify-appointment?hide_event_type_details=1&hide_gdpr_banner=1" style={{minWidth:'320px',height:'700px',background:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'var(--shadow)'}}></div>
          <script async src="https://assets.calendly.com/assets/external/widget.js"></script>
          <p style={{marginTop:'22px',fontSize:'15px'}}>Or email us: <a href="mailto:gobiggify@gmail.com" style={{color:'#fff',textDecoration:'underline'}}>gobiggify@gmail.com</a></p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <a className="logo" href="#top"><img src="/LOGO-light.png" alt="Biggify" style={{height:'38px'}} /></a>
              <p style={{maxWidth:'320px',marginTop:'10px'}}>AI receptionist &amp; automation for home service businesses. Never miss another job.</p>
            </div>
            <div className="foot-links">
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
              <a href="/privacy.html">Privacy Policy</a>
              <a href="mailto:gobiggify@gmail.com">Contact</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© <span id="yr"></span> Biggify. All rights reserved. Biggify is a service of <strong>Rock Solid Tile</strong>.</span>
            <span>Made for the trades.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
