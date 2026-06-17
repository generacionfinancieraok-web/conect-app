import { prisma } from '@/lib/prisma';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(userId: string, payload: PushPayload) {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (!tokens.length) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[Push] Error enviando notificación:', err);
  }
}
