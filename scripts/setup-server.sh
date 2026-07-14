#!/usr/bin/env bash
# setup-server.sh — Installation initiale sur le serveur Oracle Ubuntu 22.04

set -e

echo "🔧 Installation du serveur SR Editer Bot..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install git
sudo apt install -y git

# Create bot directory
sudo mkdir -p /opt/sre-discord-bot
sudo chown $USER:$USER /opt/sre-discord-bot

# Clone repo
git clone https://github.com/TON_USERNAME/sre-discord-bot.git /opt/sre-discord-bot

cd /opt/sre-discord-bot

# Install dependencies
npm install

# Build
npm run build

# Create .env (à remplir manuellement)
cp .env.example .env
echo "⚠️  N'oublie pas de remplir /opt/sre-discord-bot/.env !"

# Install systemd service
sudo cp oracle/sre-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sre-bot

echo "✅ Installation terminée !"
echo "👉 Étapes suivantes :"
echo "   1. nano /opt/sre-discord-bot/.env  (remplir le token)"
echo "   2. sudo systemctl start sre-bot"
echo "   3. sudo systemctl status sre-bot"
