# Editing gobiggify.com yourself

You can change the words and photos on your guides (your articles) and your free tools pages yourself, and write new
guides, without asking anyone. It works like Alex's site editor: you open the real page, click the words, type, and
press **Publish** when you're done.

The address is **https://gobiggify.com/editor**

---

## Everyday use

### Change words on a guide

1. Go to **gobiggify.com/editor**. If it asks you to sign in, use your normal Biggify dashboard email and password.
   It takes you straight back to the editor.
2. Under **Guides (your articles)**, find the guide and press the red **Edit** button.
3. The real page opens. Move your mouse over the page: anything you can change gets a dashed red outline.
4. **Click the words** you want to change. A white box appears around them and a small black toolbar above them.
5. Type your change. Then press **Done** (or the **Enter** key). It saves by itself. "Saved as a draft" shows at the
   bottom.
   - Changed your mind while typing? Press **Cancel** (or the **Esc** key).
   - Want a new line inside the same paragraph? Hold **Shift** and press **Enter**.
6. Repeat for anything else on the page.

Nobody sees your changes yet. They are drafts until you publish (see below).

### The toolbar above the words

| Button | What it does |
|---|---|
| **B** / **I** | Bold / italic for the words you selected |
| **Link** | Select some words first, press Link, type the address (like `https://...` or `/guides/still-no-calls`) |
| **+ Paragraph** | Adds a new paragraph under this one. Click it and type over "New paragraph..." |
| **+ Item** | (on a bullet point) Adds a new bullet under this one |
| **+ Photo** | Adds a photo under this paragraph: pick a photo from your computer or phone |
| **Remove** | Takes this paragraph, bullet or photo off the page |
| **Cancel** / **Done** | Throw away / keep what you just typed |

### Photos

- **Change a photo**: click the photo, pick the new one, then type a few words describing it (Google reads these).
- **Add a photo**: click the paragraph it should go under, press **+ Photo**, pick the photo.
- Big photos from your phone are fine. The editor shrinks them so the page stays fast.
- Only real job photos, like everywhere else on your sites.

### The bar at the bottom of the page

| Button | What it does |
|---|---|
| **← All pages** | Back to the list of pages |
| **Title & description** | The page title and the short description Google shows in search results |
| **Click links** | Turns editing off for a moment so you can click links and open the folded sections. Press **Back to editing** after |
| **View live page** | Opens the page as visitors see it right now (without your drafts) |
| **Changes & Publish** | Back to the list, where the Publish button is |

### Publish (make it live)

1. Press **Changes & Publish** (or go to gobiggify.com/editor).
2. At the top, **Changes not published yet** lists every page you changed.
   - **Open** takes you back to that page.
   - **Undo** puts that one page back the way it is on the live site.
   - **Undo everything** throws away all your drafts.
3. Press the red **Publish** button and confirm.
4. The live site updates in about 1 to 2 minutes. You can publish one change or a whole day of changes at once (one
   publish = one website update).

### Write a new guide (a new article)

1. On gobiggify.com/editor, press **+ New guide**.
2. Fill in:
   - **Title**: the big headline.
   - **Topic**: the small red label, like "Google reviews".
   - **Short description**: one or two sentences. It shows on your Guides page and in Google.
   - **Intro**: the first paragraph under the title.
   - **Sections**: a heading and the text for each part. Leave an empty line between paragraphs. Start lines with a
     dash (`- like this`) to make a bullet list. Press **+ Add a section** for more.
3. Press **Make the guide**. The new guide opens in the editor, in the same design as your other guides, with the
   share buttons, your "Your next steps" box and the "More guides" cards already on it. Its card is added to your
   Guides page too.
4. Change anything you like (click the words), add photos, then **Publish**.

### What you can't edit here (yet)

The home page, How it works, Privacy and Terms are built into the app itself, so they aren't in the editor. Ask Claude
to change those. The menu at the top and the footer at the bottom of the guides are shared by every page, so they're
not editable from one page either.

---

## Setup (one time, done by Claude or a web person)

The editor is built into the gobiggify.com app (the `dashboard/` folder of the BIGGIFY-RECEPTIONIST repository).
It needs a few settings in **Vercel → the gobiggify.com project → Settings → Environment Variables**. Add each for
**Production** (and Preview if you want). Names only here; the values are secrets and live only in Vercel.

| Name | What it is | Secret |
|---|---|---|
| `EDITOR_EMAILS` | The email(s) allowed to edit, comma-separated. Use Wyatt's dashboard sign-in email. Nobody else can open the editor, even if they can sign in to the dashboard. | no |
| `EDITOR_GITHUB_REPO` | `boogmasterjones/BIGGIFY-RECEPTIONIST` | no |
| `EDITOR_GITHUB_TOKEN` | A GitHub fine-grained token that can only change this one repository (steps below) | **yes** |
| `EDITOR_GITHUB_DIR` | Optional. The app's folder in the repository. Default `dashboard` (correct today). | no |
| `EDITOR_LIVE_BRANCH` | Optional. The branch Vercel publishes. Default `main`. | no |
| `EDITOR_DRAFTS_BRANCH` | Optional. Where drafts are kept. Default `site-drafts`. | no |

Instead of the token you can use a GitHub App: `EDITOR_GITHUB_APP_ID`, `EDITOR_GITHUB_APP_PRIVATE_KEY` (the whole
`.pem`, or it base64-encoded) and optionally `EDITOR_GITHUB_INSTALLATION_ID`. Hubert already has a GitHub App
(`GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY_BASE64` in Hubert's settings). It could be installed on
BIGGIFY-RECEPTIONIST and its two values copied in, but that key can also reach every client site repo the App is
installed on, so a token limited to this one repository is the safer choice for a website editor.

After adding or changing settings: **Deployments → the latest production deployment → ⋯ → Redeploy**.

### Making the GitHub token (about 3 minutes)

Signed in to the GitHub account that owns BIGGIFY-RECEPTIONIST:

1. github.com → your picture (top right) → **Settings** → at the bottom of the left menu **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name**: `gobiggify site editor`. **Expiration**: the longest offered (put a reminder in your calendar to
   make a new one before it runs out; the editor says "GitHub sign-in failed" when it has).
3. **Repository access** → **Only select repositories** → choose **BIGGIFY-RECEPTIONIST**.
4. **Permissions** → **Repository permissions** → **Contents: Read and write**. Leave everything else as it is
   (Metadata: Read-only is added by itself).
5. **Generate token**, copy it, paste it into Vercel as `EDITOR_GITHUB_TOKEN`. Don't save it anywhere else.

### Drafts must not build

Every save is a commit on the `site-drafts` branch. `dashboard/vercel.json` tells Vercel not to build that branch.
If Vercel's project "Root Directory" is not `dashboard`, that file is not read: then in Vercel → Settings → Git →
**Ignored Build Step** choose "Only build production" (or add the same `git.deploymentEnabled` setting to a
`vercel.json` in the project's root folder).

**Netlify**: the repository also has a `netlify.toml` (the old static site) whose build is skipped only when nothing
in `dashboard/` changed. If that Netlify site is still connected to this repository, each Publish would also start a
Netlify build (credits). Check in Netlify and disconnect/stop builds for it if it's no longer used.

### Sign-in and safety

- Sign-in is the dashboard's normal Supabase sign-in. Wrong-password limits and lockouts come from Supabase
  (Supabase → Authentication → Rate Limits). The email must be confirmed and on `EDITOR_EMAILS`.
- Every editor address needs that sign-in: `/editor…` sends you to the sign-in page, `/api/editor…` answers 401/403.
  Changes are only accepted from the editor's own pages (same website), and are rate-limited per person.
- The public guides and tools are unchanged static files with no editor code in them. The editing marks are only
  added when a page is opened inside the editor.
- The editor can only write guide and tool pages (`dashboard/public/guides/…/*.html`, `dashboard/public/tools/…/*.html`)
  and photos it uploaded (`…/photos/`). Never CSS, JavaScript, app code or settings.
- Everything typed is cleaned on the server: only text, bold, italic, links (web, page, email and phone links) and line
  breaks are kept. Scripts and anything else are removed.
- The GitHub token never reaches the browser and is never logged. GitHub's own error messages are replaced by plain
  ones.

### On a developer's computer

`npm run dev` in `dashboard/` runs the editor in **local mode** when no GitHub settings are present: it edits the files
in the folder directly and Publish only lists what changed (nothing is committed or pushed; commit with git as usual).
Sign in with your normal account and put your email in `EDITOR_EMAILS` in `.env.local`, or skip sign-in with
`EDITOR_DEV_BYPASS=1` (ignored in production and on Vercel).

Tests: `npm test` in `dashboard/`.
