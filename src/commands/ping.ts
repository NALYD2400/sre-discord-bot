import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Voir la latence du bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: '🏓 Calcul...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(latency < 100 ? 0x2ECC71 : latency < 300 ? 0xF39C12 : 0xE74C3C)
      .setTitle('🏓 Pong !')
      .addFields(
        { name: '⏱️ Latence', value: `${latency}ms`, inline: true },
        { name: '💓 API Discord', value: `${apiLatency}ms`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
export default command;
