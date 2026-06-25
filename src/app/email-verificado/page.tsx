export default function EmailVerificadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">¡Email verificado!</h1>
        <p className="text-gray-600 mb-8">
          Tu dirección de email fue confirmada exitosamente. Ya podés usar Conect App con todas sus funciones.
        </p>
        <a
          href="/"
          className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
