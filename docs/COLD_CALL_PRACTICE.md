# Cold call practice line

Call **(941) 646-3030** and practice cold calls against an AI prospect. You get the call ready on Hubert's
**Sales drilling** tab (Sales group), then dial: the prospect picks up like a real person, with nothing read out
first. When the call is over, the scorecard, the coach's notes, the transcript and what the prospect was hiding
show up on the tab, and you still get the email.

## How a call goes

1. **Open Sales drilling in Hubert** (on your phone is fine). The armed drill is there: which drill, how hard,
   who you're calling (owner, business, trade, town, local or out of state), your "one true thing", the goal, and
   the opener and talking points for that drill. The prospect's personality, objections and hidden problems are
   NOT shown: you find those on the call.
   - **New drill** gives you a random one. **Pick a drill** keeps to that drill from then on, until you press New
     drill again. **Easier / Harder** gives you a new prospect one step easier or harder. **Re-run this one**
     arms the prospect from your last call again, from the top.
2. **Call 646-3030.** The prospect answers straight away: "Hello, Smith Plumbing, this is Mike." On the gatekeeper
   drill someone else answers; on the voicemail drill you get the voicemail. No brief, no "say ready".
3. **Do the call.** The prospect acts like a real owner: busy, short, has objections, can hang up on you. They
   have problems they only tell you if you ask good questions.
4. **The call ends like a real one**: you book it, they hang up, they take a message, or you hang up. On the
   voicemail drill, stop talking for about five seconds and the line hangs up.
5. **Look at the tab.** In about half a minute the scorecard (score out of 10, one thing you did well, the one
   fix with the exact words, something they were hiding), the transcript and the reveal (personality, their
   situation, pains, objections, what would have made them say yes) are there. Refresh if it isn't yet.
6. **The next drill is already armed.** Same drill if you picked one, otherwise random. Score 8 or more and it
   gets harder; 4 or less and it gets easier. Read the new brief and dial again.

If you call with nothing armed (for example the first time), the line makes a drill on the spot. You'll see what
it was on the tab afterwards.

### Hidden words (never said on the call)

- **"coach"** or **"time out"** (also "feedback", "how did I do"): pauses the call. The coach gives quick
  feedback so far, without giving away what the prospect is hiding. Then say **"resume"** to go back in,
  **"again"** for the same prospect from the top, ask a question, or **"done"** to hang up. "Next" hangs up too:
  the next drill is on the tab.
- **"start over"**: the same prospect picks up again, from the top.
- **"I'm done"** on its own: ends the drill and hangs up. It's still scored.

## The drills

Pick one on the Sales drilling tab, or press New drill for a random one:

| # | Drill | What you practice |
|---|---|---|
| 1 | Full cold call | The whole call, start to finish. Goal: the 20-minute meeting. |
| 2 | Objection gauntlet | Objection after objection. Handle each one and still book it. |
| 3 | Gatekeeper | The office manager, spouse or front desk answers. Get through, or get the owner's name and best time. |
| 4 | Opener reps | Only the first 20 seconds. Quick reps. |
| 5 | Booking the meeting | They're interested but slippery. Turn "maybe" into a day and time. |
| 6 | Discovery questions | They answer only what you ask. Find their real problems first. |
| 7 | Hot seat | Angry, suspicious ("is this a scam?") or "I'm on a roof" owners. Stay calm, do the right thing. |
| 8 | Voicemail | Leave a live voicemail. Stop talking for about five seconds and it hangs up. |

The prospects are the people you actually call: plumbers, roofers, tile, pools, pavers, remodelers, painters and
more, in Port Charlotte and the towns around it, and in the out-of-state cities on your lists (Spokane, Mesa,
Austin). Out-of-state calls remind you the meeting is a phone call from your cell.

Their personalities change too: busy and gruff, friendly but won't commit, burned by a marketing company before,
price shopper, already has a guy, "just send me an email", not interested, chatty, suspicious, old-school, wants
specifics, on a job, angry, "I have to ask my wife". Some calls are easy, some are tough. Score 8 or more and the
next one gets harder; score 4 or less and it gets easier.

## What the coach grades on

Your own call card and flashcards: the 20-second opener with the one true thing, two or three questions and
listening, the playbook answers to objections, asking for the meeting with two specific times, getting the number
for the confirmation text, and getting off the phone after the yes. Three things fail any call no matter what:
saying anything untrue (like "companies we work with" before you have them), not accepting a no, and pressure.

## The email

The scorecard is on the Sales drilling tab first. After each practice call you also get one email (to the Biggify alert email) with: every run's score and what the
coach said, a longer written review (lines you said and better versions, what you missed, what to drill next), and
the transcripts. The transcripts come from speech-to-text, so a few words may be off.

## If something's off

- **You hear nothing after the call connects**: hang up and call again. That voice gets skipped from then on.
- **It keeps mishearing you**: speak a little slower, off speakerphone.
- **Calls cut off at 30 minutes** of practice. Call back for more.

---

## Setup (one time, after the push)

The code is on the receptionist server. Nothing changes for client lines: they reach the receptionist through
Hubert's "Hubert call tracking" app, not through 646-3030.

**1. Push the code** (from the `biggify automation` folder): `git push origin main`. Render deploys it in a few
minutes. Check it's live: open https://biggify-receptionist.onrender.com/practice-voices. It should show
`{"speakerEventsSeen":false,"bad":{}}`.

**2. Make the practice app in Telnyx** (this leaves the receptionist app alone):
1. Go to portal.telnyx.com and sign in.
2. Left menu: **Voice**, then **Programmable Voice**. Open the **TeXML Applications** tab.
3. Click **Add new App** (it may say **Create TeXML App**).
4. **Application name:** `Biggify Cold Call Practice`
5. **Voice method / Webhook method:** `POST`
6. **Voice URL / Webhook URL:** `https://biggify-receptionist.onrender.com/practice-call-telnyx`
7. Leave everything else as it is (no outbound profile needed). Click **Save**.

**3. Move 646-3030 to it:**
1. Left menu: **Numbers**, then **My Numbers**.
2. Find **+1 941-646-3030**.
3. In its **Connection or App** column (or open the number and find **Connection/Application**), pick
   **Biggify Cold Call Practice**. Save.
4. Call 646-3030. A prospect should answer ("Hello, ..."), with nothing read out first.

**To switch back** to the receptionist test line: same place, set 646-3030's Connection or App back to
**Biggify AI Receptionist**. Nothing else needs to change.

## The Sales drilling tab (2026-11-11)

How it fits together:

- **The phone server owns the drills.** It makes them (the same scenario maker as always), keeps them in the
  receptionist Supabase project (table `practice_drills`, migration `supabase/migrations/014_practice_drills.sql`),
  takes the armed one when 646-3030 rings, scores the call afterwards and arms the next one.
- **Hubert never touches the receptionist database for this** (it stays read-only there). The tab asks the phone
  server, server to server, with a shared secret:
  - `GET /practice-api/state`: the armed drill (the brief only), the drill on the phone now, the last few finished
    drills with scorecard, transcript and the reveal.
  - `POST /practice-api/arm` with `{ "mode": "random" | "drill" | "easier" | "harder" | "rerun", "drill": "<id>" }`.
  - Both need the header `Authorization: Bearer <PRACTICE_API_SECRET>`. Unset (or under 24 characters) the API
    answers 503; a wrong secret is 401; 10 wrong tries in a minute from one address are turned away (429).
- **Hidden traits stay hidden.** The armed and live drills go out through an allow-list (drill, difficulty, owner
  name, business, trade, town, state, time zone, the one true thing, the goal and what is scored). Personality,
  situation, pains, objections, what makes them say yes, the pickup line and the voice only come back once the
  drill is done.
- **One armed drill at a time** (a unique index on `status = 'armed'`). Arming replaces the old one.
- **After a call** the next drill is armed automatically: the same drill when you picked one on the tab, random
  otherwise, with the difficulty moved by the score. If you armed something yourself during the call, that one is
  kept. A call where you never spoke puts the same drill back.
- **Without Supabase** (local runs, tests) the drills live in memory and are lost on a restart.

### Setting it up (after the owner says "go deploy")

1. **Receptionist Supabase**, SQL Editor: run `supabase/migrations/014_practice_drills.sql`.
2. **Render**, receptionist service, Environment: add `PRACTICE_API_SECRET` = a long random string (32 or more
   characters; for example run `openssl rand -hex 32`). Save (Render redeploys).
3. **Push this code** (the receptionist). Check https://biggify-receptionist.onrender.com/practice-api/state answers
   401 (not 404, not 503).
4. **Netlify** (Hubert), Site configuration, Environment variables: add `PRACTICE_API_SECRET` with the SAME value.
   `PRACTICE_API_URL` is optional (default `https://biggify-receptionist.onrender.com`).
5. **Push Hubert.** Open Sales, then Sales drilling: press New drill, then call 646-3030.

### Optional settings (Render, receptionist service, Environment)

None of these are needed. Add only if you want to change something:

| Setting | What it does |
|---|---|
| `PRACTICE_API_SECRET` | Needed for Hubert's Sales drilling tab (see above). Same value on Netlify. |
| `PRACTICE_REPORT_EMAIL` | Where the practice email goes (default: the alert email). `off` turns the email off. |
| `PRACTICE_ALLOWED_CALLERS` | Only these numbers can use the line, e.g. your cell `9415551234`. Anyone else hears "not in service". |
| `PRACTICE_VOICES` | Replace the voice list, e.g. `Telnyx.NaturalHD.luna:f,Telnyx.NaturalHD.orion:m` |
| `PRACTICE_MODEL` | The prospect's AI model (default: the receptionist's, Haiku: fastest) |
| `PRACTICE_COACH_MODEL` | The coach's model (default `claude-sonnet-5-5`) |
| `PRACTICE_REVIEW_MODEL` | The emailed review's model (default `claude-opus-5-5`) |
| `PRACTICE_MAX_MINUTES` | Longest practice call (default 30) |

Cost: roughly 10 to 20 cents of AI per practice call (the prospect, the scorecard and the emailed review), plus Telnyx minutes on 646-3030. No new services.
