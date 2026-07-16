import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  CategoryChannel,
  ChannelType,
  TextChannel,
  ForumChannel,
  Role,
  ColorResolvable,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
} from 'discord.js';
import { Command } from '../types';

const SETUP_REQUIRED_PERMISSIONS: Array<[bigint, string]> = [
  [PermissionFlagsBits.ViewChannel, 'Voir les salons'],
  [PermissionFlagsBits.SendMessages, 'Envoyer des messages'],
  [PermissionFlagsBits.EmbedLinks, 'Intégrer des liens'],
  [PermissionFlagsBits.ReadMessageHistory, 'Voir l’historique des messages'],
  [PermissionFlagsBits.ManageChannels, 'Gérer les salons'],
  [PermissionFlagsBits.ManageRoles, 'Gérer les rôles'],
];

export function getMissingSetupPermissions(permissions: { has(permission: bigint): boolean }): string[] {
  return SETUP_REQUIRED_PERMISSIONS
    .filter(([permission]) => !permissions.has(permission))
    .map(([, label]) => label);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('🏗️ Configure automatiquement le serveur SR Editer (channels, rôles, forums)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild!;
    const logs: string[] = [];
    let setupStage = 'vérification des permissions du bot';

    try {
      const botMember = await guild.members.fetchMe();
      const missingPermissions = getMissingSetupPermissions(botMember.permissions);
      if (missingPermissions.length) {
        await interaction.editReply({
          content:
            '❌ **Setup bloqué avant toute modification.**\n' +
            `Le rôle du bot **${botMember.displayName}** manque de : **${missingPermissions.join(', ')}**.\n\n` +
            'Dans **Paramètres du serveur → Rôles**, active ces permissions sur le rôle du bot, ' +
            'puis place-le sous Fondateur/Administrateur mais au-dessus des rôles qu’il doit gérer. Relance ensuite `/setup`.',
        });
        return;
      }

      // ============= RÔLES =============
      setupStage = 'création et mise à jour des rôles';
      const rolesConfig: {
        name: string;
        color: ColorResolvable;
        hoist: boolean;
        permissions?: bigint[];
      }[] = [
        {
          name: '👑 Fondateur',
          color: '#FFD700',
          hoist: true,
          permissions: [PermissionFlagsBits.Administrator],
        },
        {
          name: '🔧 Administrateur',
          color: '#E74C3C',
          hoist: true,
          permissions: [PermissionFlagsBits.Administrator],
        },
        {
          name: '🛡️ Modérateur',
          color: '#E67E22',
          hoist: true,
          permissions: [
            PermissionFlagsBits.ViewAuditLog,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ManageNicknames,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ModerateMembers,
          ],
        },
        { name: '💻 Développeur',     color: '#3498DB', hoist: true, permissions: [] },
        { name: '🎨 Designer',        color: '#9B59B6', hoist: true, permissions: [] },
        { name: '🧪 Testeur Bêta',    color: '#1ABC9C', hoist: true, permissions: [] },
        { name: '💎 SR Premium',      color: '#FF69B4', hoist: true, permissions: [] },
        { name: '🚀 SR Pro',          color: '#1E90FF', hoist: true, permissions: [] },
        { name: '⚡ SR Standard',     color: '#00FFFF', hoist: true, permissions: [] },
        { name: '💬 Support',         color: '#2ECC71', hoist: false, permissions: [] },
        { name: '⭐ Membre Actif',    color: '#F39C12', hoist: false, permissions: [] },
        { name: '👤 Membre',          color: '#95A5A6', hoist: false, permissions: [] },
      ];

      for (const roleConf of rolesConfig) {
        const existing = guild.roles.cache.find(r => r.name === roleConf.name);
        if (!existing) {
          await guild.roles.create({
            name: roleConf.name,
            color: roleConf.color,
            hoist: roleConf.hoist,
            permissions: roleConf.permissions,
          });
          logs.push(`✅ Rôle créé : ${roleConf.name}`);
        } else if (roleConf.permissions && existing.editable) {
          await existing.edit({ permissions: roleConf.permissions });
          logs.push(`⚙️ Permissions du rôle mises à jour : ${roleConf.name}`);
        } else if (roleConf.permissions && !existing.editable) {
          logs.push(`⚠️ Rôle trop haut pour être corrigé par le bot : ${roleConf.name}`);
        } else {
          logs.push(`⏭️ Rôle existant : ${roleConf.name}`);
        }
      }

      await guild.roles.fetch();

      const subscriptionHierarchy = [
        '💎 SR Premium',
        '🚀 SR Pro',
        '⚡ SR Standard',
        '⭐ Membre Actif',
        '👤 Membre',
      ];
      const hierarchyRoles = subscriptionHierarchy
        .map((name) => guild.roles.cache.find((role) => role.name === name))
        .filter((role): role is Role => role !== undefined);

      if (hierarchyRoles.length === subscriptionHierarchy.length && hierarchyRoles.every((role) => role.editable)) {
        const availablePositions = hierarchyRoles
          .map((role) => role.position)
          .sort((left, right) => right - left);
        const hierarchyIsCorrect = hierarchyRoles.every(
          (role, index) => role.position === availablePositions[index]
        );

        if (!hierarchyIsCorrect) {
          setupStage = 'réorganisation des rôles d’abonnement';
          try {
            await guild.roles.setPositions(hierarchyRoles.map((role, index) => ({
              role,
              position: availablePositions[index],
            })));
            await guild.roles.fetch();
            logs.push('⚙️ Hiérarchie mise à jour : Premium > Pro > Standard > Membre Actif > Membre');
          } catch (error) {
            console.warn('Setup subscription hierarchy skipped:', error);
            logs.push('⚠️ Hiérarchie non modifiée : place le rôle du bot au-dessus de Premium, Pro, Standard, Membre Actif et Membre');
          }
        } else {
          logs.push('⏭️ Hiérarchie des abonnements déjà correcte');
        }
      } else {
        logs.push('⚠️ Hiérarchie des abonnements non modifiable : vérifie les rôles et la position du bot');
      }

      const adminRole   = guild.roles.cache.find(r => r.name === '🔧 Administrateur');
      const modRole     = guild.roles.cache.find(r => r.name === '🛡️ Modérateur');
      const everyoneRole = guild.roles.everyone;
      setupStage = 'nettoyage des permissions générales';
      const obsoleteNewRole = guild.roles.cache.find(r => r.name === '🆕 Nouveau');
      if (obsoleteNewRole?.editable) {
        await obsoleteNewRole.delete('Rôle Nouveau supprimé : validation par règlement obligatoire');
        logs.push('✅ Ancien rôle Nouveau supprimé');
      } else if (obsoleteNewRole) {
        logs.push('⚠️ Le rôle Nouveau doit être supprimé manuellement (hiérarchie du bot)');
      }

      const cleanedEveryonePermissions = everyoneRole.permissions.remove([
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageWebhooks,
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.CreateGuildExpressions,
        PermissionFlagsBits.ManageGuildExpressions,
      ]);
      await everyoneRole.setPermissions(cleanedEveryonePermissions);
      logs.push('⚙️ Permissions dangereuses retirées de @everyone');

      // ============= CATEGORIES & CHANNELS =============
      const structure: {
        category: string;
        channels: {
          name: string;
          type: ChannelType;
          topic?: string;
          private?: boolean;
          preAccept?: boolean;
          slowmode?: number;
        }[];
      }[] = [
        {
          category: '📢 INFORMATIONS',
          channels: [
            { name: '🏠・accueil',         type: ChannelType.GuildText,  topic: 'Bienvenue sur SR Editer !' },
            { name: '📣・annonces',         type: ChannelType.GuildText,  topic: 'Annonces officielles SR Editer' },
            {
              name: '📜・règlement',
              type: ChannelType.GuildText,
              topic: 'Règles du serveur',
              preAccept: true,
            },
            { name: '🔄・mises-à-jour',    type: ChannelType.GuildText,  topic: 'Changelog et nouvelles versions' },
            { name: '🗺️・roadmap',         type: ChannelType.GuildText,  topic: 'Fonctionnalités prévues pour SR Editer' },
            { name: '🤝・partenariats',    type: ChannelType.GuildText,  topic: 'Nos partenaires officiels' },
          ],
        },
        {
          category: '💬 COMMUNAUTÉ',
          channels: [
            { name: '💬・général',          type: ChannelType.GuildText,  topic: 'Discussion générale' },
            { name: '🖼️・showcase',         type: ChannelType.GuildText,  topic: 'Montre tes créations avec SR Editer', slowmode: 10 },
            { name: '😂・memes',            type: ChannelType.GuildText,  topic: 'Humour et détente', slowmode: 5 },
            { name: '🎉・événements',       type: ChannelType.GuildText,  topic: 'Events et concours de la communauté' },
            { name: '🔗・réseaux-sociaux',  type: ChannelType.GuildText,  topic: 'Partage tes réseaux et contenus' },
          ],
        },
        {
          category: '🎙️ VOCAL',
          channels: [
            { name: '🔊・vocal-général',    type: ChannelType.GuildVoice },
            { name: '🎬・vocal-édition',    type: ChannelType.GuildVoice },
            { name: '🎮・vocal-gaming',     type: ChannelType.GuildVoice },
            { name: '💼・vocal-travail',    type: ChannelType.GuildVoice },
            { name: '🎵・vocal-musique',    type: ChannelType.GuildVoice },
            { name: '🤫・vocal-afk',        type: ChannelType.GuildVoice },
            { name: '📺・stream',           type: ChannelType.GuildStageVoice },
          ],
        },
        {
          category: '🛠️ SR EDITER — APP',
          channels: [
            { name: '❓・faq',                  type: ChannelType.GuildText,   topic: 'Questions fréquentes sur SR Editer' },
            { name: '📥・téléchargements',      type: ChannelType.GuildText,   topic: 'Liens de téléchargement officiels SR Editer' },
            { name: '📖・guide-démarrage',      type: ChannelType.GuildText,   topic: 'Comment commencer avec SR Editer' },
            { name: '💡・suggestions',          type: ChannelType.GuildForum,  topic: 'Propose des améliorations pour SR Editer' },
            { name: '🐛・signaler-un-bug',      type: ChannelType.GuildForum,  topic: 'Signale un bug dans SR Editer' },
            { name: '📚・tutoriels',            type: ChannelType.GuildForum,  topic: 'Partage tes tutoriels et astuces SR Editer' },
            { name: '🎬・projets-communauté',   type: ChannelType.GuildForum,  topic: 'Partage tes projets réalisés avec SR Editer' },
            { name: '🌐・traductions',          type: ChannelType.GuildForum,  topic: 'Aide à traduire SR Editer dans ta langue' },
          ],
        },
        {
          category: '🎫 SUPPORT',
          channels: [
            { name: '🎫・ouvrir-un-ticket',     type: ChannelType.GuildText,   topic: 'Ouvre un ticket pour obtenir de l\'aide' },
            { name: '📋・statut-tickets',       type: ChannelType.GuildText,   topic: 'Statut des tickets en cours', private: true },
          ],
        },
        {
          category: '📁 RESSOURCES',
          channels: [
            { name: '🔗・liens-utiles',         type: ChannelType.GuildText,  topic: 'Ressources et liens importants' },
            { name: '🎨・assets-graphiques',    type: ChannelType.GuildText,  topic: 'Assets, logos et ressources graphiques SR Editer' },
            { name: '🖥️・compatibilité',        type: ChannelType.GuildText,  topic: 'Configurations système compatibles avec SR Editer' },
          ],
        },
        {
          category: '🔒 MODÉRATION',
          channels: [
            { name: '📊・logs',             type: ChannelType.GuildText, private: true },
            { name: '👥・sanctions',        type: ChannelType.GuildText, private: true },
            { name: '🗣️・staff-général',   type: ChannelType.GuildText, private: true },
            { name: '📋・rapports',         type: ChannelType.GuildText, private: true },
            { name: '🔊・vocal-staff',      type: ChannelType.GuildVoice },
          ],
        },
        {
          category: '🎟️ TICKETS',
          channels: [],
        },
      ];

      const memberRole  = guild.roles.cache.find(r => r.name === '👤 Membre');

      setupStage = 'mise à jour des catégories et salons';
      for (const section of structure) {
        let category = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === section.category
        ) as CategoryChannel | undefined;

        let permissionOverwrites: any[] = [];
        if (section.category === '📢 INFORMATIONS') {
          permissionOverwrites = [
            { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...(memberRole ? [{ id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }] : []),
            ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
            ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
          ];
        } else if (section.category === '🔒 MODÉRATION') {
          permissionOverwrites = [
            { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
            ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
          ];
        } else {
          permissionOverwrites = [
            { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...(memberRole ? [{ id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
            ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
            ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
          ];
        }

        if (!category) {
          category = await guild.channels.create({
            name: section.category,
            type: ChannelType.GuildCategory,
            permissionOverwrites,
          }) as CategoryChannel;
          logs.push(`✅ Catégorie créée : ${section.category}`);
        } else {
          await category.edit({ permissionOverwrites });
          logs.push(`⚙️ Perms catégorie mises à jour : ${section.category}`);
        }

        for (const ch of section.channels) {
          const existing = guild.channels.cache.find(
            c => c.name === ch.name && c.parentId === category.id
          ) ?? guild.channels.cache.find(c => c.name === ch.name);
          if (existing) {
            const compatibleTypes = ch.type === ChannelType.GuildForum
              ? [ChannelType.GuildForum, ChannelType.GuildText]
              : ch.type === ChannelType.GuildStageVoice
                ? [ChannelType.GuildStageVoice, ChannelType.GuildVoice]
                : [ch.type];
            if (!compatibleTypes.includes(existing.type)) {
              logs.push(`⚠️ Type incorrect pour ${ch.name}; correction manuelle requise`);
              continue;
            }

            if ('setParent' in existing && typeof existing.setParent === 'function') {
              await existing.setParent(category.id, { lockPermissions: !ch.private && !ch.preAccept });
            }
            if ((ch.private || ch.preAccept) && 'permissionOverwrites' in existing) {
              const channelOverwrites = ch.preAccept
                ? [
                    {
                      id: everyoneRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                      deny: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                      ],
                    },
                    ...(memberRole ? [{
                      id: memberRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                      deny: [PermissionFlagsBits.SendMessages],
                    }] : []),
                    ...(adminRole ? [{
                      id: adminRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }] : []),
                    ...(modRole ? [{
                      id: modRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }] : []),
                  ]
                : [
                { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
                ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
                ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
                  ];
              await existing.permissionOverwrites.set(channelOverwrites);
            }
            logs.push(`⚙️ Channel vérifié : ${ch.name}`);
            continue;
          }

          try {
            if (ch.type === ChannelType.GuildForum) {
              await guild.channels.create({
                name: ch.name,
                type: ChannelType.GuildForum,
                parent: category.id,
                topic: ch.topic,
              });
            } else if (ch.type === ChannelType.GuildStageVoice) {
              await guild.channels.create({
                name: ch.name,
                type: ChannelType.GuildStageVoice,
                parent: category.id,
              });
            } else if (ch.type === ChannelType.GuildVoice) {
              await guild.channels.create({
                name: ch.name,
                type: ChannelType.GuildVoice,
                parent: category.id,
              });
            } else {
              const permissionOverwrites = ch.preAccept
                ? [
                    {
                      id: everyoneRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                      deny: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                      ],
                    },
                    ...(memberRole ? [{
                      id: memberRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                      deny: [PermissionFlagsBits.SendMessages],
                    }] : []),
                    ...(adminRole ? [{
                      id: adminRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }] : []),
                    ...(modRole ? [{
                      id: modRole.id,
                      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }] : []),
                  ]
                : ch.private
                  ? [
                    { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
                    ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
                    ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
                    ]
                  : [];

              await guild.channels.create({
                name: ch.name,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: ch.topic,
                rateLimitPerUser: ch.slowmode ?? 0,
                permissionOverwrites: permissionOverwrites.length ? permissionOverwrites : undefined,
              });
            }
            logs.push(`✅ Channel créé : ${ch.name}`);
          } catch (err) {
            // Fallback for non-community servers
            try {
              if (ch.type === ChannelType.GuildForum) {
                await guild.channels.create({
                  name: ch.name,
                  type: ChannelType.GuildText,
                  parent: category.id,
                  topic: ch.topic,
                });
                logs.push(`⚠️ ${ch.name} (créé en salon texte car Forum désactivé)`);
              } else if (ch.type === ChannelType.GuildStageVoice) {
                await guild.channels.create({
                  name: ch.name,
                  type: ChannelType.GuildVoice,
                  parent: category.id,
                });
                logs.push(`⚠️ ${ch.name} (créé en salon vocal car Stage désactivé)`);
              } else {
                throw err;
              }
            } catch (fallbackErr) {
              logs.push(`❌ Échec création ${ch.name}`);
            }
          }
        }
      }

      // Les salons Discord créés par défaut hors catégorie restent invisibles
      // jusqu'à l'obtention du rôle Membre.
      setupStage = 'sécurisation des salons hors catégorie';
      const ungroupedChannels = guild.channels.cache.filter((channel) =>
        channel.type !== ChannelType.GuildCategory
        && !channel.isThread()
        && channel.parentId === null
      );
      for (const channel of ungroupedChannels.values()) {
        if (!('permissionOverwrites' in channel)) continue;
        await channel.permissionOverwrites.set([
          { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
          ...(memberRole ? [{ id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
          ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
          ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
        ]);
        logs.push(`⚙️ Salon hors catégorie sécurisé : ${channel.name}`);
      }

      // ============= MESSAGE DE BIENVENUE =============
      setupStage = 'mise à jour du message de bienvenue';
      await guild.channels.fetch();
      const accueilChannel = guild.channels.cache.find(c => c.name === '🏠・accueil') as TextChannel | undefined;
      if (accueilChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🎉 Bienvenue sur le serveur officiel SR Editer !')
          .setDescription(
            '**SR Editer** est un éditeur vidéo conçu pour les créateurs de contenu.\n\n' +
            '📣 Suis **#📣・annonces** pour les dernières nouvelles\n' +
            '📜 Lis **#📜・règlement** avant de participer\n' +
            '❓ Consulte **#❓・faq** pour les questions courantes\n' +
            '🐛 Signale les bugs sur **#🐛・signaler-un-bug**\n' +
            '💡 Propose des idées sur **#💡・suggestions**\n' +
            '🎫 Besoin d\'aide ? Ouvre un ticket !\n\n' +
            '**Bonne visite !** 🚀'
          )
          .setImage('https://i.imgur.com/AfFp7pu.png')
          .setTimestamp();

        const messages = await accueilChannel.messages.fetch({ limit: 50 }).catch(() => null);
        const existingWelcome = messages?.find((message) =>
          message.author.id === interaction.client.user.id
          && message.embeds.some((embed) => embed.title === '🎉 Bienvenue sur le serveur officiel SR Editer !')
        );
        if (existingWelcome) {
          await existingWelcome.edit({ embeds: [welcomeEmbed] });
          logs.push('⚙️ Message de bienvenue mis à jour');
        } else {
          await accueilChannel.send({ embeds: [welcomeEmbed] });
          logs.push('✅ Message de bienvenue envoyé');
        }
      }

      // ============= RÈGLEMENT & BOUTON RÔLE =============
      setupStage = 'mise à jour du règlement';
      const reglementChannel = guild.channels.cache.find(c => c.name === '📜・règlement') as TextChannel | undefined;
      if (reglementChannel) {
        const rulesEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📜 Règlement du serveur SR Editer')
          .setDescription(
            'Bienvenue sur le serveur officiel SR Editer !\n\n' +
            'Pour accéder à l\'intégralité du serveur et pouvoir interagir avec la communauté, veuillez prendre connaissance et accepter les règles suivantes :\n\n' +
            '**1. Respect & Entraide**\nLe respect mutuel est obligatoire. Les insultes, provocations, discriminations et comportements toxiques ne seront pas tolérés.\n\n' +
            '**2. Pas de Spam ou Publicité**\nLe spam, les mentions inutiles et la publicité non sollicitée (en DM ou salons) sont interdits.\n\n' +
            '**3. Contenu Approprié**\nGardez vos discussions constructives et professionnelles. Pas de contenu NSFW ou choquant.\n\n' +
            '**4. Support & Aide**\nPour toute question ou bug avec l\'application SR Editer, utilisez les forums dédiés ou ouvrez un ticket dans **#🎫・ouvrir-un-ticket**.\n\n' +
            '**👉 Cliquez sur le bouton vert ci-dessous pour accepter le règlement, obtenir le rôle 👤 Membre et débloquer tous les salons !**'
          )
          .setFooter({ text: 'SR Editer Team' })
          .setTimestamp();

        const acceptButton = new ButtonBuilder()
          .setCustomId('setup_accept')
          .setLabel('Accepter le règlement')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton);

        const messages = await reglementChannel.messages.fetch({ limit: 50 }).catch(() => null);
        const existingRules = messages?.find((message) =>
          message.author.id === interaction.client.user.id
          && message.embeds.some((embed) => embed.title === '📜 Règlement du serveur SR Editer')
        );
        if (existingRules) {
          await existingRules.edit({ embeds: [rulesEmbed], components: [row] });
          logs.push('⚙️ Message du règlement mis à jour');
        } else {
          await reglementChannel.send({ embeds: [rulesEmbed], components: [row] });
          logs.push('✅ Message du règlement envoyé avec bouton');
        }
      }

      // ============= RÉSUMÉ =============
      setupStage = 'envoi du résumé';
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Setup SR Editer terminé !')
        .setDescription(`**${logs.filter(l => l.startsWith('✅')).length}** éléments créés/configurés\n**${logs.filter(l => l.startsWith('⚙️')).length}** perms mises à jour\n**${logs.filter(l => l.startsWith('⏭️')).length}** déjà existants`)
        .addFields({ name: '📋 Détails', value: logs.slice(0, 20).join('\n') || 'Aucun' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Setup error:', error);
      const message = error instanceof Error ? error.message : String(error);
      const permissionHint = message.includes('Missing Permissions')
        ? '\n\nVérifie les permissions du rôle du bot et sa position dans la hiérarchie Discord.'
        : '';
      await interaction.editReply({
        content: `❌ Erreur pendant **${setupStage}** : ${message}${permissionHint}`,
      });
    }
  },

  async handleButton(interaction: ButtonInteraction) {
    if (interaction.customId === 'setup_accept') {
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild!;
      const member = interaction.member as GuildMember;
      
      const memberRole = guild.roles.cache.find(r => r.name === '👤 Membre');
      if (!memberRole) {
        await interaction.editReply({ content: '❌ Le rôle de Membre n\'existe pas sur ce serveur. Veuillez contacter un administrateur.' });
        return;
      }

      if (member.roles.cache.has(memberRole.id)) {
        await interaction.editReply({ content: 'ℹ️ Vous possédez déjà le rôle Membre !' });
        return;
      }

      try {
        await member.roles.add(memberRole);
        await interaction.editReply({ content: '✅ Règlement accepté ! Vous avez maintenant le rôle **Membre** et accès à l\'ensemble du serveur. Bienvenue ! 🎉' });
      } catch (err) {
        console.error('Error granting member role:', err);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de l\'attribution du rôle.' });
      }
    }
  },
};

export default command;
