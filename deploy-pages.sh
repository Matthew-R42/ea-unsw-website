#!/bin/sh
set -eu

secrets_file="${HOME}/.secrets.env"
if [ ! -r "$secrets_file" ]; then
    echo "Missing readable secrets file: $secrets_file" >&2
    exit 1
fi

set -a
. "$secrets_file"
set +a

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is not set in ~/.secrets.env}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is not set in ~/.secrets.env}"

project_name="${CLOUDFLARE_PAGES_PROJECT:-ea-unsw-site}"

exec npx wrangler pages deploy . \
    --project-name="$project_name" \
    --branch=main
