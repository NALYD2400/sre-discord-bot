import http, { IncomingMessage } from 'http';
import { timingSafeEqual } from 'crypto';
import { EmbedBuilder, TextChannel, type Guild, type GuildMember, type Role } from 'discord.js';
import { ExtendedClient } from './client';

export type SubscriptionTier = 'free' | 'standard' | 'pro' | 'premium';

export type PatchnotePayload = {
  version: string;
  notes: string;
  artifact_url?: string;
};

type PatchnoteValidationResult =
  | { ok: true; value: PatchnotePayload }
  | { ok: false; error: string };

type SyncPayload = {
  discord_id: string;
  tier: SubscriptionTier;
  require_membership: boolean;
};

type ValidationResult =
  | { ok: true; value: SyncPayload }
  | { ok: false; error: string };

type GuildSyncResult = {
  guild_id: string;
  status: 'synced' | 'not_member' | 'rules_not_accepted' | 'error';
  error?: string;
};

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const MAX_BODY_BYTES = 16 * 1024;
const DISCORD_ID_PATTERN = /^\d{17,20}$/;
const VALID_TIERS = new Set<SubscriptionTier>(['free', 'standard', 'pro', 'premium']);

export function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export function secretsMatch(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function validateSyncPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'JSON object required.' };
  }
  const data = input as Record<string, unknown>;
  const discordId = typeof data.discord_id === 'string' ? data.discord_id.trim() : '';
  const tier = typeof data.tier === 'string' ? data.tier : '';
  const requireMembership = data.require_membership ?? false;

  if (!DISCORD_ID_PATTERN.test(discordId)) {
    return { ok: false, error: 'discord_id must be a valid Discord snowflake.' };
  }
  if (!VALID_TIERS.has(tier as SubscriptionTier)) {
    return { ok: false, error: 'tier must be free, standard, pro, or premium.' };
  }
  if (typeof requireMembership !== 'boolean') {
    return { ok: false, error: 'require_membership must be a boolean.' };
  }
  return {
    ok: true,
    value: {
      discord_id: discordId,
      tier: tier as SubscriptionTier,
      require_membership: requireMembership,
    },
  };
}

export function validatePatchnotePayload(input: unknown): PatchnoteValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'JSON object required.' };
  }
  const data = input as Record<string, unknown>;
  const version = typeof data.version === 'string' ? data.version.trim() : '';
  const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
  const artifactUrl = typeof data.artifact_url === 'string' ? data.artifact_url.trim() : undefined;

  if (!version) {
    return { ok: false, error: 'version is required.' };
  }
  if (!notes) {
    return { ok: false, error: 'notes is required.' };
  }
  return {
    ok: true,
    value: {
      version,
      notes,
      artifact_url: artifactUrl,
    },
  };
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  payload: Record<string, unknown>,
): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let tooLarge = false;

    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(new HttpError(413, 'Request body too large.'));
        return;
      }
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, 'Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function roleForTier(guild: Guild, tier: Exclude<SubscriptionTier, 'free'>): Role | null {
  const ids: Record<Exclude<SubscriptionTier, 'free'>, string | undefined> = {
    standard: process.env.ROLE_STANDARD_ID,
    pro: process.env.ROLE_PRO_ID,
    premium: process.env.ROLE_PREMIUM_ID,
  };
  const names: Record<Exclude<SubscriptionTier, 'free'>, string> = {
    standard: '⚡ SR Standard',
    pro: '🚀 SR Pro',
    premium: '💎 SR Premium',
  };
  return (ids[tier] ? guild.roles.cache.get(ids[tier]!) : undefined)
    ?? guild.roles.cache.find((role) => role.name === names[tier])
    ?? null;
}

export async function fetchGuildMemberFresh(guild: Guild, discordId: string): Promise<GuildMember> {
  return await guild.members.fetch({ user: discordId, force: true });
}

async function syncRoleForGuild(
  client: ExtendedClient,
  guildId: string,
  discordId: string,
  tier: SubscriptionTier,
  requireMemberRole = false,
): Promise<GuildSyncResult> {
  try {
    const guild = await client.guilds.fetch(guildId);
    let member;
    try {
      member = await fetchGuildMemberFresh(guild, discordId);
    } catch (error) {
      if ((error as { code?: number }).code === 10007) {
        return { guild_id: guildId, status: 'not_member' };
      }
      throw error;
    }

    if (requireMemberRole) {
      const configuredMemberRoleId = process.env.ROLE_MEMBER_ID?.trim();
      const memberRole = (configuredMemberRoleId
        ? guild.roles.cache.get(configuredMemberRoleId)
        : undefined) ?? guild.roles.cache.find((role) => role.name === '👤 Membre');
      if (!memberRole) throw new Error('Discord Member role is not configured.');
      if (memberRole.id === guild.id) throw new Error('ROLE_MEMBER_ID cannot reference @everyone.');
      if (!member.roles.cache.has(memberRole.id)) {
        return { guild_id: guildId, status: 'rules_not_accepted' };
      }
    }

    const paidTiers: Array<Exclude<SubscriptionTier, 'free'>> = ['standard', 'pro', 'premium'];
    const paidRoles = paidTiers
      .map((paidTier) => ({ tier: paidTier, role: roleForTier(guild, paidTier) }))
      .filter((entry): entry is { tier: Exclude<SubscriptionTier, 'free'>; role: Role } =>
        entry.role !== null);

    if (tier !== 'free' && !paidRoles.some((entry) => entry.tier === tier)) {
      throw new Error(`Discord role for tier "${tier}" is not configured.`);
    }

    for (const entry of paidRoles) {
      const shouldHaveRole = entry.tier === tier;
      const hasRole = member.roles.cache.has(entry.role.id);
      if (shouldHaveRole && !hasRole) await member.roles.add(entry.role);
      if (!shouldHaveRole && hasRole) await member.roles.remove(entry.role);
    }

    return { guild_id: guildId, status: 'synced' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Discord role sync failed for guild ${guildId}:`, error);
    return { guild_id: guildId, status: 'error', error: message };
  }
}

/**
 * Health endpoint plus the authenticated subscription-role synchronization API.
 */
export function startHealthServer(
  port: number = 3000,
  client: ExtendedClient,
): http.Server {
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if ((pathname === '/health' || pathname === '/') && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'online',
        discord: client.isReady() ? 'ready' : 'connecting',
        bot: client.user?.tag ?? null,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/announce-patchnote' && req.method === 'POST') {
      const token = extractBearerToken(req.headers.authorization);
      if (!secretsMatch(token, process.env.SYNC_SECRET_TOKEN)) {
        sendJson(res, 401, { error: 'Unauthorized.' });
        return;
      }
      if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
        sendJson(res, 415, { error: 'Content-Type must be application/json.' });
        return;
      }
      if (!client.isReady()) {
        sendJson(res, 503, { error: 'Discord client is not ready.' });
        return;
      }

      try {
        const validation = validatePatchnotePayload(await readJsonBody(req));
        if (!validation.ok) {
          sendJson(res, 400, { error: validation.error });
          return;
        }

        const primaryGuildId = process.env.GUILD_ID?.trim();
        if (!primaryGuildId) {
          sendJson(res, 503, { error: 'The primary Discord guild is not configured.' });
          return;
        }

        const guild = await client.guilds.fetch(primaryGuildId);
        if (!guild) {
          sendJson(res, 503, { error: 'Primary Discord guild not found.' });
          return;
        }

        let targetChannel: TextChannel | null = null;
        const configuredChannelId = process.env.PATCHNOTES_CHANNEL_ID?.trim();

        if (configuredChannelId) {
          try {
            const fetched = await client.channels.fetch(configuredChannelId);
            if (fetched && fetched.isTextBased() && 'send' in fetched) {
              targetChannel = fetched as TextChannel;
            }
          } catch {
            // channel not found by ID, fallback to search by name
          }
        }

        if (!targetChannel) {
          const channels = await guild.channels.fetch();
          const textChannels = Array.from(channels.values()).filter(
            (ch): ch is TextChannel => Boolean(ch && ch.isTextBased() && 'name' in ch && 'send' in ch),
          );

          targetChannel = textChannels.find((ch) =>
            /patchnotes|mises?[-_]?[aà][-_]?jour|changelog/i.test(ch.name),
          ) ?? textChannels.find((ch) => /annonces/i.test(ch.name)) ?? null;
        }

        if (!targetChannel) {
          sendJson(res, 404, { error: 'Patchnotes channel not found in Discord server.' });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`🚀 SR Editer v${validation.value.version} est disponible !`)
          .setDescription(validation.value.notes)
          .setColor(0x6366f1)
          .setTimestamp()
          .setFooter({ text: 'SR Editer • Patchnote officiel' });

        if (validation.value.artifact_url) {
          embed.addFields({
            name: '💾 Téléchargement Direct',
            value: `[Télécharger l'installateur v${validation.value.version}](${validation.value.artifact_url})`,
            inline: true,
          });
        }

        embed.addFields({
          name: '🌐 Documentation & Site',
          value: '[Voir le changelog complet sur le site](https://sr-editer.vercel.app/docs.html#changelog)',
          inline: true,
        });

        const sentMessage = await targetChannel.send({ embeds: [embed] });
        sendJson(res, 200, {
          success: true,
          channel_id: targetChannel.id,
          message_id: sentMessage.id,
        });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Internal server error.';
        sendJson(res, status, { error: message });
      }
      return;
    }

    if (pathname !== '/api/sync-user' || req.method !== 'POST') {
      sendJson(res, 404, { error: 'Not found.' });
      return;
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!secretsMatch(token, process.env.SYNC_SECRET_TOKEN)) {
      sendJson(res, 401, { error: 'Unauthorized.' });
      return;
    }
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      sendJson(res, 415, { error: 'Content-Type must be application/json.' });
      return;
    }
    if (!client.isReady()) {
      sendJson(res, 503, { error: 'Discord client is not ready.' });
      return;
    }

    try {
      const validation = validateSyncPayload(await readJsonBody(req));
      if (!validation.ok) {
        sendJson(res, 400, { error: validation.error });
        return;
      }

      const primaryGuildId = process.env.GUILD_ID?.trim();
      const guildIds = [...new Set([primaryGuildId, process.env.BACKUP_GUILD_ID?.trim()]
        .filter((guildId): guildId is string => Boolean(guildId)))];
      if (guildIds.length === 0) {
        sendJson(res, 503, { error: 'No Discord guild is configured.' });
        return;
      }
      if (validation.value.require_membership && !primaryGuildId) {
        sendJson(res, 503, { error: 'The primary Discord guild is not configured.' });
        return;
      }

      const results: GuildSyncResult[] = [];
      for (const guildId of guildIds) {
        results.push(await syncRoleForGuild(
          client,
          guildId,
          validation.value.discord_id,
          validation.value.tier,
          validation.value.require_membership && guildId === primaryGuildId,
        ));
      }

      const primaryResult = primaryGuildId
        ? results.find((result) => result.guild_id === primaryGuildId)
        : undefined;
      if (validation.value.require_membership && primaryResult?.status === 'not_member') {
        sendJson(res, 403, {
          success: false,
          code: 'DISCORD_MEMBERSHIP_REQUIRED',
          error: 'Discord server membership is required.',
          results,
        });
        return;
      }
      if (validation.value.require_membership && primaryResult?.status === 'rules_not_accepted') {
        sendJson(res, 403, {
          success: false,
          code: 'DISCORD_RULES_REQUIRED',
          error: 'Discord server rules must be accepted first.',
          results,
        });
        return;
      }

      const failed = results.some((result) => result.status === 'error');
      sendJson(res, failed ? 502 : 200, {
        success: !failed,
        tier: validation.value.tier,
        results,
      });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Internal server error.';
      sendJson(res, status, { error: message });
    }
  });

  server.listen(port, () => {
    console.log(`🌐 Health & Sync server online on port ${port}`);
  });
  return server;
}
