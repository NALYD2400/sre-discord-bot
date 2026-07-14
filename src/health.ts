import http from 'http';

/**
 * Petit serveur HTTP pour garder le bot en vie sur Render (free tier)
 * UptimeRobot ping toutes les 5 minutes → Render ne coupe pas le service
 */
export function startHealthServer(port: number = 3000): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        bot: 'SR Editer#3508',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    console.log(`🌐 Health server en ligne sur le port ${port}`);
  });
}
