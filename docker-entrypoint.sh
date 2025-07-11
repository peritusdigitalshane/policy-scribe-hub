#!/bin/sh

# Docker entrypoint script for GovernanceHub

echo "Starting GovernanceHub application..."

# Create nginx directories if they don't exist
mkdir -p /var/log/nginx
mkdir -p /var/cache/nginx

# Set proper permissions
chown -R nginx:nginx /var/log/nginx
chown -R nginx:nginx /var/cache/nginx
chown -R nginx:nginx /usr/share/nginx/html

# Test nginx configuration
nginx -t

if [ $? -ne 0 ]; then
    echo "ERROR: Nginx configuration test failed"
    exit 1
fi

echo "Nginx configuration test passed"
echo "GovernanceHub is ready to start"

# Execute the CMD
exec "$@"