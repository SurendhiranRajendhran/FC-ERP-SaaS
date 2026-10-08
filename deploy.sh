#!/bin/bash
set -e

echo "=========================================="
echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Starting FC-ERP Auto Deploy"
echo "=========================================="

cd /home/deploy/fc-erp

# 1. Fetch latest changes
echo "📦 Pulling latest changes from GitHub main branch..."
git fetch origin main
git reset --hard origin/main

# 2. Fix file permissions
chown -R deploy:deploy /home/deploy/fc-erp
chmod +x /home/deploy/fc-erp/deploy.sh

# 3. Restart container to pick up changes in server.js, crm-service.js & public/
echo "🔄 Restarting fc_erp_app container..."
docker restart fc_erp_app

# 4. Wait & Verify
sleep 4
if docker ps --format '{{.Names}} {{.Status}}' | grep fc_erp_app | grep -q "Up"; then
    echo "✅ FC-ERP application is healthy and running!"
    curl -I -s http://localhost:5000/ | head -n 5
    echo "=========================================="
    echo "🎉 Auto Deployment completed successfully!"
    echo "=========================================="
else
    echo "❌ Error: fc_erp_app container is not running!"
    docker logs --tail 20 fc_erp_app
    exit 1
fi
