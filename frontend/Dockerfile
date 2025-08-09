# ============================
# frontend/Dockerfile
# ============================
# Build ری‌اکت و سرو استاتیک با Nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS serve
WORKDIR /
COPY --from=build /app/build /usr/share/nginx/html
# فایل template و entrypoint را از ریپو کپی می‌کنیم
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/entrypoint.sh /docker-entrypoint.d/99-envsubst.sh
RUN chmod +x /docker-entrypoint.d/99-envsubst.sh
