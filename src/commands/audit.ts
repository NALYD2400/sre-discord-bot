import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';

const REQUIRED_ROLES = [
  '👑 Fondateur',
  '🔧 Administrateur',
  '🛡️ Modérateur',
  '💻 Développeur',
  '🎨 Designer',
  '🧪 Testeur Bêta',
  '💎 SR Premium',
  '🚀 SR Pro',
  '⚡ SR Standard',
  '💬 Support',
  '⭐ Membre Actif',
  '👤 Membre',
  '🆕 Nouveau',
];

const REQUIRED_CATEGORIES = [
  '📢 INFORMATIONS',
  '💬 COMMUNAUTÉ',
  '🎙️ VOCAL',
  '🛠️ SR EDITER — APP',
  '🎫 SUPPORT',
  '📁 RESSOURCES',
  '🔒 MODÉRATION',
  '🎟️ TICKETS',
];

const REQUIRED_CHANNELS = [
  '🏠・accueil', '📣・annonces', '📜・règlement', '🔄・mises-à-jour', '🗺️・roadmap',
  '🤝・partenariats', '💬・général', '🖼️・showcase', '😂・memes', '🎉・événements',
  '🔗・réseaux-sociaux', '🔊・vocal-général', '🎬・vocal-édition', '🎮・vocal-gaming',
  '💼・vocal-travail', '🎵・vocal-musique', '🤫・vocal-afk', '📺・stream', '❓・faq',
  '📥・téléchargements', '📖・guide-démarrage', '💡・suggestions', '🐛・signaler-un-bug',
  '📚・tutoriels', '🎬・projets-communauté', '🌐・traductions', '🎫・ouvrir-un-ticket',
  '📋・statut-tickets', '🔗・liens-utiles', '🎨・assets-graphiques', '🖥️・compatibilité',
  '📊・logs', '👥・sanctions', '🗣️・staff-général', '📋・rapports', '🔊・vocal-staff',
];

const DANGEROUS_PERMISSIONS: Array<[bigint, string]> = [
  [PermissionFlagsBits.Administrator, 'Administrateur'],
  [PermissionFlagsBits.ManageGuild, 'Gérer le serveur'],
  [PermissionFlagsBits.ManageRoles, 'Gérer les rôles'],
  [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
  [PermissionFlagsBits.KickMembers, 'Expulser des membres'],
  [PermissionFlagsBits.BanMembers, 'Bannir des membres'],
  [PermissionFlagsBits.ModerateMembers, 'Exclure temporairement'],
  [PermissionFlagsBits.ManageMessages, 'Gérer les messages'],
  [PermissionFlagsBits.ManageWebhooks, 'Gérer les webhooks'],
  [PermissionFlagsBits.MentionEveryone, 'Mentionner everyone'],
  [PermissionFlagsBits.CreateGuildExpressions, 'Créer des expressions'],
];

const BOT_REQUIRED_PERMISSIONS: Array<[bigint, string]> = [
  [PermissionFlagsBits.ViewChannel, 'Voir les salons'],
  [PermissionFlagsBits.SendMessages, 'Envoyer des messages'],
  [PermissionFlagsBits.EmbedLinks, 'Intégrer des liens'],
  [PermissionFlagsBits.ReadMessageHistory, 'Voir l’historique'],
  [PermissionFlagsBits.ManageMessages, 'Gérer les messages'],
  [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
  [PermissionFlagsBits.ManageRoles, 'Gérer les rôles'],
  [PermissionFlagsBits.KickMembers, 'Expulser des membres'],
  [PermissionFlagsBits.BanMembers, 'Bannir des membres'],
  [PermissionFlagsBits.ModerateMembers, 'Exclure temporairement'],
];

export function duplicateNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('audit')
    .setDescription('🔎 Vérifie les rôles, salons et permissions du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ Cette commande doit être utilisée sur un serveur.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
    const botMember = await guild.members.fetchMe();
    const issues: string[] = [];
    const warnings: string[] = [];

    for (const roleName of REQUIRED_ROLES) {
      if (!guild.roles.cache.some((role) => role.name === roleName)) issues.push(`Rôle manquant : ${roleName}`);
    }
    for (const name of duplicateNames(guild.roles.cache.map((role) => role.name))) {
      issues.push(`Rôle en double : ${name}`);
    }

    const staffRoleNames = new Set(['👑 Fondateur', '🔧 Administrateur', '🛡️ Modérateur', botMember.roles.highest.name]);
    for (const role of guild.roles.cache.values()) {
      if (staffRoleNames.has(role.name)) continue;
      const dangerous = DANGEROUS_PERMISSIONS
        .filter(([permission]) => role.permissions.has(permission))
        .map(([, label]) => label);
      if (dangerous.length) issues.push(`${role.name} : ${dangerous.join(', ')}`);
    }

    const missingBotPermissions = BOT_REQUIRED_PERMISSIONS
      .filter(([permission]) => !botMember.permissions.has(permission))
      .map(([, label]) => label);
    if (missingBotPermissions.length) {
      issues.push(`Bot sans permissions : ${missingBotPermissions.join(', ')}`);
    }

    const managedRoleNames = new Set([
      '💻 Développeur', '🎨 Designer', '🧪 Testeur Bêta', '💎 SR Premium', '🚀 SR Pro',
      '⚡ SR Standard', '💬 Support', '⭐ Membre Actif', '👤 Membre', '🆕 Nouveau',
    ]);
    const unmanageableRoles = guild.roles.cache.filter((role) =>
      managedRoleNames.has(role.name) && role.position >= botMember.roles.highest.position
    );
    if (unmanageableRoles.size) {
      issues.push(`Rôles placés au-dessus du bot : ${unmanageableRoles.map((role) => role.name).join(', ')}`);
    }
    const founderRole = guild.roles.cache.find((role) => role.name === '👑 Fondateur');
    const adminRole = guild.roles.cache.find((role) => role.name === '🔧 Administrateur');
    if ((founderRole && botMember.roles.highest.position > founderRole.position)
      || (adminRole && botMember.roles.highest.position > adminRole.position)) {
      warnings.push('Place le bot sous Fondateur/Administrateur, mais au-dessus des rôles qu’il gère.');
    }

    for (const categoryName of REQUIRED_CATEGORIES) {
      if (!guild.channels.cache.some((channel) =>
        channel.type === ChannelType.GuildCategory && channel.name === categoryName
      )) issues.push(`Catégorie manquante : ${categoryName}`);
    }

    const memberRole = guild.roles.cache.find((role) => role.name === '👤 Membre');
    const newRole = guild.roles.cache.find((role) => role.name === '🆕 Nouveau');
    const moderatorRole = guild.roles.cache.find((role) => role.name === '🛡️ Modérateur');
    const categoryRoles = [adminRole, moderatorRole].filter((role) => role !== undefined);
    for (const categoryName of REQUIRED_CATEGORIES) {
      const category = guild.channels.cache.find((channel) =>
        channel.type === ChannelType.GuildCategory && channel.name === categoryName
      );
      if (!category || category.type !== ChannelType.GuildCategory) continue;

      const everyoneOverwrite = category.permissionOverwrites.cache.get(guild.roles.everyone.id);
      const isInformation = categoryName === '📢 INFORMATIONS';
      const isModeration = categoryName === '🔒 MODÉRATION';
      if (isInformation) {
        if (!everyoneOverwrite?.allow.has(PermissionFlagsBits.ViewChannel)
          || !everyoneOverwrite.deny.has(PermissionFlagsBits.SendMessages)) {
          issues.push(`${categoryName} : @everyone doit voir sans pouvoir écrire`);
        }
      } else if (!everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel)) {
        issues.push(`${categoryName} : accès @everyone non bloqué`);
      }

      for (const staffRole of categoryRoles) {
        if (!category.permissionOverwrites.cache.get(staffRole.id)?.allow.has(PermissionFlagsBits.ViewChannel)) {
          issues.push(`${categoryName} : ${staffRole.name} ne peut pas voir`);
        }
      }

      if (!isInformation && !isModeration) {
        if (memberRole && !category.permissionOverwrites.cache.get(memberRole.id)?.allow.has(PermissionFlagsBits.ViewChannel)) {
          issues.push(`${categoryName} : accès Membre manquant`);
        }
        if (newRole && !category.permissionOverwrites.cache.get(newRole.id)?.deny.has(PermissionFlagsBits.ViewChannel)) {
          issues.push(`${categoryName} : accès Nouveau non bloqué`);
        }
      }
    }

    for (const channelName of REQUIRED_CHANNELS) {
      if (!guild.channels.cache.some((channel) => channel.name === channelName)) {
        issues.push(`Salon manquant : ${channelName}`);
      }
    }
    for (const name of duplicateNames(guild.channels.cache.map((channel) => channel.name))) {
      warnings.push(`Nom de salon en double : ${name}`);
    }

    const ungrouped = guild.channels.cache.filter((channel) =>
      channel.type !== ChannelType.GuildCategory
      && !channel.isThread()
      && channel.parentId === null
    );
    if (ungrouped.size) {
      warnings.push(`Salons hors catégorie : ${ungrouped.map((channel) => channel.name).join(', ')}`);
    }

    const idChecks: Array<[string, string | undefined]> = [
      ['ROLE_STANDARD_ID', process.env.ROLE_STANDARD_ID],
      ['ROLE_PRO_ID', process.env.ROLE_PRO_ID],
      ['ROLE_PREMIUM_ID', process.env.ROLE_PREMIUM_ID],
    ];
    for (const [key, id] of idChecks) {
      if (!id || !guild.roles.cache.has(id)) issues.push(`${key} absent ou invalide`);
    }
    const channelIdChecks: Array<[string, string | undefined]> = [
      ['WELCOME_CHANNEL_ID', process.env.WELCOME_CHANNEL_ID],
      ['LOG_CHANNEL_ID', process.env.LOG_CHANNEL_ID],
      ['TICKET_CATEGORY_ID', process.env.TICKET_CATEGORY_ID],
    ];
    for (const [key, id] of channelIdChecks) {
      if (!id || !guild.channels.cache.has(id)) issues.push(`${key} absent ou invalide`);
    }

    const lines = [
      ...issues.map((issue) => `❌ ${issue}`),
      ...warnings.map((warning) => `⚠️ ${warning}`),
    ];
    const visibleLines = lines.slice(0, 35);
    if (lines.length > visibleLines.length) visibleLines.push(`… et ${lines.length - visibleLines.length} autre(s)`);

    const embed = new EmbedBuilder()
      .setColor(issues.length ? 0xE67E22 : warnings.length ? 0xF1C40F : 0x2ECC71)
      .setTitle(issues.length ? '🔎 Audit Discord — corrections requises' : '✅ Audit Discord — opérationnel')
      .setDescription(visibleLines.join('\n') || 'Aucun problème détecté.')
      .addFields({
        name: 'Résumé',
        value: `${guild.roles.cache.size} rôles · ${guild.channels.cache.size} salons/catégories · ${guild.memberCount} membres\n${issues.length} erreur(s) · ${warnings.length} avertissement(s)`,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
