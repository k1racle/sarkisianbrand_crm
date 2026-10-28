#!/bin/sh
set -eu
node /app/scripts/production-config-check.cjs
exec "$@"
