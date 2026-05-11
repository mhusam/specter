#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting application with Docker Compose..."
cd "${ROOT_DIR}"
docker compose up -d --build
echo "Started."
echo "Frontend: http://localhost:5173"
echo "API: http://localhost:4000"
echo "Adminer: http://localhost:8080"
