# ============================
# nginx/Dockerfile (custom image)
# ============================
FROM nginx:1.27-alpine

# Install envsubst (part of gettext)
RUN apk add --no-cache gettext

# Workdir
WORKDIR /etc/nginx

# Copy template + entrypoint
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY entrypoint.sh /docker-entrypoint.d/99-envsubst.sh

# Certbot webroot (for HTTP-01 challenges)
RUN mkdir -p /var/www/certbot && \
    chown -R nginx:nginx /var/www/certbot

# Healthcheck (checks that nginx master is running)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1/health || exit 1

# Expose ports
EXPOSE 80 443

# Nginx base image already defines default entrypoint & CMD;
# the script in /docker-entrypoint.d will run automatically before nginx starts.