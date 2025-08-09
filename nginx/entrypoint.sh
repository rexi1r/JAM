#!/usr/bin/env sh
set -eu
# جایگزینی متغیرهای DOMAIN و NGINX_ENV در قالب و نوشتن نتیجه
envsubst '${DOMAIN} ${NGINX_ENV}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
