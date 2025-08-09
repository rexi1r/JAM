# ============================
# nginx/entrypoint.sh  (make executable)
# ============================
#
# #!/usr/bin/env sh
# set -eu
# envsubst '$(DOMAIN) $(NGINX_ENV)' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
# exec nginx -g 'daemon off;'