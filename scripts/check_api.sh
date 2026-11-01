#!/usr/bin/env bash
# Lint the API contracts in api/, then refresh the endpoint table in docs/06-api.md.
# Usage: scripts/check_api.sh   (needs Node; fetches @redocly/cli on first run)
set -euo pipefail
cd "$(dirname "$0")/.."

redocly() { npx -y @redocly/cli@2.64.1 "$@"; }

redocly lint --config api/redocly.yaml
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
redocly bundle api/openapi.yaml --output "$tmp/openapi.json"
python3 scripts/build_api_table.py "$tmp/openapi.json"
