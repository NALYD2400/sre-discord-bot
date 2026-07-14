import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Expulser un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('membre').setDescription('Membre à expulser').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') ?? 'Aucune raison fournie';

    if (!target || !('kickable' in target) || !target.kickable) {
      await interaction.reply({ content: '❌ Je ne peux pas expulser ce membre.', ephemeral: true });
      return;
    }

    try {
      await target.kick(raison);
      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('👢 Membre expulsé')
        .addFields(
          { name: 'Membre', value: `${target.user?.tag}`, inline: true },
          { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: 'Raison', value: raison },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: `❌ Erreur: ${e}`, ephemeral: true });
    }
  },
};
export default command;
