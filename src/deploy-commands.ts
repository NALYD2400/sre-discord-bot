import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';

const commands: object[] = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file)).default;
  if (command?.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

const deployToGuild = async (guildId: string, label: string) => {
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId),
      { body: commands }
    ) as unknown[];
    console.log(`✅ ${data.length} commandes déployées sur ${label} (${guildId})`);
  } catch (error) {
    console.error(`❌ Erreur sur ${label} (${guildId}):`, error);
  }
};

(async () => {
  console.log(`🔄 Déploiement de ${commands.length} commandes sur les 2 serveurs...`);

  await deployToGuild(process.env.GUILD_ID!, 'Serveur Principal');

  if (process.env.BACKUP_GUILD_ID) {
    await deployToGuild(process.env.BACKUP_GUILD_ID, 'Serveur Backup');
  }

  console.log('🏁 Déploiement terminé !');
})();
