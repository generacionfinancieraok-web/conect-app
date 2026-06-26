'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Search, Plus, MessageCircle, Bell, Tag, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Polling cada 30 s
  useEffect(() => {
    if (!session?.user) return;

    function fetchUnread() {
      fetch('/api/conversations/unread')
        .then((r) => r.json())
        .then((d) => setUnread(d.count ?? 0))
        .catch(() => {});
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((d) => setUnreadNotifs(d.unreadCount ?? 0))
        .catch(() => {});
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [session?.user]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="text-brand-600 font-bold text-xl shrink-0">
          Conect
        </Link>

        {/* Buscador desktop */}
        <form action="/search" method="GET" className="flex-1 hidden sm:flex">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              name="q"
              type="search"
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <Link
                href="/listing/new"
                className="hidden sm:flex btn-primary items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                Publicar
              </Link>

              {/* Notificaciones */}
              <Link href="/notifications" className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </Link>

              {/* Mensajes con badge */}
              <Link href="/inbox" className="p-2 rounded-full hover:bg-gray-100 relative">
                <MessageCircle className="w-5 h-5 text-gray-600" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Perfil'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-600" />
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      href={`/profile/${session.user?.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="w-4 h-4" /> Mi perfil
                    </Link>
                    <Link
                      href="/offers"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Tag className="w-4 h-4" /> Mis ofertas
                    </Link>
                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Bell className="w-4 h-4" /> Notificaciones
                    </Link>
                    <Link
                      href="/listing/new"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 sm:hidden"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Plus className="w-4 h-4" /> Publicar
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" /> Salir
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm hidden sm:inline-flex">
                Ingresar
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Buscador mobile */}
      <div className="sm:hidden px-4 pb-3">
        <form action="/search" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              name="q"
              type="search"
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </form>
      </div>
    </nav>
  );
}
