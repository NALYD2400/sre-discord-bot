import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember) {
    const guild = member.guild;

    // Message de bienvenue
    const configuredWelcomeChannel = process.env.WELCOME_CHANNEL_ID
      ? guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID)
      : undefined;
    const welcomeChannel = (configuredWelcomeChannel ?? guild.channels.cache.find(
      c => c.name === '🏠・accueil' || c.name === 'accueil'
    )) as TextChannel | undefined;

    if (!welcomeChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`👋 Bienvenue sur SR Editer !`)
      .setDescription(
        `Salut ${member}! Nous sommes ravis de t'accueillir sur le serveur officiel de **SR Editer**.\n\n` +
        `📜 Lis le **#📜・règlement** pour connaître les règles\n` +
        `❓ Consulte le **#❓・faq** pour les questions fréquentes\n` +
        `🎫 Ouvre un **ticket** si tu as besoin d'aide\n\n` +
        `Bonne visite ! 🚀`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `Membre #${guild.memberCount}` })
      .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
  },
};
