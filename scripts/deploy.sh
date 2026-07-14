#!/usr/bin/env bash
# deploy.sh — Déploie le bot sur le serveur Oracle

set -e

echo "🚀 Déploiement SR Editer Bot..."

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Restart service
sudo systemctl restart sre-bot

echo "✅ Bot déployé avec succès !"
sudo systemctl status sre-bot --no-pager
