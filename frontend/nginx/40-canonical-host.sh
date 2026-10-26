#!/bin/sh
# If CANONICAL_HOST is set (e.g. folio.example.org), every other host name —
# such as the legacy alxhof.kndev.org — is redirected there with a 301.
set -eu
mkdir -p /etc/nginx/snippets
rm -f /etc/nginx/snippets/canonical.conf
if [ -n "${CANONICAL_HOST:-}" ]; then
    escaped=$(printf '%s' "$CANONICAL_HOST" | sed 's/\./\./g')
    cat > /etc/nginx/snippets/canonical.conf <<CONF
if (\$host !~* ^(${escaped}|localhost|127\.0\.0\.1|web)\$) {
    return 301 https://${CANONICAL_HOST}\$request_uri;
}
CONF
    echo "canonical host: ${CANONICAL_HOST}"
fi
