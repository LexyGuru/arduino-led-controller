#!/usr/bin/env bash
set -Eeuo pipefail

[[ "$(id -u)" -eq 0 ]] || { echo "Root szükséges." >&2; exit 1; }
SERVICE="arduino-led-controller-rust.service"

systemctl is-enabled --quiet "$SERVICE"
systemctl is-active --quiet "$SERVICE"
echo "SERVICE_INITIAL=PASSED"

systemctl restart "$SERVICE"
sleep 2
systemctl is-active --quiet "$SERVICE"
echo "SERVICE_RESTART=PASSED"

curl -fsS --max-time 10 http://127.0.0.1:3000/health/live >/dev/null
echo "SERVICE_HEALTH_AFTER_RESTART=PASSED"
