export const metadata = {
  title: 'Política de Privacidad — Conect App',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', color: '#111', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidad</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Última actualización: 17 de junio de 2026</p>

      <p>
        Conect App («la Aplicación», «nosotros») es un marketplace peer-to-peer que permite a los usuarios
        publicar, buscar y negociar artículos de segunda mano. Esta Política de Privacidad describe qué
        información recopilamos, cómo la usamos y cuáles son tus derechos al respecto.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>1. Información que recopilamos</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>Datos de registro:</strong> nombre, dirección de correo electrónico y contraseña (almacenada con hash bcrypt).</li>
        <li><strong>Contenido del usuario:</strong> fotos de artículos, descripciones de publicaciones y mensajes de chat entre usuarios.</li>
        <li><strong>Ubicación aproximada:</strong> con tu permiso, usamos tu ubicación para mostrarte artículos cercanos. No almacenamos coordenadas exactas en forma permanente.</li>
        <li><strong>Datos de uso:</strong> registros de acceso, dirección IP y sistema operativo con fines de seguridad y diagnóstico.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>2. Cómo usamos tu información</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>Proveer, mantener y mejorar la Aplicación.</li>
        <li>Procesar transacciones y pagos a través de MercadoPago.</li>
        <li>Enviar notificaciones relacionadas con tu actividad en la plataforma (nuevos mensajes, ofertas, ventas).</li>
        <li>Detectar y prevenir fraudes o actividades prohibidas.</li>
        <li>Cumplir obligaciones legales aplicables.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>3. Compartición de datos</h2>
      <p>No vendemos ni cedemos tus datos personales a terceros con fines comerciales. Compartimos información únicamente con:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>MercadoPago:</strong> para procesar pagos de forma segura.</li>
        <li><strong>Cloudinary:</strong> para almacenar las imágenes que subís.</li>
        <li><strong>Proveedores de infraestructura:</strong> Railway (hosting) y PostgreSQL (base de datos), bajo acuerdos de confidencialidad.</li>
        <li><strong>Autoridades competentes:</strong> cuando la ley así lo exija.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>4. Retención de datos</h2>
      <p>
        Conservamos tu información mientras tu cuenta esté activa. Podés solicitar la eliminación de tu cuenta
        y tus datos en cualquier momento escribiéndonos a <strong>generacionfinancieraok@gmail.com</strong>.
        Algunos datos podrán retenerse por hasta 90 días por razones de seguridad o cumplimiento legal.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>5. Seguridad</h2>
      <p>
        Implementamos medidas técnicas y organizativas para proteger tu información: cifrado HTTPS en todas
        las comunicaciones, contraseñas almacenadas con hash bcrypt, y acceso restringido a bases de datos
        mediante credenciales seguras.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>6. Tus derechos</h2>
      <p>Tenés derecho a:</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>Acceder a los datos personales que tenemos sobre vos.</li>
        <li>Rectificar datos incorrectos o incompletos.</li>
        <li>Solicitar la eliminación de tu cuenta y datos.</li>
        <li>Retirar tu consentimiento para el procesamiento de ubicación en cualquier momento desde la configuración del dispositivo.</li>
      </ul>
      <p>Para ejercer estos derechos, escribinos a <strong>generacionfinancieraok@gmail.com</strong>.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>7. Menores de edad</h2>
      <p>
        La Aplicación no está destinada a menores de 13 años. No recopilamos intencionalmente datos de menores.
        Si detectamos que un menor se ha registrado, eliminaremos su cuenta de forma inmediata.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>8. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política periódicamente. Te notificaremos por correo electrónico o mediante
        un aviso en la Aplicación ante cambios significativos.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>9. Contacto</h2>
      <p>
        Si tenés preguntas sobre esta Política de Privacidad, escribinos a:<br />
        <strong>generacionfinancieraok@gmail.com</strong>
      </p>
    </main>
  );
}
