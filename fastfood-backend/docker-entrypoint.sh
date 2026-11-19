#!/bin/bash
set -e

# Cache configuration, routes, and views
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ensure public storage symlink exists
php artisan storage:link --force || true

# Run database migrations on start
php artisan migrate --force || true

# Ensure only single MPM module (prefork) is enabled for Apache
a2dismod -f mpm_event mpm_worker 2>/dev/null || true
a2enmod mpm_prefork

# Adapt Apache port to dynamic PORT environment variable (default 80)
PORT="${PORT:-80}"
sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Execute Apache in foreground
exec apache2-foreground
