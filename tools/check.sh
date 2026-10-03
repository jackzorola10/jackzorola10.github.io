#!/usr/bin/env bash
# Pre-publish checks for the portfolio. Run from the repo root: bash tools/check.sh
# 1) every project's tests pass  2) projects.json is valid and every page exists
# 3) the Claude skill zip is rebuilt  4) optional private sensitive-data scan
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0

echo "== tests"
for d in projects/*/; do
  if ls "$d"tests/*.test.js >/dev/null 2>&1; then
    (cd "$d" && node --test tests/*.test.js >/dev/null 2>&1) && echo "  ok   $d" || { echo "  FAIL $d"; fail=1; }
  fi
done

echo "== catalog"
node -e '
const fs=require("fs"); const j=JSON.parse(fs.readFileSync("projects.json","utf8")); let bad=0;
for (const p of j.projects) {
  for (const k of ["slug","title","tagline","summary","kind","year","tags","metrics","page","cover"]) if (p[k]===undefined) { console.log("  missing", k, "in", p.slug); bad=1; }
  if (!fs.existsSync(p.page + "index.html")) { console.log("  no page for", p.slug); bad=1; }
  for (const t of p.tags) if (!j.tags[t]) { console.log("  unknown tag", t, "in", p.slug); bad=1; }
}
console.log(bad ? "  FAIL" : `  ok   ${j.projects.length} projects`); process.exit(bad);
' || fail=1

echo "== skill zip"
rm -f can-jack-help/can-jack-help.zip
tmp="$(mktemp -d)"; mkdir -p "$tmp/can-jack-help"; cp can-jack-help/SKILL.md "$tmp/can-jack-help/"
(cd "$tmp" && zip -qr can-jack-help.zip can-jack-help) && mv "$tmp/can-jack-help.zip" can-jack-help/ && echo "  ok   can-jack-help/can-jack-help.zip"
rm -rf "$tmp"

echo "== project kits"
for k in projects/*/kit; do
  [ -d "$k" ] || continue
  d="$(dirname "$k")"; name="$(basename "$d")"
  rm -f "$d/$name-kit.zip"
  (cd "$k" && zip -qr "../$name-kit.zip" . -x '.DS_Store') && echo "  ok   $d/$name-kit.zip"
done

echo "== sensitive-data scan"
DENY="${PORTFOLIO_DENYLIST:-$HOME/.claude/skills/portafolio/denylist.txt}"
if [ -f "$DENY" ]; then
  hits="$(grep -rniI -f <(grep -v '^\s*#' "$DENY" | sed '/^\s*$/d') --exclude-dir=.git --exclude=*.zip . || true)"
  if [ -n "$hits" ]; then echo "$hits" | sed 's/^/  HIT  /'; fail=1; else echo "  ok   no denylisted terms"; fi
else
  echo "  skip (no denylist at $DENY)"
fi

[ "$fail" = 0 ] && echo "ALL CHECKS PASSED" || { echo "CHECKS FAILED"; exit 1; }
