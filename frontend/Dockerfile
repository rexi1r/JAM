# ============================
# frontend/Dockerfile
# ============================
# Set a custom label for the image
LABEL maintainer="rexi1r rexi1r@yahoo.com"
LABEL version="1.0"
LABEL description="JAM FRONT END"

# Build ری‌اکت و سرو استاتیک با Nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
# Ensure patch files are available before installation so patch-package
# can modify dependencies like react-scripts during the postinstall step.
COPY frontend/patches ./patches
# Install all dependencies, including dev dependencies, so patch-package runs
# and Tailwind's PostCSS plugin is available during the build.
RUN npm ci --include=dev
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS serve
WORKDIR /
COPY --from=build /app/build /usr/share/nginx/html
