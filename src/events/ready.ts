import { Events, ActivityType, type ApplicationCommandDataResolvable } from 'discord.js';
import { ExtendedClient } from '../client';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: ExtendedClient) {
    console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
    client.user?.setPresence({
      activities: [{ name: 'SR Editer | /help', type: ActivityType.Watching }],
      status: 'online',
    });

    const commands = client.commands.map(
      (command) => command.data.toJSON() as ApplicationCommandDataResolvable
    );
    const guildIds = [...new Set([process.env.GUILD_ID, process.env.BACKUP_GUILD_ID]
      .filter((guildId): guildId is string => Boolean(guildId)))];
    for (const guildId of guildIds) {
      try {
        const guild = await client.guilds.fetch(guildId);
        await guild.commands.set(commands);
        console.log(`✅ ${commands.length} commandes synchronisées sur ${guild.name}`);
      } catch (error) {
        console.error(`❌ Synchronisation des commandes impossible sur ${guildId}:`, error);
      }
    }
  },
};
