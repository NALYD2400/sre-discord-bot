import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('🔇 Rendre muet un membre (timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Durée en minutes (max 40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getMember('membre');
    const minutes = interaction.options.getInteger('minutes', true);
    const raison = interaction.options.getString('raison') ?? 'Aucune raison fournie';

    if (!target || !('moderatable' in target) || !target.moderatable) {
      await interaction.reply({ content: '❌ Je ne peux pas mettre ce membre en timeout.', ephemeral: true });
      return;
    }

    try {
      await target.timeout(minutes * 60 * 1000, raison);
      const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('🔇 Membre mis en timeout')
        .addFields(
          { name: 'Membre', value: `${target.user?.tag}`, inline: true },
          { name: 'Durée', value: `${minutes} minute(s)`, inline: true },
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
