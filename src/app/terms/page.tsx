import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Conect',
  description: 'Términos y condiciones de uso de la plataforma Conect.',
};

export default function TermsPage() {
  const sections = [
    {
      title: '1. Aceptación de los términos',
      content:
        'Al acceder y utilizar Conect, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no debés utilizar la plataforma.',
    },
    {
      title: '2. Descripción del servicio',
      content:
        'Conect es una plataforma de compraventa entre particulares. Actuamos como intermediario tecnológico; no somos parte de las transacciones entre usuarios ni garantizamos la calidad o entrega de los productos.',
    },
    {
      title: '3. Registro y cuenta',
      content:
        'Para publicar artículos o contactar vendedores debés crear una cuenta con información veraz. Sos responsable de mantener la confidencialidad de tus credenciales y de toda la actividad realizada desde tu cuenta.',
    },
    {
      title: '4. Publicaciones',
      content:
        'Solo podés publicar artículos de los que seas legítimo propietario. Está prohibido publicar artículos ilegales, falsificados, peligrosos, o que infrinjan derechos de terceros. Nos reservamos el derecho de eliminar publicaciones que violen estas normas.',
    },
    {
      title: '5. Transacciones y pagos',
      content:
        'Los pagos procesados a través de MercadoPago están sujetos a los términos de dicha plataforma. Conect no almacena datos de tarjetas de crédito ni es responsable por disputas de pago entre usuarios.',
    },
    {
      title: '6. Comportamiento del usuario',
      content:
        'Queda prohibido usar la plataforma para actividades fraudulentas, envío de spam, acoso a otros usuarios, o cualquier actividad que viole la legislación argentina. Los usuarios que incumplan estas normas podrán ser suspendidos o bloqueados.',
    },
    {
      title: '7. Limitación de responsabilidad',
      content:
        'Conect no se hace responsable por daños directos o indirectos derivados del uso de la plataforma, interrupciones del servicio, pérdida de datos, o el resultado de transacciones entre usuarios.',
    },
    {
      title: '8. Propiedad intelectual',
      content:
        'El contenido de la plataforma (diseño, código, marca) es propiedad de Conect. Las imágenes y descripciones de las publicaciones son responsabilidad de cada usuario.',
    },
    {
      title: '9. Modificaciones',
      content:
        'Podemos actualizar estos términos en cualquier momento. Te notificaremos sobre cambios significativos. El uso continuado de la plataforma después de los cambios implica su aceptación.',
    },
    {
      title: '10. Ley aplicable',
      content:
        'Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta ante los tribunales competentes de la Ciudad Autónoma de Buenos Aires.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y Condiciones</h1>
      <p className="text-gray-500 mb-10">Última actualización: enero 2025</p>

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">{s.title}</h2>
            <p className="text-gray-600 leading-relaxed">{s.content}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500">
        ¿Tenés preguntas? Escribinos a{' '}
        <a href="mailto:soporte@conect.com.ar" className="text-brand-600 hover:underline">
          soporte@conect.com.ar
        </a>
      </div>
    </div>
  );
}
