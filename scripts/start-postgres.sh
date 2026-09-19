#!/bin/bash
set -e

CONTAINER_NAME="postgres"
DB_NAME="train_travel_db"
DB_USER="api_user"
DB_PASS="api_pass"
DATA_DIR="$(pwd)/.pgdata"
SCHEMA_FILE="$(pwd)/src/db/schema.sql"

# Check Docker is available and running
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "ERROR: Docker is not running or not installed."
  echo ""
  echo "  - Mac/Windows: Start Docker Desktop and wait for it to fully launch"
  echo "  - Linux: run 'sudo systemctl start docker'"
  echo ""
  exit 1
fi

# Always remove and recreate the container — data is safe in .pgdata/ (bind mount).
# This avoids stale path mounts when switching between Codespaces and local dev,
# or when the container was created from a different working directory.
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing postgres container (data preserved in .pgdata/)..."
  docker rm -f "$CONTAINER_NAME" > /dev/null
fi

# Create container fresh — volume mounts always resolve to current working directory
echo "Creating postgres container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASS" \
  -p 5432:5432 \
  -v "$DATA_DIR":/var/lib/postgresql/data \
  -v "$SCHEMA_FILE":/docker-entrypoint-initdb.d/01-schema.sql \
  postgres:16-alpine

# Wait for postgres to be ready
echo "Waiting for postgres to be ready..."
until docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 1
done
echo "Postgres is ready."
