# EA UNSW website

Static website for Effective Altruism UNSW. The site is six hand-edited HTML
pages plus one shared stylesheet and one shared script, deployed directly to
Cloudflare Pages, like `mtw4244.work`. There is no build step.

| File | Page |
| --- | --- |
| `index.html` | Home, including the income calculator |
| `what-is-ea.html` | What is EA?, causes, videos |
| `events.html` | Term events timeline |
| `fellowship.html` | Intro Fellowship syllabus and readings |
| `fellowship-signup.html` | Fellowship sign-up form |
| `team.html` | About us: exec team, where the money goes, subcommittee |
| `subcommittee.html` | Subcommittee application form |
| `assets/site.css` | All styles and colours (tokens at the top) |
| `assets/site.js` | Menu, animations, calculator, tooltips, forms |
| `assets/arc-clubs.png` | Arc Clubs logo used in the footer |
| `assets/og.png` | Picture shown when the site is shared on Discord, WhatsApp and so on |
| `assets/video/` | Thumbnails for the three videos on the What is EA page |

The header and footer are repeated in every page, so a change to the menu or
footer links has to be made in every page.

The site contains no API keys or build-time secrets. Do not commit Cloudflare
tokens, API keys, account credentials, or private member information here.

## Updating the site

To change an event, edit its `<article class="wk">` block in `events.html`.
The black bars are `<span class="redact">` elements: replace one with plain
text when a detail is ready to announce. The three teaser cards on the home
page are separate and live in `index.html`.

The two forms have no server behind them. Pressing send opens the visitor's
email app with their answers addressed to the club inbox, and nothing is sent
until they press send there. To collect answers with a Google Form instead,
point the "Sign up" and "Apply" buttons at the form's address.

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
