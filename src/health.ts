import http from 'http';
import { ExtendedClient } from './client';

/**
 * Petit serveur HTTP pour garder le bot en vie sur Render (free tier)
 * UptimeRobot ping toutes les 5 minutes → Render ne coupe pas le service.
 * Gère également la synchronisation des rôles d'abonnement via /api/sync-user.
 */
export function startHealthServer(port: number = 3000, client: ExtendedClient): void {
  const server = http.createServer((req, res) => {
    const url = req.url || '/';

    if (url === '/health' || url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        bot: 'SR Editer#3508',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    if (url === '/api/sync-user' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { discord_id, tier, secret } = data;

          // Vérification de sécurité
          if (!process.env.SYNC_SECRET_TOKEN || secret !== process.env.SYNC_SECRET_TOKEN) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          if (!discord_id || !tier) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing parameters (discord_id, tier)' }));
            return;
          }

          const guildId = process.env.GUILD_ID;
          const backupGuildId = process.env.BACKUP_GUILD_ID;

          const syncRoleForGuild = async (gId: string) => {
            try {
              const guild = await client.guilds.fetch(gId);
              const member = await guild.members.fetch(discord_id);
              if (!member) return;

              const standardRole = guild.roles.cache.find(r => r.name === '⚡ SR Standard');
              const proRole = guild.roles.cache.find(r => r.name === '🚀 SR Pro');
              const premiumRole = guild.roles.cache.find(r => r.name === '💎 SR Premium');

              const rolesToAdd = [];
              const rolesToRemove = [];

              if (tier === 'standard') {
                if (standardRole) rolesToAdd.push(standardRole);
                if (proRole) rolesToRemove.push(proRole);
                if (premiumRole) rolesToRemove.push(premiumRole);
              } else if (tier === 'pro') {
                if (standardRole) rolesToRemove.push(standardRole);
                if (proRole) rolesToAdd.push(proRole);
                if (premiumRole) rolesToRemove.push(premiumRole);
              } else if (tier === 'premium') {
                if (standardRole) rolesToRemove.push(standardRole);
                if (proRole) rolesToRemove.push(proRole);
                if (premiumRole) rolesToAdd.push(premiumRole);
              } else {
                // Free or other
                if (standardRole) rolesToRemove.push(standardRole);
                if (proRole) rolesToRemove.push(proRole);
                if (premiumRole) rolesToRemove.push(premiumRole);
              }

              for (const role of rolesToRemove) {
                if (member.roles.cache.has(role.id)) {
                  await member.roles.remove(role);
                }
              }
              for (const role of rolesToAdd) {
                if (!member.roles.cache.has(role.id)) {
                  await member.roles.add(role);
                }
              }
              console.log(`✅ Rôles synchronisés pour ${discord_id} sur le serveur ${gId} (Tier: ${tier})`);
            } catch (err) {
              console.error(`❌ Échec de synchronisation pour le serveur ${gId}:`, err);
            }
          };

          if (guildId) await syncRoleForGuild(guildId);
          if (backupGuildId) await syncRoleForGuild(backupGuildId);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Synced roles for tier: ${tier}` }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    console.log(`🌐 Health & Sync server en ligne sur le port ${port}`);
  });
}
