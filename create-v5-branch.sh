#!/usr/bin/env bash
# A v5 újratervezési branch biztonságos létrehozása.
# Fejlesztői gépen futtasd, ne a produkciós LXC-ben.

set -euo pipefail

BRANCH="${BRANCH:-next/v5-rearchitecture}"
BASE_TAG="${BASE_TAG:-baseline-before-v5-2026-07-28}"
ROADMAP_FILE="${ROADMAP_FILE:-fejlesztes_readme.md}"

fail() {
  echo "HIBA: $*" >&2
  exit 1
}

git rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
  fail "Nem Git repository."

[[ -f "${ROADMAP_FILE}" ]] ||
  fail "Nem található: ${ROADMAP_FILE}"

OTHER_CHANGES="$(
  git status --porcelain |
  sed 's/^...//' |
  grep -v -F -x "${ROADMAP_FILE}" || true
)"

[[ -z "${OTHER_CHANGES}" ]] ||
  fail "Más nem mentett módosítás is van a repositoryban."

git fetch --prune origin
git switch main
git pull --ff-only origin main

if ! git rev-parse "${BASE_TAG}" >/dev/null 2>&1; then
  git tag -a "${BASE_TAG}"     -m "Stabil main állapot a teljes v5 újratervezés előtt"
  git push origin "${BASE_TAG}"
fi

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git switch "${BRANCH}"
elif git ls-remote --exit-code --heads origin "${BRANCH}" >/dev/null 2>&1; then
  git switch --track -c "${BRANCH}" "origin/${BRANCH}"
else
  git switch -c "${BRANCH}"
fi

git add -- "${ROADMAP_FILE}"

if ! git diff --cached --quiet; then
  git commit -m "docs: add v5 rearchitecture roadmap"
fi

git push -u origin "${BRANCH}"

echo "Kész."
echo "Aktív branch: $(git branch --show-current)"
echo "A produkciós LXC maradjon a main ágon."
