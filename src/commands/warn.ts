import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../types';
import { addWarning, getWarnings, clearWarnings } from '../store';
import { randomUUID } from 'crypto';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Gestion des avertissements')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub
      .setName('add').setDescription('Ajouter un avertissement')
      .addUserOption(o => o.setName('membre').setDescription('Membre à avertir').setRequired(true))
      .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list').setDescription('Voir les avertissements d\'un membre')
      .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('clear').setDescription('Effacer tous les avertissements')
      .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    ) as any,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('membre', true);
    const guildId = interaction.guildId!;

    if (sub === 'add') {
      const raison = interaction.options.getString('raison', true);
      const warn = { id: randomUUID().slice(0, 8), reason: raison, moderatorId: interaction.user.id, timestamp: Date.now() };
      addWarning(guildId, target.id, warn);
      const warns = getWarnings(guildId, target.id);
      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle('⚠️ Avertissement ajouté')
        .addFields(
          { name: 'Membre', value: `${target}`, inline: true },
          { name: 'Raison', value: raison, inline: true },
          { name: 'Total warns', value: `${warns.length}`, inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'list') {
      const warns = getWarnings(guildId, target.id);
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`📋 Avertissements de ${target.username}`)
        .setDescription(warns.length === 0 ? 'Aucun avertissement' : warns.map((w, i) =>
          `**#${i+1}** [${w.id}] — ${w.reason}\n<@${w.moderatorId}> • <t:${Math.floor(w.timestamp/1000)}:R>`
        ).join('\n\n'));
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'clear') {
      clearWarnings(guildId, target.id);
      await interaction.reply({ content: `✅ Avertissements de ${target} effacés.`, ephemeral: true });
    }
  },
};
export default command;
