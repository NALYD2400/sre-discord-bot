import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Afficher toutes les commandes disponibles'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 Commandes SR Editer Bot')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '🏗️ Administration',
          value: '`/setup` — Configurer le serveur automatiquement\n`/ticket panel` — Envoyer le panel de tickets',
        },
        {
          name: '🏅 Grades',
          value: '`/grade set` — Attribuer un grade\n`/grade info` — Voir le grade d\'un membre',
        },
        {
          name: '🔨 Modération',
          value: '`/ban` — Bannir\n`/kick` — Expulser\n`/mute` — Timeout\n`/warn add/list/clear` — Avertissements',
        },
        {
          name: '🎫 Tickets',
          value: '`/ticket fermer` — Fermer un ticket',
        },
        {
          name: '🔧 Utilitaires',
          value: '`/ping` — Latence du bot\n`/help` — Cette aide',
        },
      )
      .setFooter({ text: 'SR Editer Bot • Utilise les slash commands' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
export default command;
