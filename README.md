# EA UNSW website

Static website for Effective Altruism UNSW. The site is a single `index.html`
file and can be deployed with Cloudflare Pages using the Git integration.
Select this repository and the `main` production branch. Leave the build
command blank and set the build output directory to `.` so Pages serves the
top-level `index.html`.

The site contains no API keys or build-time secrets. Do not commit Cloudflare
tokens, API keys, account credentials, or private member information here.

## Updating the site

Edit `index.html` and commit the change. Once Cloudflare Pages is connected to
this repository, pushes to the deployment branch publish the site.

## Public information links

- Membership: <https://campus.hellorubric.com/?s=15954&mid=23499>
- Club links: <https://linktr.ee/effectivealtruism_unsw>
- Instagram: <https://www.instagram.com/effectivealtruism_unsw>
