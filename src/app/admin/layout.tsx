import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) redirect('/login');

  const isAdmin =
    ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(session.user.email);

  if (!isAdmin) redirect('/');

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="text-white font-bold text-lg">🛡️ Conect Admin</span>
        <a href="/admin" className="text-gray-300 hover:text-white text-sm">Dashboard</a>
        <a href="/admin/listings" className="text-gray-300 hover:text-white text-sm">Publicaciones</a>
        <a href="/admin/reports" className="text-gray-300 hover:text-white text-sm">Reportes</a>
        <a href="/admin/users" className="text-gray-300 hover:text-white text-sm">Usuarios</a>
        <span className="ml-auto text-gray-500 text-sm">{session.user.email}</span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
