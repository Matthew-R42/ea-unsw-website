# EA UNSW website

Static website for Effective Altruism UNSW. The site is six hand-edited HTML
pages plus one shared stylesheet and one shared script, deployed directly to
Cloudflare Pages, like `mtw4244.work`. There is no build step.

| File | Page |
| --- | --- |
| `index.html` | Home |
| `what-is-ea.html` | What is EA?: the idea in big statements, one example, causes, videos |
| `events.html` | Term events timeline |
| `fellowship.html` | Intro Fellowship syllabus, readings, and something to try in every session |
| `fellowship-signup.html` | Fellowship sign-up form |
| `team.html` | About us: exec team, where the money goes, subcommittee |
| `subcommittee.html` | Subcommittee application form |
| `assets/site.css` | All styles and colours (tokens at the top) |
| `assets/site.js` | Menu, animations, calculator, tooltips, forms |
| `functions/api/` | Sign-up and cancel endpoints (Cloudflare Pages Functions) |
| `lib/mail.js` | Shared code for those endpoints |
| `mail-relay/Code.gs` | Copy of the Google Apps Script that sends the emails (not part of the site) |
| `assets/arc-clubs.png` | Arc Clubs logo used in the footer |
| `assets/og.png` | Picture shown when the site is shared on Discord, WhatsApp and so on |
| `assets/video/` | Thumbnails for the three videos on the What is EA page |

The header and footer are repeated in every page, so a change to the menu or
footer links has to be made in every page.
The home page is the exception: its footer is yellow and joined to the "Come
say hi" section, and its social links are the labelled buttons in that
section (`<ul class="say-hi">`) rather than icons in the footer.

The site contains no API keys or build-time secrets. Do not commit Cloudflare
tokens, API keys, account credentials, or private member information here.

## Updating the site

Each week on `events.html` is one `<section class="wk">` block with a row
(`<div class="ev-row">`) of three boxes, always in this order: indoor event,
outdoor event, fellowship session. A column with nothing that week is a dashed
`<div class="ev-box ev-none">` saying so. Each box is a landscape poster from
`assets/events/` (800 x 400 WebP, made from the 2000 x 1000 posters) with the
event's name and its Date, Time and Where below. To announce a detail, replace
`TBA` in that box's `<dd>`. The dots in the week strip at the top must match
the boxes: yellow `dot ev` for indoor events, white `dot tb` for outdoor
events, grey `dot fe` for fellowship sessions. The whole page (and the three
Week 1 boxes on the home page) can be regenerated with `build_events.py`,
which sits outside the repo, but hand edits work too.

The "Come say hi" band and yellow footer are copied onto every page, so change
them in all seven files.

### Things to try on the fellowship page

Every session on `fellowship.html` has one to three interactive blocks, each a
`<section class="try" id="...">` placed after the session's words and before
its readings. Their behaviour is in `assets/site.js` under "Fellowship:
something to try in every session", one block of code per section, and their
styles are at the end of `assets/site.css`.

| Session | Blocks (`id`) |
| --- | --- |
| 1 | `try-birds` (the bird question), `impact` (guide dog or eyesight) |
| 2 | `try-tail` (twenty health programs), `rich` (income chart) |
| 3 | `try-circle` (moral circle) |
| 4 | `try-future` (people not born yet), `try-risk` (risk per century) |
| 5 | `try-views` (splitting between views) |
| 6 | `try-hours` (80,000 hours), `try-lens` (three questions), `try-pledge` (10% of your pay), `try-cert` (stamp card and certificate preview: 5 of 6 sessions) |

Each block states its sources in the small print underneath it. If you change
a number in `site.js`, change that small print too. A link such as
`fellowship.html#try-lens` opens the right session and scrolls to the block.

## Sign-up emails

The fellowship sign-up and subcommittee forms send through the site. Each
sign-up becomes two emails from the club Gmail (effectivealtruismunsw@gmail.com):
the answers to the club inbox (reply goes to the person), and a confirmation
to the person with a link to cancel. Cancelling emails the club inbox again.
Nothing is stored anywhere else.

Until the steps below are done, or if sending ever fails, the forms fall back
to opening the visitor's own email app with their answers filled in.

One-time set-up (needs the club Google account and the Cloudflare account):

1. Signed in as the club Google account, go to <https://script.google.com>,
   make a new project called "EA UNSW mail relay", and paste in
   `mail-relay/Code.gs`.
2. Make a long random key, for example with `openssl rand -hex 32`. In the
   script, open Project Settings, Script Properties, and add `RELAY_KEY` with
   that key.
3. Deploy, New deployment, type Web app. Execute as: Me. Who has access:
   Anyone. Approve the Gmail permission it asks for, then copy the web app URL
   (it ends in `/exec`).
4. In Cloudflare, open the Pages project `ea-unsw-website`, Settings,
   Variables and Secrets, Production, and add two secrets:
   `MAIL_RELAY_URL` (the web app URL) and `MAIL_RELAY_KEY` (the same key).
   Redeploy (or push any commit) so the functions see them.
5. Test it by signing up on the live site with your own email.

Limits: a normal Gmail account can send about 100 emails a day through Apps
Script, and each sign-up uses two, so roughly 50 sign-ups a day. If the key
ever leaks, change it in both places. Changing it also stops old cancel links
working, unless you set a separate `SIGNING_SECRET` secret in Cloudflare that
stays the same.

Team photos: save a square image in `assets/team/` and replace the letter
inside that person's `<div class="avatar">` in `team.html` with
`<img src="assets/team/name.jpg" alt="">`.

The income calculator uses World Bank Poverty and Inequality Platform figures
for 2024 (2021 international dollars). The numbers and the conversion from
Australian dollars sit at the top of the calculator block in `assets/site.js`.

To preview locally, run `python3 -m http.server 4173` in this folder and open
<http://127.0.0.1:4173/>. Adding `?still` to any page address freezes the
animations, which helps when taking screenshots.

Edit the page, check the rendered result locally, then commit and push to
`main`. That is all. The Cloudflare Pages project `ea-unsw-website` is connected
to this GitHub repository, so every push to `main` triggers a Cloudflare build
and updates the live site automatically. Anyone with push access to this repo
can deploy this way, and no Cloudflare credentials are needed to do it.

There are no secrets or API tokens stored in this repository or its GitHub
Actions, by design. The only thing that can deploy is a push to the connected
repo, which reaches this site and nothing else.

### Manual deploy (fallback)

If you need to push the working tree without committing, or the Git integration
is unavailable, deploy by hand from a machine that has the Cloudflare values in
`~/.secrets.env`:

```sh
./deploy-pages.sh
```

The script reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from
`~/.secrets.env`. It never writes those values to the repository. The token
needs Cloudflare Pages Edit access for the account. The default Pages project
name is `ea-unsw-website`; set `CLOUDFLARE_PAGES_PROJECT` in the shell to use a
different existing project.

The Pages project already exists. Its Pages URL is
`ea-unsw-website.pages.dev`. Connecting
`eaunsw.com` or a hostname under it is a separate Cloudflare DNS and custom
domain step. The current repository does not assume that connection exists.

## Public information links

- Membership: <https://campus.hellorubric.com/?s=15954&mid=23499>
- Club links: <https://linktr.ee/effectivealtruism_unsw>
- Instagram: <https://www.instagram.com/effectivealtruism_unsw>

## Event pages (18 Nov 2026)

Every event box on `events.html` (and the Week 1 boxes on the home page) opens its own page:
`event-<name>.html` for events (A4 poster, When/Date/Time/Where, "What it'll be like" steps, "Good to know",
previous/next links) and `fellowship-session-N.html` for the six fellowship sessions (blank on purpose, to be filled in).
They are generated: edit the copy in `../event_pages.py` (week data in `../build_events.py`), then run
`python3 ../build_events.py` here. Portrait posters live in `assets/events/a4/` (840 px wide WebP).
**After each event:** add photos and a short write-up where the page says `AFTER THE EVENT` (photo releases for faces).
