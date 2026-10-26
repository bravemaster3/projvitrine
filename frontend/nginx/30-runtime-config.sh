#!/bin/sh
# Writes /config.js (read by the app before it starts) from environment
# variables, and puts the brand name into index.html. This lets one pre-built
# image serve any domain; change a variable in Coolify and restart, no rebuild.
set -eu

HTML=/usr/share/nginx/html

# JSON-escape a value: backslashes and double quotes; drop surrounding quotes
# pasted from an old .env file.
json() {
    printf '%s' "$1" | sed -e "s/^[\"']//" -e "s/[\"']\$//" -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

first() {
    for value in "$@"; do
        if [ -n "$value" ]; then printf '%s' "$value"; return; fi
    done
}

BRAND=$(first "${VITE_BRAND_NAME:-}" "${BRAND_NAME:-}" "Proofolio")
SITE=$(first "${SITE_URL:-}" "${VITE_SITE_URL:-}" "${VITE_FRONTEND_URL:-}" "${SITE_DOMAIN:-}")
LANG_LIST=$(first "${LANGS:-}" "${VITE_LANGS:-}" "en,fr,sv")

cat > "$HTML/config.js" <<EOF
window.__APP_CONFIG__ = {
  "apiUrl": "$(json "${VITE_API_URL:-}")",
  "siteUrl": "$(json "$SITE")",
  "githubClientId": "$(json "$(first "${VITE_GITHUB_CLIENT_ID:-}" "${GITHUB_CLIENT_ID:-}" "${SOCIAL_AUTH_GITHUB_KEY:-}")")",
  "brandName": "$(json "$BRAND")",
  "sourceUrl": "$(json "${VITE_SOURCE_URL:-}")",
  "defaultLang": "$(json "${VITE_DEFAULT_LANG:-}")",
  "langs": "$(json "$LANG_LIST")"
};
EOF

# Brand name in the static <title> / og:site_name. HTML-escape it, then insert
# it with awk reading from the environment, so no character is special.
BRAND_HTML=$(printf '%s' "$BRAND" | sed -e "s/^[\"']//" -e "s/[\"']\$//" \
    -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g')
export BRAND_HTML
awk '{
    out = ""; line = $0
    while ((i = index(line, "__BRAND_NAME__")) > 0) {
        out = out substr(line, 1, i - 1) ENVIRON["BRAND_HTML"]
        line = substr(line, i + 14)
    }
    print out line
}' "$HTML/index.html" > "$HTML/index.html.tmp" && mv "$HTML/index.html.tmp" "$HTML/index.html"

echo "runtime config written (brand: $BRAND, site: ${SITE:-same origin})"
