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
          <footer className="bg-white border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Conect. Hecho en Argentina 🇦🇷
          </footer>
        </Providers>
      </body>
    </html>
  );
}
