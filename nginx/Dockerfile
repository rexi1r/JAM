FROM nginx:1.27-alpine

# نصب envsubst (بخشی از gettext)
RUN apk add --no-cache gettext

WORKDIR /etc/nginx

# کپی قالب و اسکریپت entrypoint
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY entrypoint.sh /docker-entrypoint.d/99-envsubst.sh

# ایجاد دایرکتوری ACME challenge و تنظیم مالکیت
RUN mkdir -p /var/www/certbot && \
    chown -R nginx:nginx /var/www/certbot

# Healthcheck: چک می‌کند که nginx در حال اجراست (در این مثال به healthz اشاره می‌شود)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

EXPOSE 80 443
