import { Events, Interaction, Collection } from 'discord.js';
import { ExtendedClient } from '../client';
import { Command } from '../types';

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction, client: ExtendedClient) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName) as Command | undefined;
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`❌ Erreur commande ${interaction.commandName}:`, error);
        const reply = { content: '❌ Une erreur est survenue.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }

    if (interaction.isButton()) {
      const [action] = interaction.customId.split('_');
      const command = client.commands.get(action) as Command | undefined;
      if (command?.handleButton) {
        try {
          await command.handleButton(interaction);
        } catch (error) {
          console.error(`❌ Erreur bouton ${interaction.customId}:`, error);
        }
      }
    }
  },
};
