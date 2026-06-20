export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getStats() {
  const [users, listings, pendingReports, conversations, payments] = await Promise.all([
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
  const activeListings = await prisma.listing.count({ where: { status: 'ACTIVE' } });

  return { users, listings, activeListings, pendingReports, conversations, recentUsers, recentListings, totalRevenue: payments._sum.amount ?? 0 };
}

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500 text-blue-400',
    green: 'border-green-500 text-green-400',
    red: 'border-red-500 text-red-400',
    yellow: 'border-yellow-500 text-yellow-400',
    purple: 'border-purple-500 text-purple-400',
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

  return (
    <div>
      <h1 className="text-white text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Usuarios totales" value={stats.users} sub={`+${stats.recentUsers} esta semana`} color="blue" />
        <StatCard label="Publicaciones" value={stats.listings} sub={`${stats.activeListings} activas`} color="green" />
        <StatCard label="Reportes pendientes" value={stats.pendingReports} sub="Requieren revisión" color={stats.pendingReports > 0 ? 'red' : 'green'} />
        <StatCard label="Conversaciones" value={stats.conversations} color="purple" />
        <StatCard label="Publicaciones nuevas" value={stats.recentListings} sub="Últimos 7 días" color="yellow" />
        <StatCard label="Ingresos (MercadoPago)" value={`$${stats.totalRevenue.toLocaleString('es-AR')}`} sub="Pagos aprobados" color="green" />
      </div>

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
