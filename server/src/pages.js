import { config } from './config.js';

const STYLE = `
  :root{--brand:#5b4bff;--brand2:#00c2a8;--ink:#0d1224;--soft:#4a5372;--line:#e7e9f2;
    --grad:linear-gradient(120deg,#6a5bff,#8a52ff 45%,#00c2a8);--font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--font);color:var(--ink);background:#f6f7fb;line-height:1.55}
  .bar{background:#0b1020;padding:16px 0}
  .wrap{width:min(720px,92vw);margin:0 auto;padding:0 4px}
  .logo{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800;font-size:20px}
  .logo .m{width:28px;height:28px;border-radius:8px;background:var(--grad);display:grid;place-items:center;font-size:15px}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;margin:26px auto;box-shadow:0 12px 40px -24px rgba(20,16,80,.4)}
  h1{font-size:26px;letter-spacing:-.02em;margin-bottom:6px}
  p.sub{color:var(--soft);margin-bottom:20px}
  label{display:block;font-weight:600;margin:16px 0 6px}
  input,textarea,select{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:16px;font-family:inherit}
  textarea{min-height:80px}
  button{margin-top:22px;width:100%;padding:14px;border:none;border-radius:999px;background:var(--grad);color:#fff;font-weight:700;font-size:16px;cursor:pointer}
  table{width:100%;border-collapse:collapse;font-size:14.5px}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--soft);font-size:12.5px;text-transform:uppercase;letter-spacing:.05em}
  .tag{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .t-booked{background:#e6fbf4;color:#067a63}.t-new{background:#eef0ff;color:#4a3fd6}
  .t-callback_requested{background:#fff5e6;color:#9a6b00}.t-booking_failed{background:#ffe9e9;color:#b02020}
  .muted{color:var(--soft)}
`;

function shell(title, inner) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Biggify</title><style>${STYLE}</style></head><body>
  <div class="bar"><div class="wrap"><span class="logo"><span class="m">⚡</span> Biggify</span></div></div>
  <div class="wrap">${inner}</div></body></html>`;
}

export function surveyPage(lead) {
  return shell('Quick questions', `<div class="card">
    <h1>A few quick questions</h1>
    <p class="sub">Thanks for calling ${config.business.name}! This takes under 2 minutes and helps us arrive ready to solve your problem.</p>
    <form method="POST" action="/api/survey/${lead.id}">
      <label>What's the service address?</label>
      <input name="address" required placeholder="123 Main St, City" />
      <label>Briefly, what's the issue?</label>
      <textarea name="issue" required placeholder="e.g. AC stopped blowing cold air"></textarea>
      <label>How urgent is it?</label>
      <select name="urgency">
        <option>Emergency — today if possible</option>
        <option>Soon — within a few days</option>
        <option>Flexible — just need it scheduled</option>
      </select>
      <label>Anything else we should know? (optional)</label>
      <textarea name="notes" placeholder="Gate code, pets, best entrance, etc."></textarea>
      <button type="submit">Submit</button>
    </form></div>`);
}

export function thankYouPage() {
  return shell('Thank you', `<div class="card">
    <h1>You're all set 🎉</h1>
    <p class="sub">Thanks! ${config.business.name} has everything they need and will see you at your appointment. If anything changes, just call us back.</p>
  </div>`);
}

export function testChatPage(greeting) {
  return shell('Test the receptionist', `<div class="card">
    <h1>Talk to your AI receptionist</h1>
    <p class="sub">Type to it like you're a customer calling ${config.business.name}. It'll book an appointment and (in this demo) pretend to text the survey. Check <a href="/dashboard">the dashboard</a> after to see the lead.</p>
    <div id="log" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px"></div>
    <form id="f" style="display:flex;gap:8px;margin:0">
      <input id="in" placeholder="Type your message..." autocomplete="off" style="flex:1" />
      <button type="submit" style="width:auto;margin:0;padding:12px 20px">Send</button>
    </form>
  </div>
  <style>
    .b{padding:11px 14px;border-radius:14px;max-width:85%;font-size:15px}
    .them{background:#eef0ff;color:#0d1224;border-bottom-left-radius:4px;align-self:flex-start}
    .me{background:var(--grad);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
  </style>
  <script>
    const id = 'test-' + Math.random().toString(36).slice(2);
    const log = document.getElementById('log');
    const input = document.getElementById('in');
    function bubble(text, who){ const d=document.createElement('div'); d.className='b '+who; d.textContent=text; log.appendChild(d); d.scrollIntoView(); }
    bubble(${JSON.stringify(greeting)}, 'them');
    document.getElementById('f').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const text = input.value.trim(); if(!text) return;
      bubble(text,'me'); input.value=''; input.disabled=true;
      const wait=document.createElement('div'); wait.className='b them'; wait.textContent='…'; log.appendChild(wait);
      try{
        const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,text})});
        const j = await r.json(); wait.remove(); bubble(j.reply || '(no reply)','them');
      }catch(err){ wait.remove(); bubble('Error: '+err.message,'them'); }
      input.disabled=false; input.focus();
    });
  </script>`);
}

export function dashboardPage(leads) {
  const rows = leads.map((l) => {
    const appt = l.appointment ? l.appointment.humanTime : '<span class="muted">—</span>';
    const survey = l.survey
      ? `<div><strong>${l.survey.address}</strong><br/>${l.survey.issue}<br/><span class="muted">${l.survey.urgency}${l.survey.notes ? ' · ' + l.survey.notes : ''}</span></div>`
      : (l.surveySent ? '<span class="muted">sent, awaiting reply</span>' : '<span class="muted">—</span>');
    return `<tr>
      <td>${new Date(l.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
      <td><strong>${l.name || 'Caller'}</strong><br/><span class="muted">${l.phone || ''}</span></td>
      <td>${l.service || '<span class="muted">—</span>'}</td>
      <td>${appt}</td>
      <td>${survey}</td>
      <td><span class="tag t-${l.status}">${l.status.replace('_', ' ')}</span></td>
    </tr>`;
  }).join('');

  return shell('Dashboard', `<div class="card">
    <h1>${config.business.name} — Leads</h1>
    <p class="sub">Every call Biggify answered, with the appointment and the survey details your team needs to show up prepared.</p>
    <div style="overflow-x:auto">
    <table><thead><tr><th>When</th><th>Caller</th><th>Service</th><th>Appointment</th><th>Survey</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="muted">No leads yet. Make a test call to see one appear here.</td></tr>'}</tbody></table>
    </div></div>`);
}
