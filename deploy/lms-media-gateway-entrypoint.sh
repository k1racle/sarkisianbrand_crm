#!/bin/sh
set -eu
# Never accept config syntax, whitespace, or a weak shared key via envsubst.
case "${LMS_GATEWAY_KEY:-}" in
  *[!0-9a-fA-F]*|'') echo 'LMS_GATEWAY_KEY must be 64 hexadecimal characters' >&2; exit 1 ;;
esac
[ "${#LMS_GATEWAY_KEY}" -eq 64 ] || { echo 'LMS_GATEWAY_KEY must be 64 hexadecimal characters' >&2; exit 1; }
umask 077
envsubst '${LMS_GATEWAY_KEY}' </etc/nginx/lms-media-gateway.conf.template >/tmp/lms-media-gateway.conf
exec nginx -c /tmp/lms-media-gateway.conf -g 'daemon off;'
