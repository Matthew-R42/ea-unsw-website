# EA UNSW website

Static website for Effective Altruism UNSW. The site is a single `index.html`
file and is deployed directly to Cloudflare Pages, like `mtw4244.work`.
There is no build step.

The site contains no API keys or build-time secrets. Do not commit Cloudflare
tokens, API keys, account credentials, or private member information here.

## Updating the site

Edit `index.html`, check the rendered result locally, then commit the change.
From this repository, deploy the committed or working-tree contents with:

```sh
./deploy-pages.sh
```

The script reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from
`~/.secrets.env`. It never writes those values to the repository. The token
needs Cloudflare Pages Edit access for the account. The default Pages project
name is `ea-unsw-site`; set `CLOUDFLARE_PAGES_PROJECT` in the shell to use a
different existing project.

The first deployment requires the Pages project to exist. Create it once in
Cloudflare Pages, or run:

```sh
npx wrangler pages project create ea-unsw-site --production-branch=main
```

The default Pages URL will be `ea-unsw-site.pages.dev`. Connecting
`eaunsw.com` or a hostname under it is a separate Cloudflare DNS and custom
domain step. The current repository does not assume that connection exists.

## Public information links

- Membership: <https://campus.hellorubric.com/?s=15954&mid=23499>
- Club links: <https://linktr.ee/effectivealtruism_unsw>
- Instagram: <https://www.instagram.com/effectivealtruism_unsw>
