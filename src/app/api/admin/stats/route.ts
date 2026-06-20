import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  if (ADMIN_EMAILS.length === 0) return true; // Si no hay lista, primer usuario puede administrar
  return ADMIN_EMAILS.includes(email);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const [users, listings, reports, conversations, payments] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.conversation.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } }),
  ]);

  const recentUsers = await prisma.user.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  const recentListings = await prisma.listing.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });

  return NextResponse.json({
    users: { total: users, newThisWeek: recentUsers },
    listings: { total: listings, newThisWeek: recentListings },
    pendingReports: reports,
    conversations,
    totalRevenue: payments._sum.amount ?? 0,
  });
}
