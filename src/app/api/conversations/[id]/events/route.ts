export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { chatEmitter } from '@/lib/chat-emitter';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth: supports both Bearer token (mobile) and session (web)
  let userId: string | null = null;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const payload = verifyMobileToken(auth.slice(7));
    userId = payload?.userId ?? null;
  } else {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id ?? null;
  }
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Verify participant
  const participant = await prisma.conversation.findFirst({
    where: { id: params.id, participants: { some: { id: userId } } },
    select: { id: true },
  });
  if (!participant) return new Response('Not found', { status: 404 });

  const conversationId = params.id;
  const uid = userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function enqueue(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream already closed
        }
      }

      // Initial handshake
      enqueue({ type: 'connected' });

      // New message from another client
      const onMsg = (msg: unknown) => enqueue({ type: 'message', payload: msg });

      // Typing indicator (filter out own events)
      const onTyping = ({ userId: typingId }: { userId: string }) => {
        if (typingId !== uid) enqueue({ type: 'typing', userId: typingId });
      };

      chatEmitter.on(`msg:${conversationId}`, onMsg);
      chatEmitter.on(`typing:${conversationId}`, onTyping);

      // Heartbeat every 20s — prevents Railway / nginx from closing idle connections
      const hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ♥\n\n'));
        } catch {
          clearInterval(hb);
        }
      }, 20_000);

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(hb);
        chatEmitter.off(`msg:${conversationId}`, onMsg);
        chatEmitter.off(`typing:${conversationId}`, onTyping);
        try { controller.close(); } catch { /* ok */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering on Railway
    },
  });
}
