import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Guardar io en global para usarlo desde API routes
  (global as any).io = io;

  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`);

    // Unirse a una sala de conversación
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Salir de una sala
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Indicador de "escribiendo..."
    socket.on('typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', { userId });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Desconectado: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Servidor corriendo en http://${hostname}:${port}`);
    console.log(`> Socket.IO activo`);
  });
});
