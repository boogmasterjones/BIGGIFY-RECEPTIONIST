# Biggify

AI receptionist & automation for home-services businesses. Never miss another job.

This repo holds two things:

| Folder | What it is | Where it deploys |
|---|---|---|
| [`BIGGIFY WEBSITE/`](./BIGGIFY%20WEBSITE) | Marketing landing page + privacy/SMS terms (static HTML) | **Netlify** (auto-deploy, see `netlify.toml`) |
| [`server/`](./server) | AI voice receptionist — Twilio ConversationRelay + Claude + Cal.com | **Render / Railway / Fly** (needs a persistent WebSocket) |

## The product

Caller dials a business's number → Biggify's AI answers, books the appointment, and texts the caller a quick survey → the owner gets an instant alert and a branded dashboard with everything they need to show up prepared.

See [`server/README.md`](./server/README.md) to run the receptionist, and `BIGGIFY WEBSITE/` for the site.

## Deploy: Netlify (marketing site)

Netlify is configured via `netlify.toml` to publish the `BIGGIFY WEBSITE` folder. Connect this GitHub repo to Netlify once and every push to `main` redeploys the site automatically.
