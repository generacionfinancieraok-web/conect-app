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
          sub={`${stats.soldListings} vendidas · ${stats.recentListings7} nuevas esta semana`} color="green" />
        <StatCard label="Reportes pendientes" value={stats.pendingReports}
          sub="Requieren revisión" color={stats.pendingReports > 0 ? 'red' : 'green'} />
        <StatCard label="Conversaciones" value={stats.totalConversations}
          sub={`${stats.recentMessages} mensajes esta semana`} color="purple" />
        <StatCard label="Ingresos aprobados" value={`$${stats.totalRevenue.toLocaleString('es-AR')}`}
          sub="MercadoPago" color="green" />
        <StatCard label="Conversión ofertas" value={`${stats.conversionRate.toFixed(1)}%`}
          sub={`${stats.acceptedOffers} aceptadas / ${stats.totalOffers} totales`} color="yellow" />
        <StatCard label="Publicaciones destacadas" value={stats.promotedListings}
          sub="Actualmente promoted" color="pink" />
      </div>

      {/* Gráfico publicaciones por día */}
      {stats.listingsByDay.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Publicaciones últimos 7 días</h2>
          <div className="flex items-end gap-2 h-32">
            {stats.listingsByDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-gray-400 text-xs">{d.count}</span>
                <div
                  className="w-full bg-brand-600 rounded-t-sm"
                  style={{ height: `${Math.max((d.count / maxDay) * 100, 4)}%` }}
                />
                <span className="text-gray-500 text-[10px]">
                  {new Date(d.day).toLocaleDateString('es-AR', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top categorías */}
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Top categorías</h2>
          <div className="space-y-2">
            {stats.topCategories.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                <span className="text-lg">{cat.icon ?? '📦'}</span>
                <span className="text-gray-300 text-sm flex-1">{cat.name}</span>
                <span className="text-gray-400 text-sm font-medium">{cat._count.listings}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top vendedores */}
        <div className="bg-gray-900 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Top vendedores</h2>
          <div className="space-y-3">
            {stats.topSellers.map((seller, i) => (
              <Link key={seller.id} href={`/profile/${seller.id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                {seller.image ? (
                  <img src={seller.image} alt={seller.name ?? ''} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-xs text-white font-bold">
                    {seller.name?.[0]}
                  </div>
                )}
                <span className="text-gray-300 text-sm flex-1 truncate">{seller.name}</span>
                <span className="text-green-400 text-sm font-medium">{seller.completedSales} ventas</span>
                {seller.rating > 0 && (
                  <span className="text-yellow-400 text-xs">⭐ {seller.rating.toFixed(1)}</span>
                )}
              </Link>
            ))}
            {stats.topSellers.length === 0 && (
              <p className="text-gray-500 text-sm">Aún no hay ventas concretadas</p>
            )}
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/admin/reports" className="bg-gray-900 border border-red-800 hover:border-red-600 rounded-xl p-5 block transition-colors">
          <h2 className="text-white font-semibold mb-1">🚨 Reportes pendientes</h2>
          <p className="text-gray-400 text-sm">{stats.pendingReports} reportes sin resolver</p>
          <span className="text-red-400 text-sm mt-2 block">Ver reportes →</span>
        </a>
        <a href="/admin/listings" className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 block transition-colors">
          <h2 className="text-white font-semibold mb-1">📦 Publicaciones</h2>
          <p className="text-gray-400 text-sm">Gestionar publicaciones y estado</p>
          <span className="text-blue-400 text-sm mt-2 block">Ver publicaciones →</span>
        </a>
        <a href="/admin/users" className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 block transition-colors">
          <h2 className="text-white font-semibold mb-1">👥 Usuarios</h2>
          <p className="text-gray-400 text-sm">Ver y gestionar cuentas</p>
          <span className="text-purple-400 text-sm mt-2 block">Ver usuarios →</span>
        </a>
      </div>
    </div>
  );
}
