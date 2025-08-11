# ============================
# frontend/Dockerfile
# ============================

# Build ری‌اکت و سرو استاتیک با Nginx
FROM node:20-alpine AS build
WORKDIR /app
ENV CI=true

# 1) نصب دقیق وابستگی‌ها با cache بهتر
COPY frontend/package*.json ./
# Ensure patch files are available before installation so patch-package
# can modify dependencies like react-scripts during the postinstall step.
COPY frontend/patches ./patches
# Install all dependencies, including dev dependencies, so patch-package runs
# and Tailwind's PostCSS plugin is available during the build.
RUN npm ci --include=dev

# 2) Build
COPY frontend/ ./
RUN npm run build

# 3) سرو با nginx
FROM nginx:1.27-alpine AS serve
# ابزارهای مفید (اختیاری) مثل brotli
RUN apk add --no-cache brotli
WORKDIR /
COPY --from=build /app/build /usr/share/nginx/html
