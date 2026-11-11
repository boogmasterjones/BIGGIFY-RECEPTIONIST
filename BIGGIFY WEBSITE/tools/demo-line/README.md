# Demo receptionist page (magnet #4): how to switch the number on

Right now (941) 646-3030 is Wyatt's cold-call practice line. So the page shows "The demo line opens soon" and an email sign-up. Each sign-up reaches Hubert as `demo_line`.

## The one step, when drilling is done

In `BIGGIFY WEBSITE/tools/config.js`, change:

```js
DEMO_LINE_ON: false,
```

to:

```js
DEMO_LINE_ON: true,
```

Then commit, and push when Wyatt says "go deploy". That's all for the website. The page then shows a big "Call (941) 646-3030" button instead of the sign-up.

## Before flipping it (not website work)

- Point 646-3030 back at the demo receptionist in Telnyx and in the receptionist config. The greeting must say it's an AI demo and that the call is recorded. Don't touch this while the number is the practice line.
- Email everyone who signed up. In Hubert, they're the prospects with `last_magnet = demo_line`.
