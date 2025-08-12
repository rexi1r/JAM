# ============================
# frontend/Dockerfile
# ============================

# Build
FROM node:22-alpine AS build
WORKDIR /app
ENV CI=true

COPY frontend/package*.json ./
COPY frontend/patches ./patches
RUN npm ci --include=dev

COPY frontend/ ./
RUN npm run build   # => خروجی در /app/dist

# Serve with nginx
FROM nginx:1.27-alpine AS serve
RUN apk add --no-cache brotli
COPY --from=build /app/dist/ /usr/share/nginx/html/
