import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Collection } from 'discord.js';
import client from './client';
import { Command } from './types';
import { startHealthServer } from './health';

// Démarrer le serveur HTTP pour UptimeRobot (Render free tier)
startHealthServer(Number(process.env.PORT) || 3000);


// Load commands
client.commands = new Collection<string, Command>();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

for (const file of commandFiles) {
  const command: Command = require(path.join(commandsPath, file)).default;
  if (command && command.data && typeof command.execute === 'function') {
    client.commands.set(command.data.name, command);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  const { name, once, execute } = event.default || event;
  if (once) {
    client.once(name, (...args) => execute(...args, client));
  } else {
    client.on(name, (...args) => execute(...args, client));
  }
}

client.login(process.env.DISCORD_TOKEN!);
