#!/bin/zsh
# Daily print-order check: runs print-check.mjs and pops a macOS notification
# when orders need prepping or are signed off and ready to place.
# Installed as LaunchAgent com.taylormade.printcheck (daily ~8:57am).

SCRIPTS_DIR="$HOME/taylormade-studio/scripts"
NODE="/opt/homebrew/bin/node"

OUT="$("$NODE" --env-file="$SCRIPTS_DIR/.env" "$SCRIPTS_DIR/print-check.mjs" 2>&1)" || {
  /usr/bin/osascript -e 'display notification "print-check failed to run — open Claude and run: npm run check" with title "Taylormade Print Orders" sound name "Basso"'
  echo "$OUT" >> /tmp/print-check.log
  exit 1
}

echo "$(date '+%F %T') $OUT" >> /tmp/print-check.log

JSON_LINE="$(echo "$OUT" | tail -1)"
ACTION="$(echo "$JSON_LINE" | /usr/bin/grep -o '"action_needed":true' || true)"

if [[ -n "$ACTION" ]]; then
  PREP="$(echo "$OUT" | /usr/bin/grep '^needs_prep:' | head -1)"
  PLACE="$(echo "$OUT" | /usr/bin/grep '^ready_to_place:' | head -1)"
  /usr/bin/osascript -e "display notification \"$PREP | $PLACE — tell Claude: run the print pipeline\" with title \"Taylormade Print Orders\" sound name \"Glass\""
fi
