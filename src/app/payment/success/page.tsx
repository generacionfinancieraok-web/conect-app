import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago exitoso!</h1>
        <p className="text-gray-500 mb-6">
          Tu pago fue procesado correctamente. El vendedor recibirá una notificación.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/inbox" className="btn-primary">Ver mis mensajes</Link>
          <Link href="/" className="btn-secondary">Seguir explorando</Link>
        </div>
      </div>
    </div>
  );
}
