'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Search, Plus, MessageCircle, User, LogOut, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="text-brand-600 font-bold text-xl shrink-0">
          Conect
        </Link>

        {/* Buscador */}
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

              <Link href="/inbox" className="p-2 rounded-full hover:bg-gray-100 relative">
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </Link>

              <div className="relative">
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
