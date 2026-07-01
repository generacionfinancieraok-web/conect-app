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
        <StatCard label="Publicaciones activas" value={stats.activeListings}
          sub={`+${stats.recentListings7} esta semana · ${stats.soldListings} vendidas`} color="green" />
        <StatCard label="Ingresos totales" value={`$${stats.totalRevenue.toLocaleString()}`}
          sub="Pagos aprobados" color="yellow" />
        <StatCard label="Reportes pendientes" value={stats.pendingReports}
          sub="Requieren revisión" color="red" />
        <StatCard label="Conversaciones" value={stats.totalConversations}
          sub={`${stats.recentMessages} mensajes esta semana`} color="purple" />
        <StatCard label="Ofertas totales" value={stats.totalOffers}
          sub={`${stats.conversionRate.toFixed(1)}% tasa de conversión`} color="pink" />
        <StatCard label="Publicaciones destacadas" value={stats.promotedListings}
          sub="Actualmente promocionadas" color="yellow" />
        <StatCard label="Total publicaciones" value={stats.totalListings}
          sub={`${stats.activeListings} activas · ${stats.soldListings} vendidas`} color="blue" />
      </div>

      {/* Gráfico de publicaciones por día */}
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Publicaciones — últimos 7 días</h2>
        <div className="flex items-end gap-2 h-24">
          {stats.listingsByDay.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{d.count}</span>
              <div
                className="w-full bg-brand-600 rounded-t"
                style={{ height: `${(d.count / maxDay) * 80}px`, minHeight: '4px' }}
              />
              <span className="text-[10px] text-gray-500 truncate w-full text-center">
                {d.day.slice(5)}
              </span>
            </div>
          ))}
          {stats.listingsByDay.length === 0 && (
            <p className="text-gray-500 text-sm">Sin datos</p>
          )}
        </div>
      </div>

      {/* Top categorías y top vendedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Top categorías</h2>
          <ul className="space-y-2">
            {stats.topCategories.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{cat.name}</span>
                <span className="text-gray-400 text-sm font-medium">{cat._count.listings}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Top vendedores</h2>
          <ul className="space-y-2">
            {stats.topSellers.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <Link href={`/profile/${u.id}`} className="text-brand-400 text-sm hover:underline truncate max-w-[60%]">
                  {u.name}
                </Link>
                <span className="text-gray-400 text-sm">{u.completedSales} ventas · ⭐ {u.rating?.toFixed(1) ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Links admin */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/admin/users" className="btn-secondary text-sm">Usuarios</Link>
        <Link href="/admin/listings" className="btn-secondary text-sm">Publicaciones</Link>
        <Link href="/admin/reports" className="btn-secondary text-sm">Reportes</Link>
      </div>
    </div>
  );
}