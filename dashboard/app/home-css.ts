// The homepage layer of the redesign (ported from BIGGIFY WEBSITE/site.css). Rendered as an inline <style> by app/page.tsx, right
// after a <link> to /tools/tools.css (the shared design system), so both leave the page when it unmounts and none of it
// reaches the client app or the plain pages on a client-side navigation.
export const homeCss = `
/* gobiggify.com homepage (2026-11-13, "option B"): the redesign's look (truck-door lettering on cream paper, ink bands,
   signal red, Archivo + DM Serif Display) brought onto the live Next homepage. The design system itself is the same file
   the free tools and guides load (public/tools/tools.css), so all three stay one look. Everything below is the homepage
   layer, ported from the redesign's site.css (BIGGIFY WEBSITE/site.css) plus the live-only sections (how we work, the
   case study). */

body{overflow-x:clip}

/* ---------- reveals: quick and early. Hidden only when scripting is on, so a no-JS visit still sees everything. ---------- */
@media (scripting:enabled){
  .bz .rv{opacity:0;transform:translate3d(0,16px,0);transition:opacity .5s var(--ease),transform .5s var(--ease);transition-delay:var(--rd,0s)}
  .bz .rv.in{opacity:1;transform:none}
}

/* ---------- header extras ---------- */
.nav-links{display:none;align-items:center;gap:2px}
.nav-phone svg{width:16px;height:16px;flex:none;color:var(--brand)}
.nav-quote,.nav-signin{display:none}
.nav-signin{min-height:44px;padding:8px 15px;border-radius:999px;font-weight:800;font-size:15px;text-decoration:none;color:var(--ink);box-shadow:inset 0 0 0 1.5px rgba(13,18,36,.16);align-items:center}
.nav-signin:hover{color:var(--brand);box-shadow:inset 0 0 0 1.5px var(--brand)}
.menu-btn{display:inline-grid;place-content:center;gap:5px;width:46px;height:46px;border:none;border-radius:13px;background:var(--ink);cursor:pointer;box-shadow:0 2px 0 #000,0 10px 18px -12px rgba(13,18,36,.7)}
.menu-btn span{display:block;width:20px;height:2.5px;border-radius:2px;background:#fff;transition:transform .25s var(--ease),opacity .2s}
.menu-btn[aria-expanded=true] span:nth-child(1){transform:translateY(7.5px) rotate(45deg)}
.menu-btn[aria-expanded=true] span:nth-child(2){opacity:0}
.menu-btn[aria-expanded=true] span:nth-child(3){transform:translateY(-7.5px) rotate(-45deg)}
.menu-panel{position:absolute;left:0;right:0;top:100%;background:var(--paper);border-bottom:1px solid var(--line);box-shadow:0 40px 60px -30px rgba(13,18,36,.55);padding:16px 0 24px;max-height:calc(100svh - 64px);overflow:auto;animation:menu-in .28s var(--ease)}
@keyframes menu-in{from{opacity:0;transform:translateY(-8px)}}
.menu-label{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:8px 0 8px}
.menu-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.menu-grid a{display:flex;align-items:center;min-height:48px;padding:10px 14px;border-radius:12px;background:var(--cream);border:1px solid var(--line);font-weight:700;font-size:15px;line-height:1.2;text-decoration:none;color:var(--ink)}
.menu-grid a:hover{border-color:var(--brand);color:var(--brand)}
.bz.menu-open::after{content:"";position:fixed;inset:0;background:rgba(10,13,23,.5);z-index:40}
@media(min-width:1080px){
  .nav-links{display:flex}
  .menu-btn,.menu-panel{display:none!important}
  .nav-quote,.nav-signin{display:inline-flex}
}
@media(min-width:1080px) and (max-width:1279px){.nav-phone{display:none}}
@media(max-width:600px){.nav-phone{display:none}}

/* ---------- homepage hero ---------- */
.hero-home .hero-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:40px;padding:36px 0 48px;align-items:center}
.hero-home h1{font-size:clamp(52px,16.4vw,92px);line-height:.92;margin:14px 0 18px;max-width:none}
.hero-home h1 .l{display:block}
.hero-home h1 .grad{font-size:.56em;line-height:1.1;margin-top:.14em;white-space:nowrap}
.hero-home p.lead{max-width:560px}
.hero-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.btn-sweep{overflow:hidden}
.btn-sweep::after{content:"";position:absolute;top:0;bottom:0;left:0;width:46%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.34),transparent);transform:translate3d(-130%,0,0) skewX(-18deg);animation:sweep 5.5s var(--ease) 1.4s infinite}
@keyframes sweep{0%{transform:translate3d(-130%,0,0) skewX(-18deg)}22%,100%{transform:translate3d(330%,0,0) skewX(-18deg)}}
.hero.is-off .btn-sweep::after{animation-play-state:paused}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.chips li{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;font-size:13.5px;font-weight:700;color:var(--on-dark);background:var(--glass-fill);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),inset 0 1px 0 rgba(255,255,255,.18)}
.chips li::before{content:"";width:9px;height:12px;flex:none;background:var(--accent);-webkit-mask:var(--arrow) center/contain no-repeat;mask:var(--arrow) center/contain no-repeat}
.hero-visual{display:grid;justify-items:center}
@media(max-width:699px){
  .hero-home .hero-copy{min-height:calc(100svh - 64px - 36px);display:flex;flex-direction:column;justify-content:center}
  .hero-cta .btn{width:100%}
}
@media(min-width:960px){
  .hero-home .hero-grid{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:56px;padding:64px 0 80px;min-height:min(820px,calc(100svh - 64px))}
  .hero-home h1{font-size:clamp(72px,7.6vw,104px)}
}
@media(max-width:420px){.btn-lg{padding-inline:14px;font-size:15.5px;letter-spacing:.035em;gap:8px}}

/* ---------- THE SIGNATURE: a missed call gets answered and lands as a text ---------- */
.callsig{width:min(390px,100%);perspective:1100px}
.device{position:relative;border-radius:34px;padding:16px 18px 20px;border:1.5px solid transparent;
  background:linear-gradient(180deg,#191e33,#0e1222) padding-box,var(--glass-edge) border-box;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 50px 90px -40px rgba(0,0,0,.9),0 0 80px -20px rgba(225,26,26,.42);transition:transform .5s var(--ease)}
.device-top{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 14px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,.09)}
.device-tag{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--on-dark-muted)}
.device-dot{width:46px;height:6px;border-radius:6px;background:rgba(255,255,255,.14)}
.cs-list{list-style:none;position:relative;display:grid;gap:4px}
.cs-list::before{content:"";position:absolute;left:21px;top:30px;bottom:74px;width:2px;border-radius:2px;background:linear-gradient(180deg,#ff5a4d,#ff5a4d 46%,var(--good-hi) 62%,var(--good-hi));opacity:.5;transform-origin:50% 0}
.cs{position:relative;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start;padding:10px 0}
.cs b{display:block;font-size:16px;line-height:1.25;color:#fff;letter-spacing:-.005em}
.cs small{display:block;font-size:14px;line-height:1.4;color:var(--on-dark-soft);margin-top:2px}
.cs-ico{position:relative;z-index:1;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;background:#232a45;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 0 4px #121628}
.cs-ico svg{width:20px;height:20px}
.cs-ring .cs-ico{background:linear-gradient(140deg,#ff5a4d,#cf0000)}
.cs-ring .cs-ico::after{content:"";position:absolute;inset:-2px;border-radius:16px;border:2px solid #ff6a5c;opacity:0}
.cs-miss .cs-ico{background:#2a2231;color:#ff8f86}
.cs-ai .cs-ico{background:linear-gradient(140deg,#23b877,#0f7a4a);display:flex;align-items:center;justify-content:center;gap:3px}
.cs-ai .cs-ico i{display:block;width:3.5px;border-radius:3px;background:#fff;height:10px;transform-origin:50% 50%}
.cs-ai .cs-ico i:nth-child(2){height:20px}.cs-ai .cs-ico i:nth-child(3){height:14px}.cs-ai .cs-ico i:nth-child(4){height:7px}
.cs-text .cs-ico{background:linear-gradient(140deg,#ffdc85,#f2b030);color:#231a00}
.sms{display:block;margin-top:10px;border-radius:16px 16px 16px 5px;padding:12px 14px 13px;background:linear-gradient(180deg,#fffefb,#fff4d9);color:var(--ink);box-shadow:inset 0 1px 0 #fff,0 18px 30px -16px rgba(0,0,0,.8),0 0 0 1px rgba(255,209,102,.5)}
.sms-head{display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.sms-body{display:block;font-size:14.5px;line-height:1.45;color:var(--ink-soft)}
.sms-body strong{display:block;font-size:16px;color:var(--ink)}
.callsig figcaption{margin-top:14px;font-size:13.5px;line-height:1.45;color:var(--on-dark-muted);text-align:center}
/* the one-time play: hidden while waiting (only when scripting is on), "play" runs it; the resting state is the markup */
@media (scripting:enabled){
  .callsig:not(.play):not(.done) .cs,.callsig:not(.play):not(.done) .cs-list::before{opacity:0}
}
.callsig.play .cs{animation:cs-in .55s var(--ease) both;animation-delay:var(--d)}
.callsig.play .cs-list::before{animation:cs-rail 4s linear .3s both}
.callsig.play .cs-ring .cs-ico{animation:cs-shake .5s ease-in-out .3s 3}
.callsig.play .cs-ring .cs-ico::after{animation:cs-pulse .7s ease-out .25s 2}
.callsig.play .cs-ai .cs-ico i{animation:cs-wave .5s ease-in-out 2.9s 3}
.callsig.play .cs-ai .cs-ico i:nth-child(2){animation-delay:3s}.callsig.play .cs-ai .cs-ico i:nth-child(3){animation-delay:3.08s}.callsig.play .cs-ai .cs-ico i:nth-child(4){animation-delay:2.96s}
.callsig.play .sms{animation:cs-sms .6s var(--ease) 4.35s both}
@keyframes cs-in{from{opacity:0;transform:translate3d(0,12px,0)}to{opacity:1;transform:none}}
@keyframes cs-rail{from{opacity:.5;transform:scaleY(0)}to{opacity:.5;transform:scaleY(1)}}
@keyframes cs-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}
@keyframes cs-pulse{from{opacity:.9;transform:scale(1)}to{opacity:0;transform:scale(1.55)}}
@keyframes cs-wave{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.4)}}
@keyframes cs-sms{from{opacity:0;transform:translate3d(0,14px,0) scale(.94)}to{opacity:1;transform:none}}

/* ---------- section bands ---------- */
.bz main section{padding:64px 0}
@media(min-width:900px){.bz main section{padding:104px 0}}
.bz main section.hero{padding:0}
.band{position:relative;isolation:isolate}
.band::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none}
.band-dots{background:linear-gradient(180deg,#fff8e8,var(--cream))}
.band-dots::before{background-image:radial-gradient(rgba(13,18,36,.11) 1.2px,transparent 1.3px);background-size:22px 22px;-webkit-mask-image:linear-gradient(115deg,#000,transparent 55%);mask-image:linear-gradient(115deg,#000,transparent 55%)}
.band-rules{background:linear-gradient(180deg,var(--cream),#fdf1d6)}
.band-rules::before{background-image:repeating-linear-gradient(180deg,transparent 0 39px,rgba(160,110,30,.13) 39px 40px);-webkit-mask-image:linear-gradient(245deg,#000,transparent 60%);mask-image:linear-gradient(245deg,#000,transparent 60%)}
.band-tint{background:radial-gradient(900px 420px at 100% 0,rgba(207,0,0,.07),transparent 65%),radial-gradient(700px 420px at 0 100%,rgba(255,190,70,.2),transparent 65%),var(--cream-2)}
.band-tint::before{background-image:repeating-linear-gradient(135deg,transparent 0 17px,rgba(13,18,36,.035) 17px 18px)}
.dark{color:var(--on-dark);background:radial-gradient(900px 520px at 88% 0,rgba(225,26,26,.36),transparent 62%),radial-gradient(700px 480px at 0 100%,rgba(207,0,0,.2),transparent 60%),linear-gradient(180deg,#0a0d17,#111528)}
.dark.band::before{background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(80% 70% at 50% 40%,#000,transparent);mask-image:radial-gradient(80% 70% at 50% 40%,#000,transparent)}
.band-red{color:#fff;background:radial-gradient(800px 500px at 0 0,rgba(255,130,80,.5),transparent 60%),radial-gradient(900px 600px at 100% 100%,rgba(70,0,0,.7),transparent 60%),linear-gradient(135deg,#e21c1c,#b00000 60%,#8d0000)}

/* headings */
.section-head{margin-bottom:36px}
.section-head h2,.split h2,.proof h2,.contact-copy h2{font-family:var(--display);font-weight:900;font-stretch:66%;text-transform:uppercase;font-size:clamp(34px,7.6vw,60px);line-height:.98;letter-spacing:.005em;margin:12px 0 14px}
.serif-accent{font-size:.84em;white-space:normal}
.serif-accent.blk{display:block;margin-top:.05em}
a[href^="tel:"]{white-space:nowrap}
.band .serif-accent{background:linear-gradient(100deg,#e11a1a,#b00000);-webkit-background-clip:text;background-clip:text}
.dark .serif-accent{background:linear-gradient(100deg,#ff8f7d,#ff4a3d 46%,#ffc46b);-webkit-background-clip:text;background-clip:text}
.band-red .serif-accent{background:linear-gradient(100deg,#fff1cf,#ffd166);-webkit-background-clip:text;background-clip:text}
.section-head p{font-size:18px;max-width:640px}
.dark .section-head h2{color:#fff}
.dark .section-head p{color:var(--on-dark-soft)}
.head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;max-width:none}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
@media(max-width:560px){.cta-row .btn,.actions .btn{width:100%}}

/* pointer glare for cards (desktop pointers only) */
.fx{--mx:50%;--my:0%}
.fx::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;background:radial-gradient(340px circle at var(--mx) var(--my),rgba(255,255,255,.55),transparent 62%);mix-blend-mode:soft-light}
.dark .fx::after,.fx.on-dark::after{background:radial-gradient(340px circle at var(--mx) var(--my),rgba(255,255,255,.2),transparent 62%);mix-blend-mode:normal}
@media(hover:hover){
  .fx{transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
  .fx:hover{transform:translate3d(0,-5px,0)}
  .fx:hover::after{opacity:1}
  .card.fx:hover{box-shadow:inset 0 1px 0 #fff,0 40px 60px -34px rgba(120,20,0,.5),0 4px 8px -4px rgba(60,30,8,.14)}
}

/* ---------- our work: a carousel of before/after sliders (pictures only: no names, no links) ---------- */
.car-nav{display:none;gap:10px;flex:none}
@media(min-width:760px){.car-nav{display:flex}}
.car-btn{width:52px;height:52px;border-radius:15px;border:none;cursor:pointer;display:grid;place-items:center;color:#fff;background:var(--ink);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 #000;transition:transform .18s var(--ease),background-color .18s}
.car-btn:hover{background:var(--brand);transform:translateY(-2px)}
.car-btn:active{transform:translateY(2px)}
.car-btn[disabled]{opacity:.35;cursor:default;transform:none;background:var(--ink)}
.car-btn svg{width:22px;height:22px}
.work-track{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:8px max(20px,calc((100% - 1140px)/2)) 44px;scroll-padding-inline:max(20px,calc((100% - 1140px)/2));-webkit-overflow-scrolling:touch}
.work-track::-webkit-scrollbar{display:none}
.work-card{flex:0 0 min(86vw,680px);scroll-snap-align:start;border-radius:22px;border:1.5px solid transparent;background:var(--card-fill) padding-box,var(--card-edge) border-box;box-shadow:inset 0 1px 0 #fff,var(--card-shadow);overflow:hidden}
.cmp{position:relative;aspect-ratio:16/10;background:#1a1f33;overflow:hidden;border-radius:20px 20px 0 0;--pos:50%}
.cmp img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;-webkit-user-drag:none;user-select:none}
.cmp-before{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--pos)) 0 0)}
.cmp .tag{position:absolute;top:12px;font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:6px 11px;border-radius:8px;color:#fff;pointer-events:none}
.cmp .tag-before{left:12px;background:rgba(13,18,36,.82)}
.cmp .tag-after{right:12px;background:var(--brand-grad);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 2px 0 #7c0000}
.cmp.single .tag-after{right:auto;left:12px}
.cmp-handle{position:absolute;top:0;bottom:0;left:var(--pos);width:3px;margin-left:-1.5px;background:#fff;box-shadow:0 0 0 1px rgba(13,18,36,.25),0 0 18px rgba(0,0,0,.5);pointer-events:none}
.cmp-handle::after{content:"";position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;border:3px solid #fff;box-shadow:0 10px 22px -6px rgba(0,0,0,.7);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 7l-5 5 5 5M15 7l5 5-5 5'/%3E%3C/svg%3E"),var(--brand-grad);background-size:24px,cover;background-position:center;background-repeat:no-repeat}
.cmp input[type=range]{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize;touch-action:pan-y;-webkit-appearance:none;appearance:none}
.cmp input[type=range]:focus-visible ~ .cmp-handle,.cmp:focus-within .cmp-handle{background:var(--accent)}
.cmp:focus-within{outline:3px solid #1a56db;outline-offset:-3px}
.work-card .meta{padding:14px 20px 16px}
.work-card .trade{display:block;color:var(--ink-soft);font-size:15px;font-weight:700;line-height:1.4}
.car-hint{font-size:13.5px;color:var(--muted);margin-top:-22px}

/* ---------- free tools ---------- */
.fam-grid{display:grid;gap:16px}
@media(min-width:900px){.fam-grid{grid-template-columns:1.1fr 1fr 1fr;align-items:start}}
.fam{position:relative;border-radius:22px;padding:24px 20px 14px;border:1.5px solid transparent;background:linear-gradient(180deg,rgba(28,34,58,.92),rgba(16,20,38,.92)) padding-box,var(--glass-edge) border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 40px 60px -40px #000}
.fam h3{font-family:var(--display);font-stretch:70%;font-weight:900;text-transform:uppercase;font-size:26px;line-height:1.05;letter-spacing:.01em;color:#fff}
.fam > p{color:var(--on-dark-soft);font-size:15px;margin:6px 0 12px}
.fam ul{list-style:none}
.fam li + li{border-top:1px solid rgba(255,255,255,.09)}
.fam li a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;padding:10px 4px;text-decoration:none;color:#fff;transition:transform .2s var(--ease)}
.fam li b{display:block;font-size:16.5px;line-height:1.25}
.fam li small{display:block;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#ff9d92;margin-top:3px}
.fam li svg{width:36px;height:36px;padding:9px;border-radius:11px;flex:none;color:#fff;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);transition:background-color .2s,transform .2s var(--ease)}
.fam li a:hover{transform:translateX(3px)}
.fam li a:hover svg{background:var(--brand)}

/* ---------- the three leaks ---------- */
.leak{display:grid;gap:20px}
@media(min-width:900px){.leak{grid-template-columns:repeat(3,1fr);gap:24px}}
.leak .card{padding:26px 24px 22px;display:flex;flex-direction:column}
.leak .stage{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}
.leak .stage span{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.leak .stage b{font-family:var(--display);font-stretch:66%;font-weight:900;font-size:72px;line-height:.8;color:transparent;background:var(--brand-grad);-webkit-background-clip:text;background-clip:text}
.leak h3{font-size:22px;letter-spacing:-.015em;line-height:1.2;margin:8px 0 10px}
.leak p{color:var(--ink-soft);font-size:16px;flex:1}
.leak .fix{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:18px;padding-top:16px;border-top:1px dashed var(--line-strong)}
.leak .fix span{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-right:2px}
.leak .fix a{display:inline-flex;align-items:center;min-height:44px;padding:6px 12px;border-radius:9px;font-size:14px;font-weight:800;text-decoration:none;color:var(--brand);background:rgba(207,0,0,.07);box-shadow:inset 0 0 0 1px rgba(207,0,0,.22)}
.leak .fix a:hover{background:var(--brand);color:#fff}

/* ---------- services ---------- */
.svc-grid{display:grid;gap:14px}
@media(min-width:620px){.svc-grid{grid-template-columns:1fr 1fr;gap:20px}}
@media(min-width:1040px){.svc-grid{grid-template-columns:repeat(4,1fr)}}
.svc{display:flex;flex-direction:column;text-decoration:none;padding:24px 22px 20px}
.svc .ico{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;color:var(--brand);background:linear-gradient(160deg,#fff,#ffe9e2);box-shadow:inset 0 0 0 1px rgba(207,0,0,.2),0 3px 0 rgba(207,0,0,.22);margin-bottom:16px}
.svc .ico svg{width:26px;height:26px}
.svc.hot .ico{color:#fff;background:var(--brand-grad);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 3px 0 #7c0000}
.svc h3{font-size:20px;letter-spacing:-.015em;line-height:1.2;margin-bottom:8px}
.svc p{color:var(--ink-soft);font-size:15.5px;flex:1}
.svc .more{display:inline-flex;align-items:center;gap:6px;margin-top:16px;color:var(--brand);font-weight:800;font-size:14.5px}
.svc .more svg{width:16px;height:16px;transition:transform .2s var(--ease)}
.svc:hover .more svg{transform:translateX(4px)}
@media(max-width:619px){
  .svc{display:grid;grid-template-columns:52px 1fr;column-gap:16px;padding:18px}
  .svc .ico{grid-row:1 / span 3;margin:0}
  .svc .more{margin-top:10px}
}

/* ---------- split sections ---------- */
.split{display:grid;gap:36px;align-items:center}
@media(min-width:940px){.split{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:64px}.split.rev > :first-child{order:0}}
@media(max-width:939px){.split.rev > :first-child{order:2}}
.split p{color:var(--ink-soft);font-size:17px}
.split .lead{font-size:18px;margin-bottom:16px}
.split .actions{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap;align-items:center}
.aside{margin-top:18px}
.checks{list-style:none;margin-top:8px}
.checks li{padding:9px 0 9px 34px;position:relative;color:var(--ink-soft);font-size:16px;line-height:1.5}
.checks li::before{content:"";position:absolute;left:0;top:11px;width:22px;height:22px;border-radius:7px;background:var(--brand) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.500l4.500 4.500L19 7.500'/%3E%3C/svg%3E") center/13px no-repeat;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 2px 0 #7c0000}
.checks li b{color:var(--ink)}
.card-label{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.included{padding:26px 22px}
@media(min-width:700px){.included{padding:34px}}

/* a browser frame around a client site picture (no address shown) */
.browser{position:relative;border-radius:20px;border:1.5px solid transparent;background:var(--card-fill) padding-box,var(--card-edge) border-box;box-shadow:inset 0 1px 0 #fff,var(--shadow);overflow:hidden}
.browser-bar{display:flex;align-items:center;gap:7px;padding:12px 14px;background:linear-gradient(180deg,#1b2136,#111528)}
.browser-bar i{width:10px;height:10px;border-radius:50%;background:#ff5a4d}
.browser-bar i:nth-child(2){background:#ffd166}.browser-bar i:nth-child(3){background:#3ddc97}
.browser img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;object-position:top}
.browser-meta{padding:14px 18px;color:var(--ink-soft);font-size:15px;font-weight:700}

/* how a post is laid out */
.post{position:relative;border-radius:22px;padding:20px;border:1.5px solid transparent;color:var(--on-dark);background:linear-gradient(180deg,#191e33,#0e1222) padding-box,var(--glass-edge) border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),var(--shadow)}
.post-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.post-av{flex:none;width:42px;height:42px;border-radius:50%;background:var(--brand-grad);display:grid;place-items:center;font-weight:900;font-size:14px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
.post-head b{display:block;font-size:15px;color:#fff}
.post-head div span{display:block;font-size:12.5px;color:var(--on-dark-muted)}
.post-shots{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.ps{aspect-ratio:1;border-radius:14px;display:grid;place-items:center;text-align:center;padding:10px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border:1.5px dashed rgba(255,255,255,.26);color:var(--on-dark-muted);background:rgba(255,255,255,.04)}
.ps-after{border-color:rgba(255,120,100,.7);color:#ffb3a8;background:rgba(207,0,0,.16)}
.post p{color:#dfe3f5;font-size:15px}
.post-foot{display:flex;gap:20px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);color:var(--on-dark-muted);font-size:13px;font-weight:700}

/* ---------- stats (the two sourced numbers) ---------- */
.stats{position:relative;padding:48px 0}
.stat-grid{display:grid;gap:8px}
@media(min-width:760px){.stat-grid{grid-template-columns:repeat(2,1fr);gap:24px;max-width:900px}.stats{padding:64px 0}}
.stat .src{display:block;margin-top:6px;font-size:12px;letter-spacing:0;text-transform:none;opacity:.6;font-weight:500}
.stat{padding:16px 4px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:16px}
@media(min-width:760px){.stat{display:block;text-align:left;padding:8px 24px;border-left:2px solid rgba(255,90,77,.5)}}
.stat .n{font-family:var(--display);font-stretch:66%;font-weight:900;font-size:clamp(52px,7vw,84px);line-height:.9;min-width:150px;color:transparent;background:linear-gradient(120deg,#ff8f7d,#ff3d30 55%,#ffb35c);-webkit-background-clip:text;background-clip:text}
.stat .l{color:var(--on-dark-soft);font-size:15.5px;line-height:1.45;margin-top:6px;max-width:300px}
@media(max-width:420px){.stat{grid-template-columns:1fr;gap:4px}.stat .n{min-width:0}}
.stat-kicker{margin:28px 0 0;font-family:var(--display);font-weight:800;font-size:clamp(22px,3vw,32px);line-height:1.15;color:#fff}
@media(min-width:760px){.stat-kicker{padding-left:24px}}

/* ---------- example call ---------- */
.chat{position:relative;justify-self:center;width:min(380px,100%);border-radius:30px;padding:18px;border:1.5px solid transparent;color:#fff;background:linear-gradient(180deg,#191e33,#0e1222) padding-box,var(--glass-edge) border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),var(--shadow)}
.chat-head{display:flex;align-items:center;gap:10px;padding:4px 6px 14px;border-bottom:1px solid rgba(255,255,255,.09);margin-bottom:10px;color:var(--on-dark-soft);font-size:13px;font-weight:700}
.chat-head .dot{width:9px;height:9px;border-radius:50%;background:var(--good-hi);box-shadow:0 0 0 4px rgba(61,220,151,.18)}
.bubble{padding:11px 14px;border-radius:16px;margin:8px 0;font-size:14.5px;line-height:1.45;max-width:86%}
.b-in{background:#232a45;color:#e6e9f6;border-bottom-left-radius:5px}
.b-out{background:var(--brand-grad);color:#fff;margin-left:auto;width:fit-content;border-bottom-right-radius:5px;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}

/* ---------- the case study ($16k): a trade and an area only, never a name or a link ---------- */
.proof{display:grid;gap:24px;padding:24px;align-items:center}
@media(min-width:900px){.proof{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:48px;padding:36px}}
.proof-shot{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:16/10;background:#1a1f33;box-shadow:0 0 0 1px rgba(13,18,36,.1),var(--shadow)}
.proof-shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.proof-shot .chip{position:absolute;left:12px;bottom:12px;font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:6px 11px;border-radius:8px;background:rgba(13,18,36,.82);color:#fff}
.proof .who{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.proof-stat{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:8px 0 6px}
.proof-stat b{font-family:var(--display);font-stretch:62%;font-weight:900;font-size:clamp(84px,12vw,140px);line-height:.85;color:transparent;background:var(--brand-grad);-webkit-background-clip:text;background-clip:text}
.proof-stat span{font-size:20px;font-weight:800;color:var(--ink)}
.proof p{color:var(--ink-soft);font-size:17px}
.proof .actions{display:flex;gap:12px;margin-top:22px;flex-wrap:wrap}
.proof-more{margin-top:18px;color:var(--muted);font-size:15px}

/* ---------- how we work with you ---------- */
.how-grid{display:grid;gap:40px;align-items:start}
@media(min-width:940px){.how-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:56px}}
.timeline{list-style:none;position:relative;padding-left:40px}
.timeline::before{content:"";position:absolute;left:13px;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--line-strong)}
.timeline::after{content:"";position:absolute;left:13px;top:8px;width:3px;height:0;border-radius:3px;background:var(--brand-grad);transition:height 2s var(--ease)}
.timeline.in::after{height:calc(100% - 16px)}
@media (scripting:none){.timeline::after{height:calc(100% - 16px)}}
.timeline li{position:relative;padding:0 0 30px}
.timeline li:last-child{padding-bottom:0}
.timeline li::before{content:"";position:absolute;left:-37px;top:4px;width:22px;height:22px;border-radius:7px;background:var(--paper);box-shadow:inset 0 0 0 2px var(--line-strong);transition:background-color .4s,box-shadow .4s}
.timeline.in li::before{background:var(--brand);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 2px 0 #7c0000}
.timeline.in li:nth-child(2)::before{transition-delay:.5s}.timeline.in li:nth-child(3)::before{transition-delay:1s}.timeline.in li:nth-child(4)::before{transition-delay:1.5s}
.timeline .when{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)}
.timeline h3{font-family:var(--display);font-stretch:70%;font-weight:900;text-transform:uppercase;font-size:28px;line-height:1.05;letter-spacing:.01em;margin:4px 0 6px}
.timeline p{color:var(--ink-soft);font-size:16px}
.timeline p b{color:var(--ink)}
.value{padding:24px}
@media(min-width:700px){.value{padding:30px}}
.value h3{font-family:var(--display);font-stretch:70%;font-weight:900;text-transform:uppercase;font-size:28px;line-height:1.05;margin:8px 0 14px}
.value .rows{border-top:1px solid var(--line)}
.value .row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--line);font-size:15px;color:var(--ink-soft)}
.value .row b{color:var(--ink)}
.value .row .v{font-weight:800;color:var(--brand);white-space:nowrap;font-variant-numeric:tabular-nums}
.math{margin-top:18px;padding:18px 20px;border-radius:16px;color:var(--on-dark);background:radial-gradient(400px 200px at 100% 0%,rgba(225,26,26,.4),transparent 60%),linear-gradient(180deg,#141a2e,#0b0e1a);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.math .label{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--on-dark-muted)}
.math .line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.1);font-size:15px;color:#dfe3f5}
.math .line:last-of-type{border-bottom:0}
.math .line b{white-space:nowrap;font-family:var(--display);font-stretch:70%;font-weight:900;font-size:26px;color:transparent;background:linear-gradient(120deg,#ffd166,#ff8a3d 60%,#ff6b6b);-webkit-background-clip:text;background-clip:text}
.math small{display:block;color:var(--on-dark-muted);font-size:12.5px;margin-top:10px}
.fit{margin-top:44px;display:grid;gap:24px;align-items:center;border-left:6px solid var(--brand)}
@media(min-width:900px){.fit{grid-template-columns:1fr 1fr;gap:40px}}
.fit h3{font-family:var(--display);font-stretch:70%;font-weight:900;text-transform:uppercase;font-size:32px;line-height:1.02;margin:8px 0 10px}
.fit p{color:var(--ink-soft);font-size:16px}
.fit .crit{list-style:none;display:grid;gap:14px}
.fit .crit li{display:grid;grid-template-columns:48px 1fr;gap:14px;align-items:center;font-size:15.5px;color:var(--ink-soft)}
.fit .crit li b{display:block;color:var(--ink);font-size:16px}
.fit .crit .k{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-family:var(--display);font-stretch:70%;font-weight:900;font-size:18px;color:#fff;background:var(--brand-grad);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 3px 0 #7c0000}
.fit .or{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line-strong);font-size:15px;color:var(--ink-soft)}
.fit .or b{color:var(--ink)}

/* ---------- plans ---------- */
.plan-grid{display:grid;gap:20px;align-items:stretch}
@media(min-width:980px){.plan-grid{grid-template-columns:repeat(3,1fr)}}
.plan{position:relative;display:flex;flex-direction:column;border-radius:24px;padding:30px 24px 26px;border:1.5px solid transparent;background:linear-gradient(180deg,rgba(28,34,58,.9),rgba(15,19,36,.9)) padding-box,linear-gradient(160deg,rgba(255,255,255,.3),rgba(255,255,255,.06) 45%,rgba(255,255,255,.14)) border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 40px 60px -40px #000}
.plan.featured{background:linear-gradient(180deg,rgba(52,22,30,.96),rgba(22,16,30,.96)) padding-box,linear-gradient(160deg,#ffd166,#ff5a4d 40%,rgba(255,209,102,.5)) border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 50px 80px -40px rgba(207,0,0,.7)}
@media(min-width:980px){.plan.featured{margin-block:-14px;padding-block:44px 40px}}
.plan .tag{position:absolute;top:-13px;left:22px;background:linear-gradient(180deg,#ffdc85,#ffc94d);color:#231a00;font-weight:800;font-stretch:88%;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;padding:6px 12px;border-radius:7px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 2px 0 #a87400}
.plan .tier{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--on-dark-muted)}
.plan h3{font-family:var(--display);font-stretch:66%;font-weight:900;text-transform:uppercase;font-size:32px;line-height:1;letter-spacing:.01em;margin:8px 0 10px;color:#fff}
.plan .for{color:var(--on-dark-soft);font-size:15.5px}
.plan .price{margin:20px 0 4px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);font-size:22px;font-weight:800;color:#fff}
.plan .price small{display:block;font-size:13.5px;font-weight:500;color:var(--on-dark-muted);margin-top:2px}
.plan ul{list-style:none;margin:16px 0 26px;color:#e3e6f4;flex:1}
.plan li{padding:7px 0 7px 30px;position:relative;font-size:15.5px;line-height:1.45}
.plan li::before{content:"";position:absolute;left:0;top:10px;width:18px;height:18px;border-radius:6px;background:rgba(255,90,77,.2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff8f86' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.500l4.500 4.500L19 7.500'/%3E%3C/svg%3E") center/11px no-repeat}
.plan li.plus::before{background:rgba(255,209,102,.22) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffd166' stroke-width='3.4' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E") center/11px no-repeat}
.compare-wrap{margin-top:36px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.035)}
.compare-wrap summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;padding:14px 20px;font-weight:800;font-size:16px;cursor:pointer;list-style:none;color:#fff}
.compare-wrap summary::-webkit-details-marker{display:none}
.compare-wrap summary::after{content:"+";font-size:26px;font-weight:400;color:var(--accent);line-height:1}
.compare-wrap[open] summary::after{content:"–"}
.compare-scroll{overflow-x:auto;border-top:1px solid rgba(255,255,255,.1)}
.compare{width:100%;min-width:680px;border-collapse:collapse;font-size:15px}
.compare th,.compare td{padding:14px 18px;text-align:left;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
.compare th{font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--on-dark-muted);background:rgba(255,255,255,.04)}
.compare th.hi{color:var(--accent)}
.compare td:first-child{font-weight:700;color:#fff;white-space:nowrap}
.compare td{color:#dfe3f5}
.compare tr:last-child td{border-bottom:none}
.compare .no{color:#8087a3}
.plans-note{color:var(--on-dark-muted);font-size:15px;margin-top:20px}
.plans-note a{color:#fff;font-weight:700;text-underline-offset:3px}

/* ---------- FAQ ---------- */
.faq-wrap{display:grid;gap:8px}
@media(min-width:980px){.faq-wrap{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:64px;align-items:start}.faq-wrap .section-head{position:sticky;top:104px}}
.faq details{border-radius:16px;margin-bottom:12px;border:1.5px solid transparent;background:var(--card-fill) padding-box,linear-gradient(145deg,rgba(13,18,36,.14),rgba(13,18,36,.06)) border-box;box-shadow:inset 0 1px 0 #fff,0 14px 26px -22px rgba(60,30,8,.5);transition:box-shadow .25s}
.faq details[open]{background:var(--card-fill) padding-box,var(--card-edge) border-box;box-shadow:inset 0 1px 0 #fff,var(--card-shadow)}
.faq summary{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:64px;padding:16px 20px;font-weight:800;font-size:17px;line-height:1.3;cursor:pointer;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"";flex:none;width:30px;height:30px;border-radius:9px;background:var(--ink) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E") center/14px no-repeat;transition:transform .25s var(--ease),background-color .2s}
.faq details[open] summary::after{background-color:var(--brand);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E")}
.faq details p{color:var(--ink-soft);padding:0 20px 20px;font-size:16px}

/* ---------- contact ---------- */
.contact-grid{display:grid;gap:32px}
@media(min-width:980px){.contact-grid{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:56px;align-items:start}.contact-copy{position:sticky;top:104px}}
.contact-copy h2{font-size:clamp(44px,10vw,84px);color:#fff}
.contact-copy p{font-size:18px;color:#ffe9e4;max-width:480px}
.contact-ways{display:grid;gap:12px;margin-top:28px}
.way{display:flex;align-items:center;gap:14px;min-height:72px;padding:12px 16px;border-radius:18px;text-decoration:none;color:#fff;background:linear-gradient(155deg,rgba(255,255,255,.2),rgba(255,255,255,.06));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3),inset 0 1px 0 rgba(255,255,255,.35),0 24px 40px -28px rgba(60,0,0,.9);transition:transform .2s var(--ease),background-color .2s}
.way:hover{transform:translateY(-3px)}
.way-ico{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;flex:none;color:var(--brand);background:#fff;box-shadow:0 3px 0 rgba(90,0,0,.6)}
.way-ico svg{width:22px;height:22px}
.way small{display:block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#ffd9d2}
.way b{display:block;font-size:20px;line-height:1.2;letter-spacing:-.01em;overflow-wrap:anywhere}
.cal-card{border-radius:24px;background:#fff;overflow:hidden;box-shadow:0 4px 0 rgba(70,0,0,.55),0 50px 80px -40px rgba(40,0,0,.9);color:var(--ink)}
.cal-head{display:flex;align-items:center;gap:10px;padding:16px 20px;font-weight:800;font-size:16px;border-bottom:1px solid #eee}
.cal-head svg{width:20px;height:20px;color:var(--brand)}
.calendly-inline-widget{min-width:280px;height:700px}

/* ---------- footer ---------- */
.site-foot{margin-top:0;padding:56px 0 40px}
.foot-top{display:grid;gap:32px;padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,.09)}
@media(min-width:860px){.foot-top{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:64px}}
.foot-brand img{height:44px;width:auto}
.foot-brand p{max-width:340px;margin:14px 0 14px;color:var(--on-dark-muted)}
.foot-phone{display:inline-flex!important;align-items:center;gap:9px;font-family:var(--display);font-stretch:70%;font-weight:900;font-size:30px;letter-spacing:.01em;color:#fff}
.foot-phone svg{width:22px;height:22px;color:var(--brand-hi)}
.foot-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px 16px}
@media(min-width:560px){.foot-cols{grid-template-columns:repeat(3,1fr)}}
.foot-cols a{display:block;padding:11px 0;font-size:15px;color:var(--on-dark-soft)}
.foot-h{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#fff;margin-bottom:6px}
.foot-bot{padding-top:22px;display:flex;justify-content:space-between;gap:8px 24px;flex-wrap:wrap;font-size:14px}
.foot-bot strong{color:var(--on-dark-soft)}

/* ---------- phone-only call bar ---------- */
.callbar{position:fixed;left:0;right:0;bottom:0;z-index:45;display:grid;grid-template-columns:1.25fr 1fr;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,246,225,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid rgba(13,18,36,.1);box-shadow:0 -18px 30px -20px rgba(13,18,36,.5);transform:translate3d(0,110%,0);transition:transform .35s var(--ease)}
.callbar.show{transform:none}
.callbar .btn{min-height:52px;padding:10px 12px;font-size:14.5px}
@media(min-width:760px){.callbar{display:none!important}}
@media(max-width:759px){.site-foot{padding-bottom:104px}}

.band-red .btn-primary{background:#fff;color:var(--brand);box-shadow:inset 0 -1px 0 rgba(0,0,0,.08),0 3px 0 rgba(70,0,0,.7),0 20px 30px -16px rgba(40,0,0,.8)}
.logo{min-height:44px}
`;
