export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';

async function getStats() {
  const now = new Date();
  const d7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, totalListings, pendingReports, totalConversations,
    payments, recentUsers7, recentUsers30, recentListings7,
    activeListings, soldListings, totalOffers, acceptedOffers,
    promotedListings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.conversation.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'APPROVED' } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.listing.count({ where: { createdAt: { gte: d7 } } }),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.listing.count({ where: { status: 'SOLD' } }),
    prisma.offer.count(),
    prisma.offer.count({ where: { status: 'ACCEPTED' } }),
    prisma.listing.count({ where: { promoted: true } }),
  ]);

  // Publicaciones por día (últimos 7 días)
  const listingsByDay = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
    SELECT DATE("createdAt")::text AS day, COUNT(*) AS count
    FROM listings
    WHERE "createdAt" >= ${d7}
    GROUP BY DATE("createdAt")
    ORDER BY day ASC
  `;

  // Top 5 categorías por publicaciones activas
  const topCategories = await prisma.category.findMany({
    take: 5,
    include: { _count: { select: { listings: true } } },
    orderBy: { listings: { _count: 'desc' } },
  });

  // Top 5 vendedores
  const topSellers = await prisma.user.findMany({
    where: { completedSales: { gt: 0 } },
    orderBy: { completedSales: 'desc' },
    take: 5,
    select: { id: true, name: true, image: true, completedSales: true, rating: true },
  });

  // Mensajes últimos 7 días
  const recentMessages = await prisma.message.count({ where: { createdAt: { gte: d7 } } });

  const conversionRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;
  const totalRevenue = payments._sum.amount ?? 0;

  return {
    totalUsers, totalListings, pendingReports, totalConversations,
    totalRevenue, recentUsers7, recentUsers30, recentListings7,
    activeListings, soldListings, totalOffers, acceptedOffers,
    conversionRate, promotedListings, recentMessages,
    listingsByDay: listingsByDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    topCategories,
    topSellers,
  };
}

function StatCard({
  label, value, sub, color = 'blue',
}: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue:   'border-blue-500 text-blue-400',
    green:  'border-green-500 text-green-400',
    red:    'border-red-500 text-red-400',
    yellow: 'border-yellow-500 text-yellow-400',
    purple: 'border-purple-500 text-purple-400',
    pink:   'border-pink-500 text-pink-400',
  };
  return (
    <div className={`bg-gray-900 rounded-xl p-5 border-l-4 ${colors[color]}`}>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color].split(' ')[1]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const adminOk = session?.user?.email && (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(session.user.email));
  if (!adminOk) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  const stats = await getStats();

  const maxDay = Math.max(...stats.listingsByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      <h1 className="text-white text-2xl font-bold">Dashboard</h1>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Usuarios totales" value={stats.totalUsers}
          sub={`+${stats.recentUsers7} esta semana · +${stats.recentUsers30} este mes`} color="blue" />
        <StatCard label="Publicaciones activ