import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Railway requiere escuchar en 0.0.0.0
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Orígenes permitidos para CORS de Socket.io
function getAllowedOrigins(): string[] {
  const origins: string[] = ['http://localhost:3000', 'http://localhost:8081'];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const nextauthUrl = process.env.NEXTAUTH_URL;
  if (appUrl) origins.push(appUrl);
  if (nextauthUrl && nextauthUrl !== appUrl) origins.push(nextauthUrl);
  return origins;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Permitir requests sin origin (mobile nativo, Postman, etc.)
        if (!origin) return callback(null, true);
        const allowed = getAllowedOrigins();
        if (allowed.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`[Socket] Origen bloqueado por CORS: ${origin}`);
          callback(new Error('CORS bloqueado'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Guardar io en global para usarlo desde API routes
  (global as any).io = io;

  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`);

    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', { userId });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Desconectado: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Servidor corriendo en http://${hostname}:${port}`);
    console.log(`> Socket.IO activo — orígenes permitidos: ${getAllowedOrigins().join(', ')}`);
  });
});
