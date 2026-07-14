import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';

export interface Command {
  data: { name: string; toJSON: () => object };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  handleButton?: (interaction: ButtonInteraction) => Promise<void>;
}

export interface WarnData {
  userId: string;
  guildId: string;
  warns: Warn[];
}

export interface Warn {
  id: string;
  reason: string;
  moderatorId: string;
  timestamp: number;
}

export interface StoreData {
  warnings: Record<string, Warn[]>;
  tickets: Record<string, TicketData>;
  grades: Record<string, string>;
}

export interface TicketData {
  channelId: string;
  userId: string;
  subject: string;
  createdAt: number;
  closed: boolean;
}
