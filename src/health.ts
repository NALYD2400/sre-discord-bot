import http, { IncomingMessage } from 'http';
import { timingSafeEqual } from 'crypto';
import type { Guild, Role } from 'discord.js';
import { ExtendedClient } from './client';

export type SubscriptionTier = 'free' | 'standard' | 'pro' | 'premium';

type SyncPayload = {
  discord_id: string;
  tier: SubscriptionTier;
};

type ValidationResult =
  | { ok: true; value: SyncPayload }
  | { ok: false; error: string };

type GuildSyncResult = {
  guild_id: string;
  status: 'synced' | 'not_member' | 'error';
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

  if (!DISCORD_ID_PATTERN.test(discordId)) {
    return { ok: false, error: 'discord_id must be a valid Discord snowflake.' };
  }
  if (!VALID_TIERS.has(tier as SubscriptionTier)) {
    return { ok: false, error: 'tier must be free, standard, pro, or premium.' };
  }
  return { ok: true, value: { discord_id: discordId, tier: tier as SubscriptionTier } };
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

async function syncRoleForGuild(
  client: ExtendedClient,
  guildId: string,
  discordId: string,
  tier: SubscriptionTier,
): Promise<GuildSyncResult> {
  try {
    const guild = await client.guilds.fetch(guildId);
    let member;
    try {
      member = await guild.members.fetch(discordId);
    } catch (error) {
      if ((error as { code?: number }).code === 10007) {
        return { guild_id: guildId, status: 'not_member' };
      }
      throw error;
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

      const guildIds = [process.env.GUILD_ID, process.env.BACKUP_GUILD_ID]
        .filter((guildId): guildId is string => Boolean(guildId));
      if (guildIds.length === 0) {
        sendJson(res, 503, { error: 'No Discord guild is configured.' });
        return;
      }

      const results: GuildSyncResult[] = [];
      for (const guildId of guildIds) {
        results.push(await syncRoleForGuild(
          client,
          guildId,
          validation.value.discord_id,
          validation.value.tier,
        ));
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
