#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║   Nuclei Dashboard – Starting Services...    ║"
echo "╚══════════════════════════════════════════════╝"

# Fix ES data permissions
chown -R elasticsearch:elasticsearch /usr/share/elasticsearch/data 2>/dev/null || true

# Ensure nuclei templates directory exists and is writable
mkdir -p /root/.local/nuclei-templates

# Start supervisord (manages ES + Backend + Nginx)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/nuclei-dashboard.conf
