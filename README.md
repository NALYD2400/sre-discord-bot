# 🤖 SR Editer — Bot Discord Officiel

Bot Discord officiel de **SR Editer**, l'éditeur vidéo conçu pour les créateurs de contenu.

## ✨ Fonctionnalités

- 🏗️ **Setup automatique** du serveur (channels, rôles, forums, catégories)
- 👋 **Bienvenue** automatique + auto-rôle pour les nouveaux membres
- 🎫 **Système de tickets** (Bug / Question / Autre)
- 🏅 **Système de grades** (Nouveau → Fondateur)
- 🔨 **Modération** : ban, kick, mute/timeout, avertissements
- 📋 **Commande d'aide** complète

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm
- Un bot Discord (discord.com/developers)

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/TON_USERNAME/sre-discord-bot.git
cd sre-discord-bot

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Édite .env avec tes valeurs

# 4. Déployer les commandes slash
npm run deploy

# 5. Lancer le bot
npm run dev
```

## ⚙️ Configuration `.env`

```env
DISCORD_TOKEN=ton_token_bot
CLIENT_ID=ton_application_id
GUILD_ID=id_de_ton_serveur
```

## 📋 Commandes

| Commande | Description | Permission |
|---|---|---|
| `/setup` | Configure le serveur automatiquement | Admin |
| `/ticket panel` | Envoie le panel de tickets | Admin |
| `/ticket fermer` | Ferme un ticket ouvert | Tous |
| `/grade set` | Attribue un grade à un membre | Manage Roles |
| `/grade info` | Affiche le grade d'un membre | Tous |
| `/ban` | Bannit un membre | Ban Members |
| `/kick` | Expulse un membre | Kick Members |
| `/mute` | Met en timeout (minutes) | Moderate Members |
| `/warn add/list/clear` | Gestion des avertissements | Moderate Members |
| `/ping` | Latence du bot | Tous |
| `/help` | Liste des commandes | Tous |

## 🏗️ Structure du projet

```
sre-discord-bot/
├── src/
│   ├── commands/       # Commandes slash
│   ├── events/         # Événements Discord
│   ├── client.ts       # Client Discord
│   ├── store.ts        # Persistance des données
│   ├── types.ts        # Types TypeScript
│   ├── index.ts        # Point d'entrée
│   └── deploy-commands.ts
├── data/               # Données persistantes (gitignored)
├── oracle/             # Fichiers déploiement Oracle Cloud
├── .env                # Variables d'environnement (gitignored)
├── .env.example        # Exemple de configuration
├── package.json
└── tsconfig.json
```

## 🖥️ Déploiement Oracle Cloud

Les fichiers de déploiement `systemd` sont dans `/oracle/`.

```bash
# Sur le serveur Oracle
sudo cp oracle/sre-bot.service /etc/systemd/system/
sudo systemctl enable sre-bot
sudo systemctl start sre-bot
```

## 📄 Licence

MIT © SR Editer Team
