# Cold call practice line

Call **(941) 646-3030** and practice cold calls against an AI prospect. Every call gets a new prospect, a new
business, a new drill and a new voice (men and women). When the call is over, a coach tells you how you did, and
you get the full scorecard and transcript by email.

## How a call goes

1. **You call.** The coach reads you the brief, the way you'd see it before a real dial: who you're calling, their
   business and town, your "one true thing" from their Google listing, and the goal.
2. **Say "ready".** The phone "rings" and the prospect picks up. (Or just start with your opener.)
3. **Do the call.** The prospect acts like a real owner: busy, short, has objections, can hang up on you. They
   have problems they only tell you if you ask good questions.
4. **The coach steps in** when the call ends (they hang up, you book it, they take a message), or any time you say
   **"coach"**. You get a score out of 10, one thing you did well, the one fix with the exact words to say next
   time, and something the prospect was hiding that you could have found.
5. **Then say:**
   - **"again"**: same prospect, from the top
   - **"next"**: a new prospect
   - **"menu"**: pick a drill
   - **"resume"**: go back into a call you paused with "coach"
   - or just **ask a question** ("what should I have said when she asked about price?")
   - **"I'm done"**: hang up. Your email comes a minute later.

## The drills

Say **"menu"**, then the number (or the name, or "random"):

| # | Drill | What you practice |
|---|---|---|
| 1 | Full cold call | The whole call, start to finish. Goal: the 20-minute meeting. |
| 2 | Objection gauntlet | Objection after objection. Handle each one and still book it. |
| 3 | Gatekeeper | The office manager, spouse or front desk answers. Get through, or get the owner's name and best time. |
| 4 | Opener reps | Only the first 20 seconds. Quick reps. |
| 5 | Booking the meeting | They're interested but slippery. Turn "maybe" into a day and time. |
| 6 | Discovery questions | They answer only what you ask. Find their real problems first. |
| 7 | Hot seat | Angry, suspicious ("is this a scam?") or "I'm on a roof" owners. Stay calm, do the right thing. |
| 8 | Voicemail | Leave a live voicemail. Stop talking and it's scored. |

The prospects are the people you actually call: plumbers, roofers, tile, pools, pavers, remodelers, painters and
more, in Port Charlotte and the towns around it, and in the out-of-state cities on your lists (Spokane, Mesa,
Austin). Out-of-state calls remind you the meeting is a phone call from your cell.

Their personalities change too: busy and gruff, friendly but won't commit, burned by a marketing company before,
price shopper, already has a guy, "just send me an email", not interested, chatty, suspicious, old-school, wants
specifics, on a job, angry, "I have to ask my wife". Some calls are easy, some are tough. Score 8 or more and the
next one gets harder; score 4 or less and it gets easier.

## Words that work any time

- **"coach"** (or "time out", "feedback", "how did I do"): stop and get feedback
- **"start over"**: same call, from the top
- **"menu"** or **"next"** on their own: drop this call and move on
- **"I'm done"**: hang up

## What the coach grades on

Your own call card and flashcards: the 20-second opener with the one true thing, two or three questions and
listening, the playbook answers to objections, asking for the meeting with two specific times, getting the number
for the confirmation text, and getting off the phone after the yes. Three things fail any call no matter what:
saying anything untrue (like "companies we work with" before you have them), not accepting a no, and pressure.

## The email

After each practice call you get one email (to the Biggify alert email) with: every run's score and what the
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
4. Call 646-3030. You should hear "Cold call practice. Drill: ...".

**To switch back** to the receptionist test line: same place, set 646-3030's Connection or App back to
**Biggify AI Receptionist**. Nothing else needs to change.

### Optional settings (Render, receptionist service, Environment)

None are needed. Add only if you want to change something:

| Setting | What it does |
|---|---|
| `PRACTICE_REPORT_EMAIL` | Where the practice email goes (default: the alert email). `off` turns the email off. |
| `PRACTICE_ALLOWED_CALLERS` | Only these numbers can use the line, e.g. your cell `9415551234`. Anyone else hears "not in service". |
| `PRACTICE_VOICES` | Replace the voice list, e.g. `Telnyx.NaturalHD.luna:f,Telnyx.NaturalHD.orion:m` |
| `PRACTICE_MODEL` | The prospect's AI model (default: the receptionist's, Haiku: fastest) |
| `PRACTICE_COACH_MODEL` | The coach's model (default `claude-sonnet-5-5`) |
| `PRACTICE_REVIEW_MODEL` | The emailed review's model (default `claude-opus-5-5`) |
| `PRACTICE_MAX_MINUTES` | Longest practice call (default 30) |

Cost: roughly 10 to 20 cents of AI per practice call (the prospect, the coach and the emailed review), plus Telnyx minutes on 646-3030. No new services.
