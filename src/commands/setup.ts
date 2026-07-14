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
} from 'discord.js';
import { Command } from '../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('🏗️ Configure automatiquement le serveur SR Editer (channels, rôles, forums)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild!;
    const logs: string[] = [];

    try {
      // ============= RÔLES =============
      const rolesConfig: { name: string; color: ColorResolvable; hoist: boolean; position: number }[] = [
        { name: '👑 Fondateur',       color: '#FFD700', hoist: true,  position: 10 },
        { name: '🔧 Administrateur',  color: '#E74C3C', hoist: true,  position: 9  },
        { name: '🛡️ Modérateur',      color: '#E67E22', hoist: true,  position: 8  },
        { name: '💻 Développeur',     color: '#3498DB', hoist: true,  position: 7  },
        { name: '🎨 Designer',        color: '#9B59B6', hoist: true,  position: 6  },
        { name: '🧪 Testeur Bêta',    color: '#1ABC9C', hoist: true,  position: 5  },
        { name: '💬 Support',         color: '#2ECC71', hoist: false, position: 4  },
        { name: '⭐ Membre Actif',    color: '#F39C12', hoist: false, position: 3  },
        { name: '👤 Membre',          color: '#95A5A6', hoist: false, position: 2  },
        { name: '🆕 Nouveau',         color: '#7F8C8D', hoist: false, position: 1  },
      ];

      for (const roleConf of rolesConfig) {
        const existing = guild.roles.cache.find(r => r.name === roleConf.name);
        if (!existing) {
          await guild.roles.create({ name: roleConf.name, color: roleConf.color, hoist: roleConf.hoist });
          logs.push(`✅ Rôle créé : ${roleConf.name}`);
        } else {
          logs.push(`⏭️ Rôle existant : ${roleConf.name}`);
        }
      }

      await guild.roles.fetch();

      const adminRole   = guild.roles.cache.find(r => r.name === '🔧 Administrateur');
      const modRole     = guild.roles.cache.find(r => r.name === '🛡️ Modérateur');
      const everyoneRole = guild.roles.everyone;

      // ============= CATEGORIES & CHANNELS =============
      const structure: {
        category: string;
        channels: { name: string; type: ChannelType; topic?: string; private?: boolean; slowmode?: number }[];
      }[] = [
        {
          category: '📢 INFORMATIONS',
          channels: [
            { name: '🏠・accueil',         type: ChannelType.GuildText,  topic: 'Bienvenue sur SR Editer !' },
            { name: '📣・annonces',         type: ChannelType.GuildText,  topic: 'Annonces officielles SR Editer' },
            { name: '📜・règlement',        type: ChannelType.GuildText,  topic: 'Règles du serveur' },
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

      for (const section of structure) {
        let category = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === section.category
        ) as CategoryChannel | undefined;

        if (!category) {
          const permissionOverwrites = section.category === '🔒 MODÉRATION'
            ? [
                { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
                ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
                ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
              ]
            : [];

          category = await guild.channels.create({
            name: section.category,
            type: ChannelType.GuildCategory,
            permissionOverwrites,
          }) as CategoryChannel;
          logs.push(`✅ Catégorie créée : ${section.category}`);
        }

        for (const ch of section.channels) {
          const existing = guild.channels.cache.find(c => c.name === ch.name);
          if (existing) {
            logs.push(`⏭️ Channel existant : ${ch.name}`);
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
              const permissionOverwrites = ch.private
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

      // ============= MESSAGE DE BIENVENUE =============
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

        await accueilChannel.send({ embeds: [welcomeEmbed] });
        logs.push('✅ Message de bienvenue envoyé');
      }

      // ============= RÉSUMÉ =============
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Setup SR Editer terminé !')
        .setDescription(`**${logs.filter(l => l.startsWith('✅')).length}** éléments créés\n**${logs.filter(l => l.startsWith('⏭️')).length}** déjà existants`)
        .addFields({ name: '📋 Détails', value: logs.slice(0, 20).join('\n') || 'Aucun' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Setup error:', error);
      await interaction.editReply({
        content: `❌ Erreur pendant le setup: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  },
};

export default command;
