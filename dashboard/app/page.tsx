'use client';

import { useEffect, useRef } from 'react';

// gobiggify.com homepage, rebuilt 2026-10-29. Same content and order as before, new design: a clean cream page with depth,
// Biggify red and gold, and the Hubert look where it earns its place (the matrix rain and neon edge in the dark bands,
// mono labels, glass cards). Three moments tied to the business: the before/after slider you drag, the stats that count up,
// and the receptionist conversation that types itself out. Everything else is quiet craft.

const css = `
  :root{
    --bg:#070b16;--bg-2:#0b1020;--bg-3:#0f1630;
    --cream:#FFF6E1;--cream-2:#f7efd9;--surface:#fffdf7;
    --ink:#0d1224;--ink-soft:#4a5372;--muted:#6b7390;--line:#e7e2d3;
    --brand:#e11a1a;--brand-2:#a30000;--brand-grad:linear-gradient(120deg,#ff3b3b 0%,#e11a1a 50%,#a30000 100%);
    --accent:#ffd166;--good:#2ec77b;
    --radius:18px;
    --shadow:0 30px 60px -30px rgba(13,18,36,.35);--card-shadow:0 1px 0 #fff inset,0 10px 30px -22px rgba(13,18,36,.45);
    --font:var(--font-geist-sans),-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:var(--font-geist-mono),ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:var(--font);color:var(--ink);background:var(--cream);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:clip}
  a{color:inherit;text-decoration:none}
  img{max-width:100%}
  .wrap{width:min(1160px,92vw);margin-inline:auto}
  .mono{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase}
  .btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 26px;border-radius:999px;font-weight:700;font-size:15px;cursor:pointer;border:none;transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s}
  .btn::after{content:"";position:absolute;top:-20%;bottom:-20%;left:-70%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);transition:left .6s}
  .btn:hover::after{left:130%}
  .btn-primary{background:var(--brand-grad);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 14px 30px -12px rgba(225,26,26,.7)}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 20px 34px -12px rgba(225,26,26,.8)}
  .btn-ghost{background:rgba(255,246,225,.08);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,246,225,.3)}
  .btn-ghost:hover{background:rgba(255,246,225,.14);transform:translateY(-2px)}
  .btn-soft{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px var(--line),0 10px 24px -18px rgba(13,18,36,.5)}
  .btn-soft:hover{transform:translateY(-2px)}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-weight:600;letter-spacing:.16em;text-transform:uppercase;font-size:12px;color:var(--brand)}
  .eyebrow::before{content:"";width:18px;height:2px;background:var(--brand)}
  .eyebrow.light{color:var(--accent)}.eyebrow.light::before{background:var(--accent)}
  .link{color:var(--brand);font-weight:700;border-bottom:2px solid rgba(225,26,26,.25);transition:border-color .2s}.link:hover{border-color:var(--brand)}

  /* NAV */
  header{position:sticky;top:0;z-index:50;background:rgba(255,246,225,.86);backdrop-filter:blur(14px) saturate(140%);border-bottom:1px solid rgba(13,18,36,.08);transition:box-shadow .3s}
  header.scrolled{box-shadow:0 10px 30px -20px rgba(13,18,36,.35)}
  nav{display:flex;align-items:center;justify-content:space-between;padding:10px 0;gap:10px}
  .logo{display:flex;align-items:center;gap:10px;flex-shrink:0}
  .logo img{height:44px;display:block;flex-shrink:0}
  .nav-cta{display:flex;gap:12px;align-items:center;flex-shrink:0}
  .nav-phone{font-weight:700;color:var(--ink);font-size:15px;white-space:nowrap;display:flex;align-items:center;gap:6px;padding:8px 6px}
  .nav-phone:hover{color:var(--brand)}
  .nav-signin{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px rgba(13,18,36,.18);min-height:44px;padding:0 18px}
  .nav-signin:hover{box-shadow:inset 0 0 0 1.5px var(--ink)}
  .nav .btn-primary{min-height:44px;padding:0 20px}
  .menu-only{display:none}
  .menu{position:relative;flex-shrink:0}
  .menu-btn{border:none;background:none;cursor:pointer;color:var(--ink-soft);width:44px;height:44px;display:grid;place-items:center;border-radius:999px}
  .menu-btn:hover{color:var(--brand);background:rgba(225,26,26,.06)}
  .menu-panel{position:absolute;top:calc(100% + 8px);left:0;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:8px;min-width:230px;display:flex;flex-direction:column;gap:2px;z-index:60}
  .menu-panel[hidden]{display:none}
  .menu-panel a{padding:10px 14px;border-radius:8px;color:var(--ink-soft);font-weight:600;font-size:15px}
  .menu-panel a:hover{background:var(--cream);color:var(--ink)}
  .menu-panel .sub{padding-left:28px;font-size:14px;font-weight:500}
  .menu-panel hr{border:none;border-top:1px solid var(--line);margin:4px 8px}
  @media(max-width:700px){.nav-phone,.nav-signin{display:none}.menu-only{display:block}.nav-cta{gap:8px}.nav .btn-primary{padding:0 16px;font-size:14px}.logo img{height:38px}}

  /* HERO: the one place the Hubert look runs at full strength */
  .hero{position:relative;background:var(--bg);color:#fff;overflow:hidden;isolation:isolate}
  .hero .rain{position:absolute;inset:0;z-index:0;opacity:.28;mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.35) 60%,transparent);-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.9),rgba(0,0,0,.35) 60%,transparent)}
  .hero .glow{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(900px 480px at 78% 0%,rgba(225,26,26,.28),transparent 60%),radial-gradient(700px 400px at 5% 100%,rgba(255,209,102,.1),transparent 60%)}
  .hero .gridfloor{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:0;pointer-events:none;perspective:600px;mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,.7));-webkit-mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,.7));opacity:.35}
  .hero .gridfloor::before{content:"";position:absolute;inset:-40% -60% -10%;transform:rotateX(62deg);background-image:linear-gradient(rgba(225,26,26,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(225,26,26,.35) 1px,transparent 1px);background-size:48px 48px;animation:gridmove 2.4s linear infinite}
  @keyframes gridmove{to{background-position:0 48px,0 0}}
  .hero-inner{position:relative;z-index:1;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:92px 0 110px}
  .hero h1{font-size:clamp(40px,5.4vw,66px);line-height:1.02;letter-spacing:-.035em;font-weight:800;margin:20px 0 20px}
  .hero h1 .w{display:inline-block;opacity:0;transform:translateY(16px);animation:wordin .7s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i)*55ms)}
  @keyframes wordin{to{opacity:1;transform:none}}
  .hero h1 .grad,.hero h1 .grad .w{background:linear-gradient(120deg,#ff6b6b,#e11a1a 45%,#ffd166 120%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .hero p.lead{font-size:19px;color:#c9cde3;max-width:560px}
  .hero-cta{display:flex;gap:14px;margin-top:30px;flex-wrap:wrap}
  .trust{margin-top:28px;color:#8a91b4;font-size:14px;display:flex;gap:10px 22px;flex-wrap:wrap}
  .trust span{opacity:0;animation:wordin .7s cubic-bezier(.2,.8,.2,1) forwards}.trust span:nth-child(1){animation-delay:.6s}.trust span:nth-child(2){animation-delay:.72s}.trust span:nth-child(3){animation-delay:.84s}.trust span:nth-child(4){animation-delay:.96s}
  .hero p.lead,.hero-cta{opacity:0;animation:wordin .8s cubic-bezier(.2,.8,.2,1) forwards}.hero p.lead{animation-delay:.35s}.hero-cta{animation-delay:.5s}
  .trust b{color:#fff}
  @media(max-width:900px){.hero-inner{grid-template-columns:1fr;padding:56px 0 70px}}

  /* the stack: a glass command panel with a light running round its edge */
  .stack{position:relative;justify-self:center;width:min(380px,100%);background:rgba(15,22,48,.72);backdrop-filter:blur(14px) saturate(120%);border-radius:24px;padding:18px;box-shadow:inset 0 1px 0 rgba(255,246,225,.08),0 40px 80px -40px rgba(0,0,0,.9),0 0 0 1px rgba(255,246,225,.1);--angle:0deg;animation:spinangle 3.2s linear infinite}
  @property --angle{syntax:"<angle>";initial-value:0deg;inherits:false}
  @keyframes spinangle{to{--angle:360deg}}
  .stack::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--angle),transparent 0 68%,#e11a1a 84%,#fff6e1 92%,transparent 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
  .stack .head{display:flex;align-items:center;gap:10px;padding:4px 6px 14px;border-bottom:1px solid rgba(255,246,225,.08);margin-bottom:8px;font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#aeb4d2}
  .stack .head .dot{width:9px;height:9px;border-radius:50%;background:var(--good);box-shadow:0 0 0 4px rgba(46,199,123,.18);animation:pulse 2s ease-in-out infinite}
  @keyframes pulse{50%{box-shadow:0 0 0 7px rgba(46,199,123,.08)}}
  .stack .row{display:flex;gap:14px;align-items:flex-start;padding:13px 8px;border-radius:14px;transition:background .3s}
  .stack .row + .row{border-top:1px solid rgba(255,246,225,.06)}
  .stack .row.lit{background:rgba(225,26,26,.1)}
  .stack .row .ico{width:40px;height:40px;flex:none;border-radius:11px;background:rgba(255,246,225,.07);display:grid;place-items:center;transition:background .3s,box-shadow .3s}
  .stack .row .ico svg{width:20px;height:20px;stroke:#fff6e1;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .stack .row.lit .ico{background:var(--brand-grad);box-shadow:0 10px 20px -10px rgba(225,26,26,.9)}
  .stack .row b{display:block;color:#fff;font-size:15px}
  .stack .row small{display:block;color:#aeb4d2;font-size:13px;line-height:1.45}
  .case-hero{display:block;text-decoration:none;color:#fff;animation:spinangle 3.2s linear infinite,hoverfloat 7s ease-in-out infinite;transition:transform .3s}
  .case-hero:hover{animation-play-state:running,paused;transform:translateY(-4px)}
  @keyframes hoverfloat{50%{transform:translateY(-6px)}}
  .case-shot{position:relative;border-radius:14px;overflow:hidden;aspect-ratio:16/10;background:#0b1020;box-shadow:0 0 0 1px rgba(255,246,225,.1)}
  .case-shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
  .case-hero:hover .case-shot img{transform:scale(1.04)}
  .case-shot .chip{position:absolute;left:10px;top:10px;font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px;border-radius:999px;background:var(--brand-grad);color:#fff}
  .case-stat{display:flex;align-items:baseline;gap:12px;padding:16px 8px 6px}
  .case-stat b{font-size:52px;font-weight:800;letter-spacing:-.04em;line-height:1;background:linear-gradient(120deg,#ffd166,#ff8a3d 60%,#ff6b6b);-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
  .case-stat > span{color:#c9cde3;font-size:15px;font-weight:600} .case-stat b span,.feat-stat b span{font:inherit;color:inherit;letter-spacing:inherit}
  .case-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 8px 4px;border-top:1px solid rgba(255,246,225,.08)}
  .case-meta b{display:block;font-size:15px}.case-meta small{display:block;color:#8a91b4;font-size:12.5px}
  .case-meta .more{color:var(--accent);font-weight:700;font-size:13px;white-space:nowrap}

  /* trusted-by strip */
  .clients{border-top:1px solid rgba(255,246,225,.08);background:var(--bg-2);color:#8a91b4;padding:18px 0;overflow:hidden;position:relative;z-index:1}
  .clients .wrap{display:flex;align-items:center;gap:24px}
  .clients .lab{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;flex:none}
  .clients .track{overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);flex:1}
  .clients .track div{display:flex;gap:40px;white-space:nowrap;width:max-content;animation:marq 40s linear infinite;font-weight:700;color:#c9cde3;font-size:14px}
  @keyframes marq{to{transform:translateX(-50%)}}
  .clients .track span::after{content:"◆";margin-left:40px;color:var(--brand);font-size:8px;vertical-align:middle}

  /* SECTIONS */
  section{padding:96px 0}
  section.alt{background:var(--cream-2);background-image:repeating-linear-gradient(135deg,rgba(13,18,36,.025) 0 2px,transparent 2px 14px)}
  section.dots{position:relative;background:var(--cream);background-image:radial-gradient(rgba(225,26,26,.16) 1px,transparent 1.5px);background-size:22px 22px;background-position:0 0;animation:dotdrift 30s linear infinite}
  @keyframes dotdrift{to{background-position:22px 22px}}
  section.gold{background:linear-gradient(180deg,#fff6e1,#ffefc4 60%,#fff6e1);position:relative;overflow:hidden}
  section.gold::before,section.gold::after{content:"";position:absolute;width:520px;height:520px;border-radius:50%;filter:blur(60px);opacity:.55;pointer-events:none;background:radial-gradient(circle,rgba(255,209,102,.9),transparent 65%);animation:blob 18s ease-in-out infinite}
  section.gold::before{left:-160px;top:-120px}section.gold::after{right:-180px;bottom:-200px;background:radial-gradient(circle,rgba(225,26,26,.35),transparent 65%);animation-delay:-9s}
  @keyframes blob{50%{transform:translate(40px,30px) scale(1.08)}}
  section.white{background:#fffdf7}
  section.slate{background:linear-gradient(180deg,#eef0f7,#e9ebf4)}
  section.red{background:linear-gradient(160deg,#5a0000,#a30000 55%,#e11a1a);color:#fff;position:relative;overflow:hidden}
  section.red::before{content:"";position:absolute;inset:0;background:radial-gradient(700px 400px at 100% 0%,rgba(255,209,102,.25),transparent 60%);pointer-events:none}
  section.red .eyebrow{color:var(--accent)}section.red .eyebrow::before{background:var(--accent)}
  section.red .split h2{color:#fff}section.red .split p{color:#ffd9d9}
  section.red .checks li{color:#ffe3e3}section.red .checks li b{color:#fff}section.red .checks li:before{background:rgba(255,255,255,.14)}section.red .checks li:after{border-color:var(--accent)}
  section.red .btn-primary{background:#fff;color:var(--brand);box-shadow:0 14px 30px -12px rgba(0,0,0,.5)}
  section.dark::after{content:"";position:absolute;inset:-20%;z-index:0;pointer-events:none;background:radial-gradient(600px 300px at 20% 30%,rgba(225,26,26,.18),transparent 60%),radial-gradient(500px 300px at 80% 70%,rgba(255,209,102,.08),transparent 60%);animation:aurora 16s ease-in-out infinite alternate}
  @keyframes aurora{to{transform:translate(6%,4%) rotate(3deg)}}
  section.dark{background:linear-gradient(180deg,var(--bg-2),#121a3a);color:#fff;position:relative;overflow:hidden;isolation:isolate}
  .section-head{text-align:center;max-width:740px;margin:0 auto 54px}
  .section-head h2{font-size:clamp(30px,3.8vw,46px);letter-spacing:-.03em;line-height:1.06;margin:16px 0 12px;font-weight:800}
  .section-head p{color:var(--ink-soft);font-size:18px}
  .dark .section-head p{color:#c9cde3}
  .split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
  .split h2{font-size:clamp(28px,3.4vw,40px);letter-spacing:-.03em;line-height:1.08;margin:16px 0 14px;font-weight:800}
  .split p{color:var(--ink-soft);font-size:17px}
  .split .lead{font-size:17.5px;margin-bottom:18px}
  .split .actions{display:flex;gap:14px;margin-top:26px;flex-wrap:wrap;align-items:center}
  @media(max-width:900px){.split{grid-template-columns:1fr;gap:34px}.split.rev > :first-child{order:2}}
  .checks{list-style:none;margin-top:6px}
  .checks li{padding:8px 0 8px 34px;position:relative;color:var(--ink-soft);font-size:15.5px}
  .checks li:before{content:"";position:absolute;left:0;top:11px;width:22px;height:22px;border-radius:50%;background:rgba(225,26,26,.1)}
  .checks li:after{content:"";position:absolute;left:8px;top:15px;width:5px;height:9px;border-right:2.5px solid var(--brand);border-bottom:2.5px solid var(--brand);transform:rotate(45deg)}
  .checks li b{color:var(--ink)}
  .card{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:30px;box-shadow:var(--card-shadow);transition:transform .25s,box-shadow .25s}
  .card.lift:hover{transform:translateY(-5px);box-shadow:0 1px 0 #fff inset,0 30px 50px -30px rgba(13,18,36,.45)}
  .glare{position:absolute;inset:0;border-radius:inherit;background:radial-gradient(360px 360px at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.55),transparent 60%);opacity:0;transition:opacity .3s;pointer-events:none}
  .tilt{transform-style:preserve-3d;transform:perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0))}
  .tilt:hover .glare{opacity:1}
  .rv{opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}
  .rv.in{opacity:1;transform:none}
  .rv .checks li{opacity:0;transform:translateX(-10px);transition:opacity .5s ease,transform .5s ease}
  .rv.in .checks li{opacity:1;transform:none}
  .rv.in .checks li:nth-child(1){transition-delay:.15s}.rv.in .checks li:nth-child(2){transition-delay:.25s}.rv.in .checks li:nth-child(3){transition-delay:.35s}.rv.in .checks li:nth-child(4){transition-delay:.45s}.rv.in .checks li:nth-child(5){transition-delay:.55s}.rv.in .checks li:nth-child(6){transition-delay:.65s}.rv.in .checks li:nth-child(7){transition-delay:.75s}
  .rv .eyebrow::before{transform:scaleX(0);transform-origin:left;transition:transform .6s cubic-bezier(.2,.8,.2,1) .2s}
  .rv.in .eyebrow::before{transform:none}
  .rv.in h2{animation:h2in .7s cubic-bezier(.2,.8,.2,1) both}
  @keyframes h2in{from{opacity:0;transform:translateY(10px)}}
  .d1{transition-delay:.1s}.d2{transition-delay:.2s}.d3{transition-delay:.3s}

  /* leak */
  .leak{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .leak .card{padding:34px 30px 28px;overflow:hidden}
  .leak .card:hover .n{-webkit-text-stroke:1.5px rgba(225,26,26,.6);transform:translateY(-4px)}
  .leak .n{transition:transform .4s,-webkit-text-stroke .4s;position:absolute;right:18px;top:6px;font-size:84px;font-weight:800;letter-spacing:-.05em;color:transparent;-webkit-text-stroke:1.5px rgba(225,26,26,.22);line-height:1}
  .leak .stage{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--brand)}
  .leak h3{font-size:22px;letter-spacing:-.02em;margin:10px 0 10px;position:relative}
  .leak p{color:var(--ink-soft);font-size:15.5px;position:relative}
  .leak .fix{margin-top:18px;padding-top:14px;border-top:1px solid var(--line);font-size:14px;color:var(--ink-soft)}
  .leak .fix b{color:var(--brand)}
  @media(max-width:860px){.leak{grid-template-columns:1fr}}

  /* services */
  .svc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .svc{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:26px;display:flex;flex-direction:column;box-shadow:var(--card-shadow);transition:transform .25s,box-shadow .25s;overflow:hidden}
  .svc::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--brand-grad);transform:scaleX(0);transform-origin:left;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
  .svc:hover{transform:translateY(-5px);box-shadow:0 1px 0 #fff inset,0 30px 50px -30px rgba(13,18,36,.45)}.svc:hover::before{transform:scaleX(1)}
  .svc .ico{width:46px;height:46px;border-radius:12px;background:rgba(225,26,26,.08);display:grid;place-items:center;margin-bottom:14px}
  .svc .ico svg{width:22px;height:22px;stroke:var(--brand);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .svc:hover .ico{background:var(--brand-grad)}.svc:hover .ico svg{stroke:#fff;animation:wiggle .6s ease}
  @keyframes wiggle{25%{transform:rotate(-10deg) scale(1.1)}60%{transform:rotate(8deg)}}
  .svc h3{font-size:18px;margin-bottom:6px;letter-spacing:-.01em}
  .svc p{color:var(--ink-soft);font-size:15px;flex:1}
  .svc .more{margin-top:14px;color:var(--brand);font-weight:700;font-size:14px}
  @media(max-width:1000px){.svc-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.svc-grid{grid-template-columns:1fr}}

  /* before/after slider: the signature */
  .ba{position:relative;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow),0 0 0 1px var(--line);background:#e9e4d6;aspect-ratio:16/10;user-select:none;touch-action:none;cursor:ew-resize}
  .ba img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;display:block}
  .ba .after{clip-path:inset(0 0 0 var(--x,50%))}
  .ba .bar{position:absolute;top:0;bottom:0;left:var(--x,50%);width:3px;background:#fff;transform:translateX(-50%);box-shadow:0 0 0 1px rgba(13,18,36,.2)}
  .ba .knob{position:absolute;top:50%;left:var(--x,50%);width:48px;height:48px;border-radius:50%;background:var(--brand-grad);transform:translate(-50%,-50%);box-shadow:0 10px 24px -8px rgba(225,26,26,.9),0 0 0 4px rgba(255,255,255,.9);display:grid;place-items:center;color:#fff;font-size:14px;font-weight:800;letter-spacing:-.02em}
  .ba .tag{position:absolute;top:12px;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:6px 10px;border-radius:999px;background:rgba(13,18,36,.72);color:#fff;backdrop-filter:blur(4px)}
  .ba .tag.l{left:12px}.ba .tag.r{right:12px;background:var(--brand-grad)}
  .ba-cap{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}
  .ba-cap b{display:block}.ba-cap span{color:var(--muted);font-size:13.5px}
  .ba-cap .hint{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}

  /* our work */
  .work-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .work{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;box-shadow:var(--card-shadow);transition:transform .25s,box-shadow .25s}
  .work:hover{transform:translateY(-5px);box-shadow:0 1px 0 #fff inset,0 30px 50px -30px rgba(13,18,36,.45)}
  .work .shots{position:relative;aspect-ratio:16/10;background:#f3f4f8;overflow:hidden}
  .work .shots img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;display:block;transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
  .work:hover .shots img{transform:scale(1.04)}
  .work .shots .b{transition:opacity .5s}
  .work .shots .a{clip-path:inset(0 0 0 50%);transition:clip-path .6s cubic-bezier(.2,.8,.2,1)}
  .work:hover .shots .a{clip-path:inset(0 0 0 0)}
  .work .shots .seam{position:absolute;top:0;bottom:0;left:50%;width:2px;background:#fff;transition:left .6s cubic-bezier(.2,.8,.2,1),opacity .3s}
  .work:hover .shots .seam{left:0;opacity:0}
  .work .tag{position:absolute;top:10px;left:10px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px;border-radius:999px;background:rgba(13,18,36,.72);color:#fff;backdrop-filter:blur(4px);z-index:2}
  .work .tag.after{left:auto;right:10px;background:var(--brand-grad)}
  .work .tag.gold{background:#3a2c00;color:var(--accent)}
  .work .meta{padding:16px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .work .meta h3{font-size:16px;letter-spacing:-.01em}
  .work .meta .trade{display:block;color:var(--muted);font-size:13px;font-weight:500}
  .work .meta a{color:var(--brand);font-weight:700;font-size:13.5px;white-space:nowrap}
  @media(max-width:1000px){.work-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:640px){.work-grid{grid-template-columns:1fr}}
  .work-note{text-align:center;color:var(--muted);font-size:13.5px;margin-top:22px;font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase}

  /* stats band: dark, faint rain, numbers count up */
  .stats{position:relative;background:var(--bg);color:#fff;padding:72px 0;overflow:hidden;isolation:isolate}
  .stats .rain{position:absolute;inset:0;z-index:0;opacity:.16}
  .stats .wrap{position:relative;z-index:1}
  .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center}
  .stat{padding:26px 20px;border-radius:18px;background:rgba(15,22,48,.6);backdrop-filter:blur(10px);box-shadow:inset 0 1px 0 rgba(255,246,225,.08),0 0 0 1px rgba(255,246,225,.1)}
  .stat.in .n{animation:pop .7s cubic-bezier(.2,.8,.2,1) both}
  @keyframes pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.06)}100%{transform:none;opacity:1}}
  .stat .n{font-size:48px;font-weight:800;background:linear-gradient(120deg,#ff6b6b,#e11a1a 50%,#ffd166 130%);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
  .stat .l{color:#aeb4d2;font-size:15px;margin-top:10px}
  @media(max-width:760px){.stat-grid{grid-template-columns:1fr;gap:12px}}

  /* phone mock: the conversation types itself */
  .phone{position:relative;justify-self:center;width:300px;background:rgba(15,22,48,.9);border-radius:32px;padding:16px;box-shadow:inset 0 1px 0 rgba(255,246,225,.1),0 0 0 1px rgba(255,246,225,.12),0 40px 80px -40px rgba(13,18,36,.8);color:#fff}
  .phone .bar{height:26px;display:flex;align-items:center;justify-content:space-between;color:#8a91b4;font-size:12px;padding:0 10px 6px;font-family:var(--mono)}
  .call-head{display:flex;align-items:center;gap:10px;padding:6px 6px 12px;border-bottom:1px solid rgba(255,246,225,.08);margin-bottom:8px}
  .call-head .dot{width:9px;height:9px;border-radius:50%;background:var(--good);box-shadow:0 0 0 4px rgba(46,199,123,.18);animation:pulse 2s ease-in-out infinite}
  .call-head span{color:#c9cde3;font-size:13px;font-weight:600}
  .bubble{padding:11px 14px;border-radius:16px;margin:8px 0;font-size:14px;max-width:86%;opacity:0;transform:translateY(8px) scale(.98);transition:opacity .35s,transform .35s}
  .bubble.on{opacity:1;transform:none}
  .b-in{background:#182046;color:#dfe3f5;border-bottom-left-radius:5px}
  .b-out{background:var(--brand-grad);color:#fff;margin-left:auto;border-bottom-right-radius:5px}
  .typing{display:inline-flex;gap:4px;padding:12px 14px;background:#182046;border-radius:16px;border-bottom-left-radius:5px;margin:8px 0;opacity:0;transition:opacity .2s}
  .typing.on{opacity:1}
  .typing i{width:6px;height:6px;border-radius:50%;background:#8a91b4;animation:bounce 1s ease-in-out infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
  @keyframes bounce{50%{transform:translateY(-4px);background:#fff}}
  .phone .replay{margin-top:10px;width:100%;border:0;background:rgba(255,246,225,.06);color:#aeb4d2;border-radius:10px;min-height:40px;font:600 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
  .phone .replay:hover{background:rgba(255,246,225,.12);color:#fff}

  /* social post mock */
  .post{background:rgba(15,22,48,.95);color:#fff;border-radius:var(--radius);padding:22px;box-shadow:inset 0 1px 0 rgba(255,246,225,.08),0 0 0 1px rgba(255,246,225,.12),0 30px 60px -30px rgba(13,18,36,.6)}
  .post .who{display:flex;align-items:center;gap:10px;margin-bottom:16px}
  .post .av{width:38px;height:38px;border-radius:50%;background:var(--brand-grad);display:grid;place-items:center;font-weight:800}
  .post .pics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
  .post .pics div{aspect-ratio:1;border-radius:12px;display:grid;place-items:center;font-family:var(--mono);font-size:11px;letter-spacing:.14em;font-weight:600}
  .post .pics .b{background:linear-gradient(135deg,#2a3358,#182046);color:#8a91b4}.post .pics .a{background:linear-gradient(135deg,#7a1a1a,#e11a1a);color:#fff}
  .post p{color:#dfe3f5;font-size:14.5px}
  .post .acts{display:flex;gap:18px;margin-top:14px;color:#8a91b4;font-size:13px}
  .post .acts span.hot{color:var(--accent)}

  /* the featured case study */
  .dark.redglow{background:linear-gradient(160deg,#160a12,#3a0a0f 50%,#0b1020)}
  .feat{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;background:rgba(15,22,48,.55);backdrop-filter:blur(12px);border-radius:26px;padding:26px;box-shadow:inset 0 1px 0 rgba(255,246,225,.08),0 0 0 1px rgba(255,246,225,.12),0 40px 80px -40px rgba(0,0,0,.9)}
  .feat-shot{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:16/10;background:#0b1020;box-shadow:0 0 0 1px rgba(255,246,225,.1)}
  .feat-shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
  .feat:hover .feat-shot img{transform:scale(1.03)}
  .feat-shot .chip{position:absolute;left:12px;bottom:12px;font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:6px 10px;border-radius:999px;background:rgba(13,18,36,.8);color:#fff;backdrop-filter:blur(4px)}
  .feat-copy p{color:#c9cde3;font-size:16.5px;margin-top:14px}
  .feat-stat{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-top:14px}
  .feat-stat b{font-size:clamp(56px,7vw,92px);font-weight:800;letter-spacing:-.05em;line-height:1;background:linear-gradient(120deg,#ffd166,#ff8a3d 60%,#ff6b6b);-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
  .feat-stat > span{color:#fff;font-size:18px;font-weight:700}
  .feat .actions{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:24px}
  .link.light{color:var(--accent);border-color:rgba(255,209,102,.3)}
  @media(max-width:900px){.feat{grid-template-columns:1fr}}

  /* plans */
  .dark .rain{position:absolute;inset:0;z-index:0;opacity:.1}
  .dark .wrap{position:relative;z-index:1}
  .plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:stretch}
  .plan{position:relative;background:rgba(15,22,48,.6);backdrop-filter:blur(12px);border-radius:24px;padding:34px 30px;display:flex;flex-direction:column;box-shadow:inset 0 1px 0 rgba(255,246,225,.08),0 0 0 1px rgba(255,246,225,.12),0 30px 60px -40px rgba(0,0,0,.9);transition:transform .25s}
  .plan:hover{transform:translateY(-4px)}
  .plan li{opacity:0;transform:translateX(-8px);transition:opacity .4s,transform .4s}
  .plan.in li{opacity:1;transform:none}
  .plan.in li:nth-child(1){transition-delay:.1s}.plan.in li:nth-child(2){transition-delay:.16s}.plan.in li:nth-child(3){transition-delay:.22s}.plan.in li:nth-child(4){transition-delay:.28s}.plan.in li:nth-child(5){transition-delay:.34s}.plan.in li:nth-child(6){transition-delay:.4s}.plan.in li:nth-child(7){transition-delay:.46s}.plan.in li:nth-child(8){transition-delay:.52s}.plan.in li:nth-child(9){transition-delay:.58s}.plan.in li:nth-child(10){transition-delay:.64s}
  .plan.featured{background:rgba(25,20,60,.75);--angle:0deg;animation:spinangle 3.2s linear infinite}
  .plan.featured::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--angle),rgba(255,209,102,.35) 0 60%,#ffd166 80%,#fff6e1 90%,rgba(255,209,102,.35) 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
  .plan .tag{display:inline-block;align-self:flex-start;background:var(--accent);color:#3a2c00;font-weight:800;font-size:12.5px;padding:5px 12px;border-radius:999px;margin-bottom:14px}
  .plan .tier{font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#aeb4d2}
  .plan h3{font-size:28px;letter-spacing:-.02em;margin:6px 0 6px}
  .plan .for{color:#c9cde3;font-size:15px;min-height:46px}
  .plan .price{margin:18px 0 6px;font-size:22px;font-weight:800}
  .plan .price small{display:block;font-size:13.5px;font-weight:500;color:#8a91b4;margin-top:2px}
  .plan ul{list-style:none;margin:16px 0 24px;color:#dfe3f5;flex:1}
  .plan li{padding:7px 0 7px 28px;position:relative;font-size:15px}
  .plan li:before{content:"✓";position:absolute;left:0;color:#ff6b6b;font-weight:800}
  .plan li.plus:before{content:"+";color:var(--accent)}
  .plan .btn{text-align:center}
  @media(max-width:960px){.plan-grid{grid-template-columns:1fr}}
  .compare-wrap{margin-top:44px;overflow-x:auto;border-radius:16px;background:rgba(15,22,48,.5);box-shadow:0 0 0 1px rgba(255,246,225,.12)}
  .compare{width:100%;min-width:680px;border-collapse:collapse;font-size:15px}
  .compare th,.compare td{padding:14px 18px;text-align:left;border-bottom:1px solid rgba(255,246,225,.08);vertical-align:top}
  .compare th{font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#aeb4d2;background:rgba(255,246,225,.04)}
  .compare th.hi{color:var(--accent)}
  .compare td:first-child{font-weight:700;color:#fff;white-space:nowrap}
  .compare td{color:#dfe3f5}
  .compare tr:last-child td{border-bottom:none}
  .compare .no{color:#6b7390}
  .plans-note{text-align:center;color:#8a91b4;font-size:14px;margin-top:18px}

  /* faq */
  details{border:1px solid var(--line);border-radius:14px;padding:18px 22px;margin-bottom:12px;background:var(--surface);box-shadow:var(--card-shadow)}
  details summary{font-weight:700;cursor:pointer;font-size:17px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:14px;min-height:28px}
  details summary::-webkit-details-marker{display:none}
  details summary:after{content:"+";font-size:24px;color:var(--brand);font-weight:400;flex:none;transition:transform .3s}
  details[open] summary:after{transform:rotate(45deg)}
  details p{color:var(--ink-soft);margin-top:12px;font-size:15.5px;animation:drop .35s ease}
  @keyframes drop{from{opacity:0;transform:translateY(-6px)}}

  /* CTA */
  .cta-final{position:relative;background:var(--bg);color:#fff;text-align:center;overflow:hidden;isolation:isolate}
  .cta-final .glow{position:absolute;inset:0;z-index:0;background:radial-gradient(800px 400px at 50% 0%,rgba(225,26,26,.35),transparent 60%)}
  .cta-final .wrap{position:relative;z-index:1}
  .cta-final h2{font-size:clamp(30px,4vw,48px);letter-spacing:-.03em;margin-bottom:14px;font-weight:800}
  .cta-final p{font-size:18px;color:#c9cde3;max-width:620px;margin:0 auto 28px}
  .calendly-inline-widget{min-width:320px;height:700px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,246,225,.12),0 40px 80px -40px rgba(0,0,0,.9)}

  /* footer */
  footer{background:#050812;color:#8a91b4;padding:54px 0 40px;font-size:14.5px;border-top:1px solid rgba(255,246,225,.06)}
  .foot-top{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;padding-bottom:26px;border-bottom:1px solid rgba(255,246,225,.08)}
  .foot-top .logo{margin-bottom:10px}
  .foot-links{display:flex;gap:22px;flex-wrap:wrap}
  .foot-links a:hover{color:#fff}
  .foot-bot{padding-top:22px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .foot-bot .mono{color:#5f6786}
`;

// Falling characters in Biggify red and cream, ported from Hubert. Decoration only: pointer-events off, hidden from screen
// readers, paused when the tab is hidden, drawn into whatever box it sits in.
function MatrixRain({ className = '', speed = 0.5 }: { className?: string; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789BIGGIFY$%<>=+*';
    const fontSize = 14;
    let columns: number[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    let running = true;
    const resize = () => {
      const parent = canvas.parentElement ?? { clientWidth: 300, clientHeight: 150 };
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
      columns = Array.from({ length: Math.ceil(width / fontSize) }, () => Math.random() * height);
      ctx.clearRect(0, 0, width, height);
    };
    const draw = () => {
      ctx.fillStyle = 'rgba(7, 11, 22, 0.12)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let i = 0; i < columns.length; i++) {
        const y = columns[i];
        const x = i * fontSize;
        ctx.fillStyle = 'rgba(255, 246, 225, 0.9)';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(225, 26, 26, 0.85)' : 'rgba(163, 0, 0, 0.85)';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize);
        columns[i] = y > height && Math.random() > 0.94 ? Math.random() * -200 : y + fontSize * speed;
      }
    };
    const loop = (t: number) => {
      if (!running) return;
      if (t - last > 48) { draw(); last = t; }
      raf = requestAnimationFrame(loop);
    };
    resize();
    raf = requestAnimationFrame(loop);
    const onVisibility = () => { running = !document.hidden; if (running) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf); };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibility); };
  }, [speed]);
  return <canvas ref={ref} aria-hidden className={`rain ${className}`} />;
}

const Ico = {
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  globe: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
  social: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17" cy="7" r="1"/></svg>,
  phone: <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>,
};

const WORK = [
  { key: 'tropicalbaybuilders', name: 'Tropical Bay Builders', trade: 'Remodeling & construction · North Port', url: 'https://tropicalbaybuilders.com', before: true },
  { key: 'rapidwaterheater', name: 'Rapid Water Heater', trade: 'Plumbing & water heaters · Sarasota', url: 'https://rapidwaterheater.co', before: true },
  { key: 'clearvant', name: 'Clearvant Window Washing Co', trade: 'Window cleaning · North Port', url: 'https://clearvantwc.com', before: true },
  { key: 'rsitile', name: 'Rock Solid Tile', trade: 'Tile installation · Southwest Florida', url: 'https://rsitile.com', before: true },
  { key: 'rocksolidlvp', name: 'Rock Solid LVP', trade: 'LVP flooring · Port Charlotte', url: 'https://rocksolidlvp.com', tag: 'Fresh build' },
  { key: 'interiormotives', name: 'Interior Motives Design', trade: 'Interior design · Charlotte Harbor', url: 'https://interiormotivesfl.com', tag: 'Redesign · Live' },
  { key: 'brunderman', name: 'Brunderman Building Co', trade: 'Home builder · Port Charlotte', url: 'https://brundermanbuilding.net', tag: 'Redesign · Live' },
  { key: 'tropicalbayrentals', name: 'Tropical Bay Rentals', trade: 'E-bike & jet ski rentals · Venice to Boca Grande', url: 'https://tropicalbayrentals.com', tag: 'Redesign · Live' },
];

export default function LandingPage() {
  useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
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

    const header = document.querySelector('header');
    const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const menuBtn = document.querySelector('.menu-btn');
    const menuPanel = document.querySelector('.menu-panel') as any;
    if (menuBtn && menuPanel) {
      const closeMenu = () => { menuPanel.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
      menuBtn.addEventListener('click', (e: any) => { e.stopPropagation(); const willOpen = menuPanel.hidden; menuPanel.hidden = !willOpen; menuBtn.setAttribute('aria-expanded', String(willOpen)); });
      menuPanel.querySelectorAll('a').forEach((a: any) => { a.addEventListener('click', closeMenu); });
      document.addEventListener('click', (e: any) => { if (!menuPanel.hidden && !e.target.closest('.menu')) closeMenu(); });
    }
    document.getElementById('yr')!.textContent = new Date().getFullYear().toString();

    // headline, word by word
    document.querySelectorAll('h1 [data-words]').forEach((el) => {
      let i = 0;
      const wrap = (node: Node) => {
        if (node.nodeType === 3) {
          const frag = document.createDocumentFragment();
          (node.textContent || '').split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', String(i++)); s.textContent = part; frag.appendChild(s);
          });
          node.parentNode?.replaceChild(frag, node);
        } else Array.from(node.childNodes).forEach(wrap);
      };
      Array.from(el.childNodes).forEach(wrap);
    });

    // reveals
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));

    // tilt + glare on cards that ask for it (mouse only)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const b = el.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width; const y = (e.clientY - b.top) / b.height;
          el.style.setProperty('--ry', `${((x - 0.5) * 5).toFixed(2)}deg`); el.style.setProperty('--rx', `${((0.5 - y) * 5).toFixed(2)}deg`);
          el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`); el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
        });
        el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
      });
    }

    // the before/after slider
    const ba = document.querySelector<HTMLElement>('.ba');
    if (ba) {
      const set = (clientX: number) => { const b = ba.getBoundingClientRect(); const x = Math.max(4, Math.min(96, ((clientX - b.left) / b.width) * 100)); ba.style.setProperty('--x', `${x.toFixed(2)}%`); };
      let down = false;
      ba.addEventListener('pointerdown', (e) => { down = true; ba.setPointerCapture(e.pointerId); set(e.clientX); });
      ba.addEventListener('pointermove', (e) => { if (down) set(e.clientX); });
      ba.addEventListener('pointerup', () => { down = false; });
      ba.addEventListener('pointercancel', () => { down = false; });
      // a nudge when it first comes into view, so people know it moves
      const nudge = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { nudge.disconnect(); let t = 0; const id = window.setInterval(() => { t += 1; const x = 50 + Math.sin(t / 6) * 18 * Math.max(0, 1 - t / 60); ba.style.setProperty('--x', `${x.toFixed(2)}%`); if (t >= 60) window.clearInterval(id); }, 24); } }, { threshold: 0.5 });
      nudge.observe(ba);
    }

    // stats count up
    const count = (el: HTMLElement) => {
      const target = parseFloat(el.dataset.count || '0'); const prefix = el.dataset.prefix || ''; const suffix = el.dataset.suffix || ''; const t0 = performance.now();
      const step = (t: number) => { const p = Math.min(1, (t - t0) / 1400); const e = 1 - Math.pow(1 - p, 3); el.textContent = prefix + Math.round(target * e).toLocaleString() + suffix; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const ioc = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { count(e.target as HTMLElement); ioc.unobserve(e.target); } }), { threshold: 0.6 });
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => ioc.observe(c));

    // the receptionist conversation types itself out
    const phone = document.querySelector('.phone');
    let convoTimers: number[] = [];
    const playConvo = () => {
      if (!phone) return;
      convoTimers.forEach(clearTimeout); convoTimers = [];
      const bubbles = Array.from(phone.querySelectorAll('.bubble'));
      const typing = phone.querySelector('.typing');
      bubbles.forEach((b) => b.classList.remove('on')); typing?.classList.remove('on');
      let t = 300;
      bubbles.forEach((b) => {
        const incoming = b.classList.contains('b-in');
        if (incoming) { convoTimers.push(window.setTimeout(() => { typing?.classList.add('on'); b.parentElement?.insertBefore(typing!, b); }, t)); t += 900; }
        convoTimers.push(window.setTimeout(() => { typing?.classList.remove('on'); b.classList.add('on'); }, t));
        t += incoming ? 1100 : 1300;
      });
    };
    const iop = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { iop.disconnect(); playConvo(); } }, { threshold: 0.5 });
    if (phone) iop.observe(phone);
    phone?.querySelector('.replay')?.addEventListener('click', playConvo);

    if (!document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')) {
      const script = document.createElement('script'); script.src = 'https://assets.calendly.com/assets/external/widget.js'; script.async = true; document.body.appendChild(script);
    }
    return () => { convoTimers.forEach(clearTimeout); window.removeEventListener('scroll', onScroll); };
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
                  <a href="#services">Services</a>
                  <a className="sub" href="#websites">Websites</a>
                  <a className="sub" href="#gbp">Google Business Profile</a>
                  <a className="sub" href="#social">Social Media</a>
                  <a className="sub" href="#receptionist">AI Receptionist</a>
                  <hr />
                  <a href="#work">Our Work</a>
                  <a href="#case-studies">Case Studies</a>
                  <a href="#plans">Plans</a>
                  <a href="/how-it-works">How it works</a>
                  <a href="#faq">FAQ</a>
                  <a className="menu-only" href="/login">Sign in</a>
                  <a className="menu-only" href="tel:+19413279667">📞 (941) 327-9667</a>
                </div>
              </div>
              <a className="nav-phone" href="tel:+19413279667">📞 (941) 327-9667</a>
              <a className="btn nav-signin" href="/login">Sign in</a>
              <a className="btn btn-primary" href="#contact">Get a Free Quote</a>
            </div>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="top" style={{ padding: 0 }}>
        <MatrixRain />
        <div className="glow" aria-hidden />
        <div className="gridfloor" aria-hidden />
        <div className="wrap">
          <div className="hero-inner">
            <div>
              <span className="eyebrow light">Marketing + AI Receptionist for Home Services</span>
              <h1><span data-words>Get found. Get chosen.</span> <span className="grad" data-words>Never miss the call.</span></h1>
              <p className="lead">Biggify builds your website, runs your Google Business Profile and social media, and answers your phone 24/7 with an AI receptionist — so your business stops leaking jobs at every step.</p>
              <div className="hero-cta">
                <a className="btn btn-primary" href="#contact">Get a Free Quote</a>
                <a className="btn btn-ghost call-btn" href="tel:+19413279667">📞 Call our receptionist</a>
              </div>
              <div className="trust">
                <span><b>Website</b> that converts</span>
                <span><b>Google</b> Business Profile</span>
                <span><b>Social</b> media</span>
                <span><b>24/7</b> AI receptionist</span>
              </div>
            </div>

            <a className="stack case-hero" href="#case-studies" aria-label="Case study: Rock Solid Tile">
              <div className="head"><span className="dot"></span><span>Case study · Rock Solid Tile</span></div>
              <div className="case-shot"><img src="/work/rsitile-after.jpg" alt="Rock Solid Tile, the new website by Biggify" /><span className="chip">New site · live</span></div>
              <div className="case-stat"><b><span data-count="16" data-prefix="$" data-suffix="k">$16k</span></b><span>added in first 3 months</span></div>
              <div className="case-meta"><div><b>Rock Solid Tile</b><small>Tile installation · Southwest Florida</small></div><span className="more">Read the case study →</span></div>
            </a>
          </div>
        </div>
        <div className="clients">
          <div className="wrap">
            <span className="lab">Built for</span>
            <div className="track"><div>
              {[...WORK, ...WORK].map((w, i) => <span key={i}>{w.name}</span>)}
            </div></div>
          </div>
        </div>
      </section>

      {/* WHERE JOBS GET LOST */}
      <section className="dots">
        <div className="wrap">
          <div className="section-head rv">
            <span className="eyebrow">The problem</span>
            <h2>Jobs leak out at three points. We plug all three.</h2>
            <p>Most home-service businesses don&apos;t have a demand problem — they have a leak problem. Here&apos;s where the work slips away before it ever hits your schedule.</p>
          </div>
          <div className="leak">
            <div className="card tilt rv"><div className="glare"></div><div className="n">01</div>
              <div className="stage">Leak 1</div>
              <h3>They never find you</h3>
              <p>When someone searches for your trade in your town, the businesses on the map get the call. If your Google profile is thin or your website isn&apos;t ranking, you&apos;re invisible at the exact moment they&apos;re ready to buy.</p>
              <div className="fix">Fixed by: <b>Google Business Profile</b> + <b>Website</b></div>
            </div>
            <div className="card tilt rv d1"><div className="glare"></div><div className="n">02</div>
              <div className="stage">Leak 2</div>
              <h3>They find you, but don&apos;t pick you</h3>
              <p>An outdated site, no reviews, no photos of your work — and they hit the back button and call the next name. You lost the job without ever knowing they looked.</p>
              <div className="fix">Fixed by: <b>Website</b> + <b>Social Media</b></div>
            </div>
            <div className="card tilt rv d2"><div className="glare"></div><div className="n">03</div>
              <div className="stage">Leak 3</div>
              <h3>They call, and nobody answers</h3>
              <p>You&apos;re on a ladder or under a sink. The call goes to voicemail. Most callers won&apos;t leave one — they call your competitor, who picks up.</p>
              <div className="fix">Fixed by: <b>AI Receptionist</b></div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES OVERVIEW */}
      <section className="gold" id="services">
        <div className="wrap">
          <div className="section-head rv">
            <span className="eyebrow">What we do</span>
            <h2>Four services. One goal: more booked jobs.</h2>
            <p>Take the whole stack, or start with the one piece that&apos;s leaking the most.</p>
          </div>
          <div className="svc-grid">
            <a className="svc rv" href="#websites"><div className="ico">{Ico.globe}</div><h3>Website Design</h3><p>A fast, mobile-first site built to turn visitors into phone calls — with your reviews, your work, and click-to-call everywhere.</p><span className="more">See our work →</span></a>
            <a className="svc rv d1" href="#gbp"><div className="ico">{Ico.search}</div><h3>Google Business Profile</h3><p>Own the map pack in the towns you serve. Optimized profile, active posting, citations, and a steady stream of reviews.</p><span className="more">Learn more →</span></a>
            <a className="svc rv d2" href="#social"><div className="ico">{Ico.social}</div><h3>Social Media</h3><p>Consistent posting that turns your everyday job photos into proof — so you stay top of mind without touching it.</p><span className="more">Learn more →</span></a>
            <a className="svc rv d3" href="#receptionist"><div className="ico">{Ico.phone}</div><h3>AI Receptionist</h3><p>Answers every call 24/7 in a natural voice, books the appointment onto your calendar, and texts the customer for details.</p><span className="more">Hear it work →</span></a>
          </div>
        </div>
      </section>

      {/* WEBSITES, with the slider */}
      <section className="white" id="websites">
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <span className="eyebrow">Website Design</span>
              <h2>A website that&apos;s built to get the phone to ring</h2>
              <p className="lead">Most contractor websites are online brochures nobody reads. We build yours like a salesperson: it loads fast, speaks to the towns you serve, shows your work, and makes calling you the obvious next step.</p>
              <ul className="checks">
                <li><b>Mobile-first and fast</b> — most of your customers are searching from their phone, on the couch, mid-emergency.</li>
                <li><b>Click-to-call everywhere</b> — your number is one tap away from every screen.</li>
                <li><b>Pages for the towns you work</b> — so you show up for &quot;water heater repair Sarasota,&quot; not just your business name.</li>
                <li><b>Reviews, licenses, and real photos up front</b> — the trust signals people check before they call.</li>
                <li><b>Wired to your receptionist</b> — chat and call buttons connect straight to Biggify, so the site doesn&apos;t just look good, it books.</li>
              </ul>
              <div className="actions">
                <a className="btn btn-primary" href="#contact">Get a Free Quote</a>
                <a className="link" href="#work">See all the before &amp; afters ↓</a>
              </div>
            </div>
            <div className="rv d1">
              <div className="ba" style={{ ['--x' as any]: '50%' }}>
                <img src="/work/rsitile-before.jpg" alt="Rock Solid Tile, the old website" loading="lazy" />
                <img className="after" src="/work/rsitile-after.jpg" alt="Rock Solid Tile, the new website by Biggify" loading="lazy" />
                <span className="tag l">Before</span><span className="tag r">After</span>
                <div className="bar"></div><div className="knob">⇆</div>
              </div>
              <div className="ba-cap">
                <div><b>Rock Solid Tile</b><span>Tile installation · Southwest Florida</span></div>
                <span className="hint">Drag the handle</span>
                <a className="link" href="https://rsitile.com" target="_blank" rel="noopener" style={{ fontSize: '14px' }}>View live site ↗</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR WORK */}
      <section className="alt" id="work">
        <div className="wrap">
          <div className="section-head rv">
            <span className="eyebrow">Our work</span>
            <h2>Before &amp; after</h2>
            <p>Real Southwest Florida businesses. Same company, same trade — a website that finally works as hard as they do. Hover a card to see the whole new site.</p>
          </div>
          <div className="work-grid">
            {WORK.map((w, i) => (
              <div className={`work rv d${i % 3}`} key={w.key}>
                <div className="shots">
                  {w.before ? (
                    <>
                      <img className="b" src={`/work/${w.key}-before.jpg`} alt={`${w.name}, the old website`} loading="lazy" />
                      <img className="a" src={`/work/${w.key}-after.jpg`} alt={`${w.name}, the new website by Biggify`} loading="lazy" />
                      <div className="seam"></div>
                      <span className="tag">Before</span><span className="tag after">After</span>
                    </>
                  ) : (
                    <>
                      <img className="b" src={`/work/${w.key}-after.jpg`} alt={`${w.name}, website by Biggify`} loading="lazy" />
                      <span className="tag gold">{w.tag}</span>
                    </>
                  )}
                </div>
                <div className="meta">
                  <h3>{w.name}<span className="trade">{w.trade}</span></h3>
                  <a href={w.url} target="_blank" rel="noopener">View live site ↗</a>
                </div>
              </div>
            ))}
          </div>
          <p className="work-note">Eight live sites. Every one built, hosted and kept up by Biggify.</p>
        </div>
      </section>

      {/* GOOGLE BUSINESS PROFILE */}
      <section className="slate" id="gbp">
        <div className="wrap">
          <div className="split rev">
            <div className="card tilt rv"><div className="glare"></div>
              <div className="mono" style={{ fontWeight: 600, color: 'var(--muted)', marginBottom: '12px' }}>What&apos;s included</div>
              <ul className="checks" style={{ marginTop: 0 }}>
                <li><b>Profile optimization</b> — categories, services, hours, service areas, photos, and description dialed in.</li>
                <li><b>Regular posts</b> — 4 Google posts a month on Growth, 10 a month on Super Growth, so Google sees an active business.</li>
                <li><b>Service-area targeting</b> — from your home town on Growth to 3–5 towns on Super Growth.</li>
                <li><b>Keyword coverage</b> — your core services, expanding to your full service line and long-tail searches.</li>
                <li><b>Citations &amp; links</b> — foundational listings, then active link-building as you scale.</li>
                <li><b>Reviews</b> — a request system that runs itself, or a fully managed review campaign.</li>
                <li><b>Reporting</b> — a monthly summary, or full attribution: calls → booked → closed.</li>
              </ul>
            </div>
            <div className="rv d1">
              <span className="eyebrow">Google Business Profile</span>
              <h2>Own the map in the towns you serve</h2>
              <p className="lead">When someone searches &quot;AC repair near me,&quot; the three businesses in the map pack get the calls. Getting there — and staying there — takes consistent work most owners don&apos;t have time for. We do it every week.</p>
              <p>Your profile gets optimized and kept active with posts and photos. Your reviews grow on a schedule instead of by luck. And your listing gets backed up by the citations and content Google wants to see before it trusts you with the top spot.</p>
              <div className="actions">
                <a className="btn btn-primary" href="#contact">Get a Free Quote</a>
                <a className="link" href="#plans">Compare plans ↓</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL MEDIA */}
      <section className="red" id="social">
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <span className="eyebrow">Social Media</span>
              <h2>Stay top of mind between jobs — without posting a thing</h2>
              <p className="lead">Nobody hires a roofer off a viral post. But when a neighbor asks for a recommendation, the business they&apos;ve been seeing all month is the one that gets the name-drop. That&apos;s what consistent social does.</p>
              <ul className="checks">
                <li><b>Your job photos become posts</b> — send us the before-and-afters from the truck and we turn them into proof.</li>
                <li><b>Consistent cadence</b> — 4 posts a month on Growth, 10 on Super Growth, across Facebook, Instagram, and your Google profile — so you never go dark.</li>
                <li><b>Local voice</b> — posts that sound like a business people know, not a marketing agency.</li>
                <li><b>Reviews get reused</b> — every new five-star review becomes content that works twice.</li>
              </ul>
              <div className="actions"><a className="btn btn-primary" href="#contact">Get a Free Quote</a></div>
            </div>
            <div className="post tilt rv d1" style={{ background: 'rgba(7,11,22,.92)' }}><div className="glare"></div>
              <div className="who"><span className="av">R</span><div><b style={{ display: 'block', fontSize: '14.5px' }}>Rapid Water Heater</b><span style={{ fontSize: '12.5px', color: '#8a91b4' }}>Sarasota, FL · Just now</span></div></div>
              <div className="pics"><div className="b">Before</div><div className="a">After</div></div>
              <p>Same-day tankless swap in Venice — old unit was leaking, new one installed and running hot water by 2 PM. Hot water now, no monkey business. 🔧</p>
              <div className="acts"><span className="hot">👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* AI RECEPTIONIST */}
      <div className="stats" id="receptionist">
        <MatrixRain speed={0.4} />
        <div className="wrap">
          <div className="stat-grid">
            <div className="stat rv"><div className="n" data-count="62" data-suffix="%">0%</div><div className="l">of calls to small businesses go unanswered</div></div>
            <div className="stat rv d1"><div className="n" data-count="1200" data-prefix="$" data-suffix="+">$0+</div><div className="l">average value of a single service job</div></div>
            <div className="stat rv d2"><div className="n" data-count="85" data-suffix="%">0%</div><div className="l">of missed callers won&apos;t call back — they call a competitor</div></div>
          </div>
        </div>
      </div>
      <section className="dots">
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <span className="eyebrow">AI Receptionist</span>
              <h2>Every call answered. Every job booked. Even at 9 PM on a Sunday.</h2>
              <p className="lead">Marketing brings the calls. The receptionist makes sure none of them slip away. It picks up instantly in a natural voice, answers questions about your services, books the appointment onto your real calendar, and texts the customer for the details — while you keep working.</p>
              <ul className="checks">
                <li><b>Answers 24/7</b> — no voicemail, no hold music, no &quot;we&apos;ll call you back.&quot;</li>
                <li><b>Books straight to your calendar</b> while the customer is still on the line.</li>
                <li><b>Texts a quick survey</b> — address, issue, preferred time — so you show up ready.</li>
                <li><b>Alerts you instantly</b> by text and email with everything attached.</li>
                <li><b>Keep your number</b> — forward the calls you can&apos;t grab, or all of them.</li>
                <li><b>Your own dashboard</b> — every call, booking, and conversation logged in one place.</li>
              </ul>
              <div className="actions">
                <a className="btn btn-primary call-btn" href="tel:+19413279667">📞 Call it right now</a>
                <a className="link" href="/how-it-works#calculator">What are missed calls costing you? →</a>
              </div>
            </div>
            <div className="phone rv d1">
              <div className="bar"><span>9:41</span><span>● ● ●</span></div>
              <div className="call-head"><span className="dot"></span><span>Incoming call — answered by Biggify</span></div>
              <div className="typing"><i></i><i></i><i></i></div>
              <div className="bubble b-in">Thanks for calling! I can get you booked. What&apos;s the issue you&apos;re having?</div>
              <div className="bubble b-out">My AC stopped blowing cold air.</div>
              <div className="bubble b-in">Got it. I have Tuesday 9–11 AM open — shall I book that?</div>
              <div className="bubble b-out">Yes please 👍</div>
              <div className="bubble b-in">You&apos;re booked! I just texted you 3 quick questions so the tech arrives ready.</div>
              <button type="button" className="replay">Play it again</button>
            </div>
          </div>
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="dark redglow" id="case-studies">
        <MatrixRain speed={0.3} />
        <div className="wrap">
          <div className="section-head rv">
            <span className="eyebrow light">Case study</span>
            <h2 style={{ color: '#fff' }}>Proof, not promises</h2>
            <p>Real Southwest Florida businesses, real numbers.</p>
          </div>
          <div className="feat rv">
            <div className="feat-shot"><img src="/work/rsitile-after.jpg" alt="Rock Solid Tile, the new website by Biggify" loading="lazy" /><span className="chip">Rock Solid Tile · rsitile.com</span></div>
            <div className="feat-copy">
              <span className="mono" style={{ color: 'var(--accent)' }}>Tile installation · Southwest Florida</span>
              <div className="feat-stat"><b><span data-count="16" data-prefix="$" data-suffix="k">$16k</span></b><span>added in first 3 months</span></div>
              <p>Rock Solid Tile came on as a founding client. Biggify rebuilt the website and took over the marketing. Three months in, the work it brought in added up to sixteen thousand dollars.</p>
              <div className="actions"><a className="btn btn-primary" href="#contact">Get a Free Quote</a><a className="link light" href="https://rsitile.com" target="_blank" rel="noopener">See the site ↗</a></div>
            </div>
          </div>
          <p className="plans-note">More case studies are on the way as our founding clients pass their first 90 days.</p>
        </div>
      </section>

      {/* PLANS */}
      <section className="dark" id="plans">
        <MatrixRain speed={0.35} />
        <div className="wrap">
          <div className="section-head rv">
            <span className="eyebrow light">Plans</span>
            <h2 style={{ color: '#fff' }}>Pick your level of growth</h2>
            <p>Every plan is quoted to your business — your trade, your service area, your goals. No two shops are the same, so no price tags here. Tell us about yours and we&apos;ll build the number.</p>
          </div>

          <div className="plan-grid">
            <div className="plan rv">
              <div className="tier">Tier 1</div>
              <h3>Growth</h3>
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

            <div className="plan featured rv d1">
              <span className="tag">⭐ Most complete</span>
              <div className="tier">Tier 2</div>
              <h3>Super Growth</h3>
              <p className="for">For the shop ready to dominate multiple towns and stop missing calls entirely.</p>
              <div className="price">Custom quote<small>Built around your business</small></div>
              <ul>
                <li>Everything in Growth</li>
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

            <div className="plan rv d2">
              <div className="tier">Standalone</div>
              <h3>Receptionist Only</h3>
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

          <div className="compare-wrap rv">
            <table className="compare">
              <thead>
                <tr><th>What you get</th><th>Growth</th><th className="hi">Super Growth</th><th>Receptionist Only</th></tr>
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
          <p className="plans-note">Not sure which fits? <a href="#contact" style={{ color: '#fff', textDecoration: 'underline' }}>Book a 15-minute call</a> — we&apos;ll tell you honestly where your leak is.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="white" id="faq">
        <div className="wrap" style={{ maxWidth: '820px' }}>
          <div className="section-head rv">
            <span className="eyebrow">FAQ</span>
            <h2>Questions, answered</h2>
          </div>
          <div className="rv">
            <details open><summary>Do I have to take everything, or can I start with one service?</summary><p>Start wherever your biggest leak is. Plenty of businesses begin with just the receptionist, or just Growth, and add on later. The plans are built so the pieces work on their own and work better together.</p></details>
            <details><summary>Do I have to change my phone number?</summary><p>No. You keep your existing number. You simply forward calls you can&apos;t answer to Biggify, so the calls you&apos;d otherwise miss get caught — while you still take every call you can.</p></details>
            <details><summary>Will the receptionist sound like a robot?</summary><p>No. Biggify uses a natural, professional AI voice that greets callers, answers common questions, and books the job like a great front-desk receptionist would. Call <a className="link" href="tel:+19413279667">(941) 327-9667</a> right now and hear it.</p></details>
            <details><summary>Do I own my website and domain?</summary><p>Yes. Your domain stays in your name and the site is yours. We build it, host it, and keep it updated while you&apos;re with us — but it&apos;s your business&apos;s asset, not ours.</p></details>
            <details><summary>How does the text survey work?</summary><p>After a call, the customer receives a short text with a few quick questions so you have the address, the issue, and their preferred time before you follow up. Customers can reply STOP at any time to opt out.</p></details>
            <details><summary>What do the reports actually show me?</summary><p>On Growth you get a monthly summary of your rankings, profile activity, and reviews. On Super Growth you get the full attribution loop — which calls came from where, which ones got booked, and which ones closed — so you can see marketing turn into money.</p></details>
            <details><summary>How fast can I get set up?</summary><p>The receptionist is usually live within a few days. Website and marketing timelines depend on your plan and how much we&apos;re building — we&apos;ll give you a clear schedule in your quote.</p></details>
            <details><summary>What does it cost me to find out?</summary><p>Nothing. We start with a free 15-minute call and a demo using your real business scenario, so you can see and hear it before you commit to anything.</p></details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-final" id="contact">
        <div className="glow" aria-hidden />
        <div className="wrap">
          <span className="eyebrow light" style={{ justifyContent: 'center' }}>Free 15-minute call</span>
          <h2 style={{ marginTop: '14px' }}>Let&apos;s find your leak</h2>
          <p>Book a free 15-minute call. We&apos;ll look at how you&apos;re showing up online, tell you honestly where the jobs are slipping, and quote a plan that fits — or call our receptionist right now and hear it for yourself.</p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
            <a className="btn btn-primary call-btn" href="tel:+19413279667">📞 Call our receptionist</a>
          </div>
          <div
            className="calendly-inline-widget"
            data-url="https://calendly.com/boogmasterjones/biggify-appointment?hide_event_type_details=1&hide_gdpr_banner=1"
            suppressHydrationWarning
          ></div>
          <p style={{ marginTop: '22px', fontSize: '15px', color: '#aeb4d2' }}>Or email us: <a href="mailto:gobiggify@gmail.com" style={{ color: '#fff', textDecoration: 'underline' }}>gobiggify@gmail.com</a></p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div>
              <a className="logo" href="#top"><img src="/LOGO-light.png" alt="Biggify" style={{ height: '38px' }} /></a>
              <p style={{ maxWidth: '340px', marginTop: '10px' }}>Marketing &amp; AI receptionist for home service businesses. Get found, get chosen, never miss the call.</p>
            </div>
            <div className="foot-links">
              <a href="#services">Services</a>
              <a href="#work">Our Work</a>
              <a href="#plans">Plans</a>
              <a href="/how-it-works">How it works</a>
              <a href="#faq">FAQ</a>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms</a>
              <a href="/sms">Text Messaging</a>
              <a href="mailto:gobiggify@gmail.com">Contact</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© <span id="yr"></span> Biggify. All rights reserved. Biggify is a service of <strong>BIGGIFY LLC</strong>.</span>
            <span className="mono">Made for the trades · Southwest Florida</span>
          </div>
        </div>
      </footer>
    </>
  );
}
