#!/bin/sh
# If CANONICAL_HOST is set (e.g. projvitrine.kndev.org), requests for any other
# public host name — such as the legacy alxhof.kndev.org — get a 301 there.
# Internal names without a dot (projvitrine-web, localhost) and IP addresses are
# never redirected, so container-to-container requests and health checks work.
set -eu
mkdir -p /etc/nginx/snippets
rm -f /etc/nginx/snippets/canonical.conf /etc/nginx/conf.d/canonical-map.conf

# Accept "projvitrine.kndev.org", "https://projvitrine.kndev.org/" or a quoted value.
host=$(printf '%s' "${CANONICAL_HOST:-}" | tr 'A-Z' 'a-z' | sed -e "s/[\"' ]//g" -e 's#^https\{0,1\}://##' -e 's#/.*$##')
if [ -n "$host" ]; then
    cat > /etc/nginx/conf.d/canonical-map.conf <<CONF
map \$host \$projvitrine_redirect {
    default 1;
    "$host" 0;
    ~^[^.]+\$ 0;
    ~^[0-9.]+\$ 0;
}
CONF
    cat > /etc/nginx/snippets/canonical.conf <<CONF
if (\$projvitrine_redirect) {
    return 301 https://$host\$request_uri;
}
CONF
    echo "canonical host: $host"
fi
