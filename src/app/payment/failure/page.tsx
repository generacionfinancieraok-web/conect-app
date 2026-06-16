import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function PaymentFailurePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">El pago no se completó</h1>
        <p className="text-gray-500 mb-6">
          Hubo un problema con el pago. No se realizó ningún cobro. Podés volver a intentarlo.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/" className="btn-primary">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
