запуск докера

docker compose -f docker/docker-infrastructure.yml -f docker/docker-app.yml --env-file envs/local/gate/app.env --env-file envs/local/database/minio.env --env-file envs/local/database/postgres.env --env-file envs/local/database/redis.env up -d 

docker compose -f docker/docker-infrastructure.yml -f docker/docker-app.yml --env-file envs/local/gate/app.env --env-file envs/local/gate/mail.env --env-file envs/local/gate/vk.env --env-file envs/local/database/minio.env --env-file envs/local/database/postgres.env --env-file envs/local/database/redis.env --env-file envs/local/bot/bot.env up -d 

bunx typeorm-ts-node-commonjs migration:create ./src/migrations/InitialSchema

bunx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d ./libs/integrations/src/ormconfig.ts migration:generate ./src/migrations/InitialSchema

bunx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d ./libs/integrations/src/ormconfig.ts migration:run