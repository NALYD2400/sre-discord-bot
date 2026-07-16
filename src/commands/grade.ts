import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../types';

const GRADES: { name: string; emoji: string }[] = [
  { name: '👤 Membre',       emoji: '👤' },
  { name: '⭐ Membre Actif', emoji: '⭐' },
  { name: '💬 Support',      emoji: '💬' },
  { name: '🧪 Testeur Bêta', emoji: '🧪' },
  { name: '🎨 Designer',     emoji: '🎨' },
  { name: '💻 Développeur',  emoji: '💻' },
  { name: '🛡️ Modérateur',   emoji: '🛡️' },
  { name: '🔧 Administrateur', emoji: '🔧' },
  { name: '👑 Fondateur',    emoji: '👑' },
];

const ASSIGNABLE_GRADES = GRADES.filter((grade) => ![
  '🛡️ Modérateur',
  '🔧 Administrateur',
  '👑 Fondateur',
].includes(grade.name));

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('grade')
    .setDescription('🏅 Gestion des grades et rôles')
    .addSubcommand(sub => sub
      .setName('set').setDescription('Attribuer un grade à un membre')
      .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
      .addStringOption(o => o.setName('grade').setDescription('Grade à attribuer').setRequired(true)
        .addChoices(...ASSIGNABLE_GRADES.map(g => ({ name: g.name, value: g.name })))
      )
    )
    .addSubcommand(sub => sub
      .setName('info').setDescription('Voir le grade d\'un membre')
      .addUserOption(o => o.setName('membre').setDescription('Membre').setRequired(true))
    ) as any,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    if (sub === 'set') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        await interaction.reply({ content: '❌ La permission Gérer les rôles est requise.', ephemeral: true });
        return;
      }
      const targetUser = interaction.options.getUser('membre', true);
      const gradeName = interaction.options.getString('grade', true);
      const member = await guild.members.fetch(targetUser.id);

      // Attribuer le nouveau grade
      const newRole = guild.roles.cache.find(r => r.name === gradeName);
      if (!newRole) {
        await interaction.reply({ content: '❌ Rôle introuvable. Lance d\'abord `/setup`.', ephemeral: true });
        return;
      }

      if (!ASSIGNABLE_GRADES.some((grade) => grade.name === newRole.name)) {
        await interaction.reply({ content: '❌ Ce rôle sensible ne peut pas être attribué avec cette commande.', ephemeral: true });
        return;
      }

      const actor = await guild.members.fetch(interaction.user.id);
      const isAdministrator = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
      if (!newRole.editable || !member.manageable) {
        await interaction.reply({ content: '❌ La hiérarchie Discord empêche le bot de gérer ce rôle ou ce membre.', ephemeral: true });
        return;
      }
      if (!isAdministrator && (
        newRole.position >= actor.roles.highest.position
        || member.roles.highest.position >= actor.roles.highest.position
      )) {
        await interaction.reply({ content: '❌ Tu ne peux pas gérer un rôle ou un membre placé aussi haut que toi.', ephemeral: true });
        return;
      }

      // Retirer uniquement les grades non sensibles gérés par cette commande.
      const gradeRoles = guild.roles.cache.filter(r => ASSIGNABLE_GRADES.some(g => g.name === r.name));
      await member.roles.remove(gradeRoles);

      await member.roles.add(newRole);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🏅 Grade attribué')
        .addFields(
          { name: 'Membre', value: `${targetUser}`, inline: true },
          { name: 'Nouveau grade', value: gradeName, inline: true },
          { name: 'Par', value: `${interaction.user}`, inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'info') {
      const targetUser = interaction.options.getUser('membre', true);
      const member = await guild.members.fetch(targetUser.id);
      const currentGrades = member.roles.cache
        .filter(r => GRADES.some(g => g.name === r.name))
        .map(r => r.name)
        .join(', ') || 'Aucun grade';

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`🏅 Grade de ${targetUser.username}`)
        .setDescription(currentGrades)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
export default command;
