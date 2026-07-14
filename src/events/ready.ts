import { Events, Client, ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
    client.user?.setPresence({
      activities: [{ name: 'SR Editer | /help', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
