export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Conect — Compra y vende cerca tuyo',
  description: 'Plataforma de compraventa local en Argentina. Encontrá lo que buscás cerca tuyo.',
  keywords: 'compra, venta, usado, segunda mano, Argentina',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="bg-white border-t border-gray-100 mt-16 py-10 text-sm text-gray-500">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-semibold text-gray-700">Conect</span>
              <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                <a href="/search" className="hover:text-brand-600 transition-colors">Explorar</a>
                <a href="/listing/new" className="hover:text-brand-600 transition-colors">Publicar</a>
                <a href="/privacy" className="hover:text-brand-600 transition-colors">Privacidad</a>
                <a href="/terms" className="hover:text-brand-600 transition-colors">Términos</a>
              </nav>
              <span>© {new Date().getFullYear()} Conect 🇦🇷</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
