#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping Docker Compose services..."
cd "${ROOT_DIR}"
docker compose down
echo "Done."
