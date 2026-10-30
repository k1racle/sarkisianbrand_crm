#!/bin/sh
# PID 1 for the pinned self-hosted LiveKit image. This is a testable building
# block, not an authorization to enable LMS live: deployment still needs an
# isolated signalling gateway, private control network and end-to-end review.
set -eu
key=${LMS_LIVEKIT_GATEWAY_KEY:-}
case "$key" in *[!0-9a-fA-F]*|'') echo 'Invalid LMS media watchdog key' >&2; exit 1;; esac
[ "${#key}" -eq 64 ] || { echo 'Invalid LMS media watchdog key' >&2; exit 1; }

child=''
terminate_child() {
  [ -n "$child" ] || return 0
  kill -TERM "$child" 2>/dev/null || :
  ( sleep 2; kill -KILL "$child" 2>/dev/null || : ) & killer=$!
  wait "$child" 2>/dev/null || :
  kill "$killer" 2>/dev/null || :
  wait "$killer" 2>/dev/null || :
  child=''
}
trap 'terminate_child; exit 0' TERM INT HUP
trap 'terminate_child' EXIT

# Do not expose the gateway secret to LiveKit's process environment. The
# supervisor itself and its private network remain trusted deployment assets.
( unset LMS_LIVEKIT_GATEWAY_KEY; exec /livekit-server "$@" ) & child=$!

probe() {
  # Fixed internal destination, no redirects. Limit response bytes and duration;
  # never print request headers or the secret. Only an exact HTTP 204 is ready.
  line=$( ( printf 'GET /api/v1/lms-live-gateway/health HTTP/1.1\r\nHost: backend:3000\r\nX-LMS-Gateway-Key: %s\r\nConnection: close\r\n\r\n' "$key" | timeout -k 1 3 nc -w 2 backend 3000 ) 2>/dev/null | head -c 128 | head -n 1 | tr -d '\r' ) || line=''
  case "$line" in 'HTTP/1.1 204 '*|'HTTP/1.0 204 '*) return 0;; *) return 1;; esac
}

# The controller probes LiveKit before reporting healthy, so start the server
# briefly while admission is still denied by the gateway. After first success,
# a single missing/invalid heartbeat shuts the media process down.
startup_attempts=0
ready=0
while :; do
  if ! kill -0 "$child" 2>/dev/null; then wait "$child" 2>/dev/null || :; child=''; exit 1; fi
  if probe; then ready=1
  else
    if [ "$ready" -eq 1 ]; then echo 'LMS media watchdog: control lost; stopping media' >&2; exit 1; fi
    startup_attempts=$((startup_attempts + 1))
    if [ "$startup_attempts" -ge 6 ]; then echo 'LMS media watchdog: control unavailable; stopping media' >&2; exit 1; fi
  fi
  sleep 2
done
