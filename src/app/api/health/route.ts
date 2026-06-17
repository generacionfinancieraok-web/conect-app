export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(
      JSON.stringify({ status: 'ok', db: 'connected', ts: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ status: 'error', db: 'disconnected' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
