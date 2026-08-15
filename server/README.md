# Biggify — AI Voice Receptionist (server)

Answers phone calls with a Claude-powered receptionist over **Twilio ConversationRelay**, books appointments into **Cal.com**, texts the caller a **branded SMS survey**, alerts the owner, and shows everything on a **branded dashboard**.

It runs **without every integration configured** — Cal.com and SMS fall back to mock/log mode — so you can demo the voice + booking flow before 10DLC and Cal.com are live.

## What's here

| File | Role |
|---|---|
| `src/index.js` | Express HTTP (TwiML webhook, survey form, dashboard) + WebSocket for ConversationRelay |
| `src/claude.js` | The receptionist brain: Claude conversation + tool loop (`check_availability`, `book_appointment`) |
| `src/prompt.js` | System prompt + spoken greeting |
| `src/calcom.js` | Cal.com booking (live or mock) |
| `src/twilioSms.js` | SMS survey + owner alerts (live or log) |
| `src/pages.js` | Branded survey form, thank-you page, dashboard |
| `src/store.js` | In-memory lead store (swap for Supabase/Airtable later) |

## Run it locally

```bash
cd server
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY at minimum
npm start
```

Visit `http://localhost:8080/dashboard` — empty until a call comes in.

### Point Twilio at it (to take real calls)

Twilio needs a public HTTPS URL. Easiest for local dev is ngrok:

```bash
npx ngrok http 8080
```

1. Put the ngrok `https://…` URL in `.env` as `PUBLIC_URL`, restart the server.
2. In the Twilio Console, set your number's **Voice → A call comes in** webhook to:
   `https://YOUR-NGROK-URL/incoming-call` (HTTP POST).
3. Call your Twilio number. The AI answers.

## Configuration notes

- **Model / latency.** Defaults to `claude-opus-5`. For snappier real-time voice, set `CLAUDE_MODEL=claude-sonnet-5` or `claude-haiku-4-5` in `.env`. Adaptive thinking is left **on** (with low effort) because turning it off can make the model *speak* a tool call instead of *making* it.
- **Voice.** `RECEPTIONIST_VOICE` is a ConversationRelay TTS voice (e.g. `en-US-Journey-O`, `Polly.Joanna-Neural`).
- **Cal.com.** Set `CALCOM_API_KEY` + `CALCOM_EVENT_TYPE_ID` to book real slots. The v2 API shape shifts between versions — if bookings 400, adjust the two `fetch()` blocks in `calcom.js` (mock mode keeps the demo working meanwhile).
- **SMS.** Needs Twilio creds **and** an approved 10DLC campaign to text real customers. Until then it logs the survey text to the console so you can see the flow.

## Deploying (later)

The marketing site auto-deploys to Netlify. This **server** needs a host that keeps a WebSocket open — Netlify Functions can't. Use **Render**, **Railway**, or **Fly.io**: point it at the repo, set the root/start command to `cd server && npm install && npm start`, add the env vars, and use the resulting URL as `PUBLIC_URL` + the Twilio voice webhook.

## The call flow

```
Caller dials Twilio number
  → /incoming-call returns TwiML <ConversationRelay> pointing at /ws
  → ConversationRelay streams speech; Claude replies, asks, and books via Cal.com
  → On booking: SMS survey texted to caller + alert texted to owner
  → Caller fills branded survey → owner re-alerted with full details
  → Everything visible on /dashboard
```
