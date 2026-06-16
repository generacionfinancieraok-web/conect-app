import Link from 'next/link';
import { Clock } from 'lucide-react';

export default function PaymentPendingPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pago pendiente</h1>
        <p className="text-gray-500 mb-6">
          Tu pago está siendo procesado. Te notificaremos cuando se confirme.
        </p>
        <Link href="/" className="btn-primary">Volver al inicio</Link>
      </div>
    </div>
  );
}
