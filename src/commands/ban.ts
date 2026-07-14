import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Bannir un membre du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('membre').setDescription('Membre à bannir').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison du ban').setRequired(false))
    .addIntegerOption(o => o.setName('jours').setDescription('Jours de messages à supprimer (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') ?? 'Aucune raison fournie';
    const jours = interaction.options.getInteger('jours') ?? 0;

    if (!target || !('bannable' in target) || !target.bannable) {
      await interaction.reply({ content: '❌ Je ne peux pas bannir ce membre.', ephemeral: true });
      return;
    }

    try {
      await target.ban({ reason: raison, deleteMessageDays: jours as 0|1|2|3|4|5|6|7 });
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🔨 Membre banni')
        .addFields(
          { name: 'Membre', value: `${target.user?.tag}`, inline: true },
          { name: 'Modérateur', value: `${interaction.user.tag}`, inline: true },
          { name: 'Raison', value: raison },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: `❌ Erreur lors du ban: ${e}`, ephemeral: true });
    }
  },
};
export default command;
