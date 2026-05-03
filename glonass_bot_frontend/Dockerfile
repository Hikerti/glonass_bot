# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install && npm cache clean --force

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_APP_ENV=production

RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.production && \
    echo "VITE_APP_ENV=${VITE_APP_ENV}" >> .env.production

RUN npm run build

# Stage 2: Production
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN mkdir -p /var/log/nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
