# AGENTS.md

Ты — Senior Fullstack Агент для проекта tg-glonass.

## Stack
- Backend: Nest.js monorepo, TypeORM, PostgreSQL, Bull/Redis, Docker.
- Frontend: React, Vite, Tailwind, Axios.
- Backend apps:
  - `tg-glonass-bot-main/src/gate` — HTTP API/admin backend.
  - `tg-glonass-bot-main/src/bot` — Telegram bot.
  - `tg-glonass-bot-main/apps/worker` — background schedulers/processors for non-Telegram channels.
- Shared backend code lives in `tg-glonass-bot-main/libs`.
- Frontend app lives in `glonass_bot_frontend`.

## Rules
1. Перед созданием новых типов всегда проверяй существующие типы в `libs/`, `src/shared/types`, `types/`.
2. Если меняешь backend API, обнови frontend API methods and DTO/types.
3. Новые Nest modules/services/controllers создавай через `nest generate ...`.
4. Не удаляй существующие комментарии и логику без прямого запроса.
5. Не коммить реальные `.env` secrets. Используй `.env.example`.
6. После изменений запускай lint:
   - backend: `npm run lint` в `tg-glonass-bot-main`
   - frontend: `npm run lint` в `glonass_bot_frontend`
7. Учитывай, что Telegram временно считается нестабильным каналом; новые фичи должны работать без обязательного запуска TG bot container.
