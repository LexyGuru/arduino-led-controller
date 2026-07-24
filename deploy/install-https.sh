#!/usr/bin/env bash
# Helyi, HTTPS-es Caddy fordított proxy Proxmox LXC-hez.
set -euo pipefail

APP_PORT="${PORT:-3000}"
HTTPS_HOST="${HTTPS_HOST:-}"
if [[ -z "${HTTPS_HOST}" ]]; then
  HTTPS_HOST="$(hostname -I | awk '{print $1}')"
fi
[[ -n "${HTTPS_HOST}" ]] || { echo "Nem sikerült meghatározni az LXC IP-címét." >&2; exit 1; }

apt-get install -y caddy
cat > /etc/caddy/Caddyfile <<EOF
https://${HTTPS_HOST} {
    tls internal
    reverse_proxy 127.0.0.1:${APP_PORT}
}
EOF
systemctl enable --now caddy
systemctl reload caddy

echo "HTTPS webcím: https://${HTTPS_HOST}"
echo "Helyi tanúsítvány: /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt"
