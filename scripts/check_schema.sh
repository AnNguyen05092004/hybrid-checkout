#!/usr/bin/env bash
# Load database/schema.sql into a throw-away PostgreSQL 16 container and run database/test.sql.
# Usage: scripts/check_schema.sh   (needs Docker)
set -euo pipefail
cd "$(dirname "$0")/../database"

name="hybrid-checkout-schema-check"
docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --name "$name" -e POSTGRES_PASSWORD=check postgres:16-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT

# Ask over TCP: the temporary server the image runs during initdb only listens on the socket.
until docker exec "$name" pg_isready -h 127.0.0.1 -U postgres -q; do sleep 1; done

docker exec -i "$name" psql -U postgres -q -v ON_ERROR_STOP=1 < schema.sql
docker exec -i "$name" psql -U postgres -q -v ON_ERROR_STOP=1 < test.sql
