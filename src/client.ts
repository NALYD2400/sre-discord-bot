import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { Command } from './types';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
}) as ExtendedClient;

export default client;
