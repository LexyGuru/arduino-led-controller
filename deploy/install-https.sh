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
    handle /caddy-root-ca.crt {
        root * /usr/share/caddy
        file_server
    }
    handle {
        reverse_proxy 127.0.0.1:${APP_PORT}
    }
}
EOF
# Az első induláskor a Caddy hozza létre a saját helyi tanúsítványát. Debian
# 13-on ez néhány másodperccel a szolgáltatás indulása után jelenhet meg;
# korábban a telepítő azonnal másolni próbálta és ezzel félbeszakadt.
systemctl enable caddy
if ! systemctl restart caddy; then
  echo "A Caddy nem indult el. Részletes napló:" >&2
  journalctl -u caddy -n 50 --no-pager >&2 || true
  exit 1
fi

ROOT_CERT="/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt"
for _ in {1..10}; do
  [[ -f "${ROOT_CERT}" ]] && break
  sleep 1
done
if [[ -f "${ROOT_CERT}" ]]; then
  install -m 644 "${ROOT_CERT}" /usr/share/caddy/caddy-root-ca.crt
  systemctl reload caddy
else
  # A proxynak ettől még működnie kell. A tanúsítvány-letöltés később,
  # következő telepítéskor vagy Caddy újraindítás után elérhetővé válik.
  echo "Figyelem: a Caddy helyi gyökértúsítványa még nem készült el; a HTTPS proxy elindult, de a .crt letöltés később lesz elérhető." >&2
fi

echo "HTTPS webcím: https://${HTTPS_HOST}"
echo "Helyi tanúsítvány: /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt"
echo "Letöltés eszközökhöz: https://${HTTPS_HOST}/caddy-root-ca.crt"
