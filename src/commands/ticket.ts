import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Command } from '../types';
import { createTicket, getTicket, closeTicket } from '../store';

const TICKET_PREFIX = 'ticket-';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Système de tickets')
    .addSubcommand(sub => sub
      .setName('panel').setDescription('Envoyer le panel de tickets dans ce channel')
    )
    .addSubcommand(sub => sub
      .setName('fermer').setDescription('Fermer ce ticket')
    ) as any,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎫 Support SR Editer')
        .setDescription(
          'Tu as besoin d\'aide ?\n\n' +
          '📋 **Bug** — Signaler un problème\n' +
          '❓ **Question** — Une question sur SR Editer\n' +
          '💼 **Autre** — Toute autre demande\n\n' +
          'Clique sur le bouton ci-dessous pour ouvrir un ticket !'
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('ticket_open_bug').setLabel('🐛 Bug').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_open_question').setLabel('❓ Question').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_open_autre').setLabel('💼 Autre').setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === 'fermer') {
      const channel = interaction.channel as TextChannel;
      if (!channel.name.startsWith(TICKET_PREFIX)) {
        await interaction.reply({ content: '❌ Ce channel n\'est pas un ticket.', ephemeral: true });
        return;
      }

      const ticketData = getTicket(channel.id);
      if (ticketData) closeTicket(channel.id);

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🔒 Ticket fermé')
        .setDescription(`Fermé par ${interaction.user}. Ce channel sera supprimé dans 5 secondes.`);

      await interaction.reply({ embeds: [embed] });
      setTimeout(() => channel.delete().catch(console.error), 5000);
    }
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, action, type] = interaction.customId.split('_');
    if (action !== 'open') return;

    const guild = interaction.guild!;
    const user = interaction.user;

    // Vérifier si un ticket existe déjà
    const existingTicket = guild.channels.cache.find(
      c => c.name === `${TICKET_PREFIX}${user.username.toLowerCase().replace(/\s/g, '-')}`
    );
    if (existingTicket) {
      await interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : ${existingTicket}`, ephemeral: true });
      return;
    }

    const modRole = guild.roles.cache.find(r => r.name === '🛡️ Modérateur');
    const adminRole = guild.roles.cache.find(r => r.name === '🔧 Administrateur');
    const ticketCategory = guild.channels.cache.find(c => c.name === '🎟️ TICKETS');

    const ticketChannel = await guild.channels.create({
      name: `${TICKET_PREFIX}${user.username.toLowerCase().replace(/\s/g, '-')}`,
      type: ChannelType.GuildText,
      parent: ticketCategory?.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...(modRole ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
        ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
      ],
    }) as TextChannel;

    createTicket(ticketChannel.id, {
      channelId: ticketChannel.id,
      userId: user.id,
      subject: type,
      createdAt: Date.now(),
      closed: false,
    });

    const typeLabels: Record<string, string> = { bug: '🐛 Bug', question: '❓ Question', autre: '💼 Autre' };
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${typeLabels[type] || '🎫 Ticket'} — Ticket de ${user.username}`)
      .setDescription(
        `Bienvenue ${user} !\n\n` +
        `Décris ton problème ou ta question en détail.\n` +
        `L'équipe SR Editer te répondra rapidement.\n\n` +
        `Pour fermer ce ticket : \`/ticket fermer\``
      )
      .setTimestamp();

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close`).setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger),
    );

    await ticketChannel.send({ content: `${user} ${modRole ?? ''}`, embeds: [embed], components: [closeRow] });
    await interaction.reply({ content: `✅ Ton ticket a été créé : ${ticketChannel}`, ephemeral: true });
  },
};
export default command;
