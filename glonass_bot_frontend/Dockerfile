# Multi-stage build для оптимизации размера образа

# Stage 1: Build
FROM node:20-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci && npm cache clean --force

# Копирование исходного кода
COPY . .

# Аргументы сборки для переменных окружения
ARG VITE_API_BASE_URL
ARG VITE_APP_ENV=production

# Создание .env файла
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.production && \
    echo "VITE_APP_ENV=${VITE_APP_ENV}" >> .env.production

# Сборка приложения
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Копирование кастомной конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копирование собранного приложения из builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Создание директории для логов
RUN mkdir -p /var/log/nginx

# Expose port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
