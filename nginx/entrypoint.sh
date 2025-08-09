#!/usr/bin/env sh
set -eu
# انتخاب قالب مناسب براساس متغیر محیطی NGINX_ENV
TEMPLATE="default.conf.template"
if [ "${NGINX_ENV:-development}" != "production" ]; then
  TEMPLATE="default.dev.conf.template"
fi

# جایگزینی متغیرهای DOMAIN و NGINX_ENV در قالب و نوشتن نتیجه
envsubst '${DOMAIN} ${NGINX_ENV}' < /etc/nginx/templates/${TEMPLATE} > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
