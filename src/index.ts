import dns from 'dns';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';
import client from './client';
import { Command } from './types';
import { startHealthServer } from './health';

// Forcer la résolution IPv4 en premier (corrige le blocage DNS/IPv6 sur Node 17+ / Render)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Démarrer le serveur HTTP pour UptimeRobot (Render free tier)
startHealthServer(Number(process.env.PORT) || 3000, client);


// Load commands
client.commands = new Collection<string, Command>();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => {
  return !f.endsWith('.d.ts') && !f.includes('.test.') && !f.includes('.spec.') && (f.endsWith('.ts') || f.endsWith('.js'));
});

for (const file of commandFiles) {
  const command: Command = require(path.join(commandsPath, file)).default;
  if (command && command.data && typeof command.execute === 'function') {
    client.commands.set(command.data.name, command);
  }
}
console.log(`📦 ${client.commands.size} commandes chargées.`);

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => {
  return !f.endsWith('.d.ts') && !f.includes('.test.') && !f.includes('.spec.') && (f.endsWith('.ts') || f.endsWith('.js'));
});

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  const { name, once, execute } = event.default || event;
  if (once) {
    client.once(name, (...args) => execute(...args, client));
  } else {
    client.on(name, (...args) => execute(...args, client));
  }
}
console.log(`⚡ ${eventFiles.length} événements enregistrés.`);

// Écouter les Rate Limits Discord (HTTP 429)
client.rest.on('rateLimited', (info) => {
  console.warn(`⚠️ RATE LIMIT DISCORD (HTTP 429) ! Réessai dans ${info.timeToReset}ms sur la route ${info.route}`);
});

const rawToken = process.env.DISCORD_TOKEN?.trim().replace(/^["']|["']$/g, '');

if (!rawToken) {
  console.error("❌ ERREUR CRITIQUE: La variable d'environnement DISCORD_TOKEN n'est pas définie sur Render !");
} else {
  console.log("🔑 Tentative de connexion à Discord...");

  // Test de connectivité préalable vers l'API Discord
  const https = require('https');
  const req = https.get('https://discord.com/api/v10/gateway', { timeout: 10000 }, (res: any) => {
    console.log(`🌐 Test API Discord: HTTP ${res.statusCode}`);
  });
  req.on('error', (err: any) => {
    console.error("❌ Test API Discord ERREUR RÉSEAU :", err.message);
  });
  req.on('timeout', () => {
    req.destroy();
    console.error("❌ Test API Discord TIMEOUT (10s)");
  });

  client.login(rawToken)
    .then(() => console.log("🔑 Connexion Discord initialisée avec succès !"))
    .catch((err) => {
      console.error("❌ Échec de la connexion du bot à Discord :", err);
    });
}
