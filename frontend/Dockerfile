# ============================
# frontend/Dockerfile
# ============================
# Build ری‌اکت و سرو استاتیک با Nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
# Ensure patch files are available before installation so patch-package
# can modify dependencies like react-scripts during the postinstall step.
COPY frontend/patches ./patches
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS serve
WORKDIR /
COPY --from=build /app/build /usr/share/nginx/html
