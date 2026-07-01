import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import cron from 'node-cron';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Railway requiere escuchar en 0.0.0.0
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Servidor corriendo en http://${hostname}:${port}`);

    // Cron: verificar ofertas expiradas cada hora
    if (process.env.CRON_SECRET) {
      cron.schedule('0 * * * *', async () => {
        try {
          const res = await fetch(`http://localhost:${port}/api/cron/offers`, {
            headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
          });
          console.log(`[cron] /api/cron/offers → ${res.status}`);
        } catch (e) {
          console.error('[cron] Error en /api/cron/offers:', e);
        }
      });
      console.log('> Cron de ofertas activo (cada hora)');
    }
  });
});
