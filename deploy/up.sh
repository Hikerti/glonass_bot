#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker compose \
  --env-file tg-glonass-bot-main/envs/local/database/postgres.env \
  --env-file tg-glonass-bot-main/envs/local/database/minio.env \
  --env-file tg-glonass-bot-main/envs/local/database/redis.env \
  --env-file tg-glonass-bot-main/envs/local/gate/app.env \
  --env-file tg-glonass-bot-main/envs/local/gate/mail.env \
  --env-file tg-glonass-bot-main/envs/local/gate/vk.env \
  up -d --build
