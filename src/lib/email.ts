/**
 * Email service using Resend (https://resend.com)
 * Requires RESEND_API_KEY env var and a verified sender domain.
 *
 * Setup:
 *  1. Create account at resend.com
 *  2. Add RESEND_API_KEY to Railway env vars
 *  3. Set RESEND_FROM to your verified sender email (e.g. "Conect App <noreply@yourdomain.com>")
 *     Or use the Resend sandbox address during testing: "onboarding@resend.dev"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'Conect App <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[email] Resend error', res.status, body);
    return { success: false, error: body };
  }

  return { success: true };
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: 'Recuperar contraseña — Conect App',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">Recuperar contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Hacé clic en el botón para crear una nueva contraseña. El enlace expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Restablecer contraseña
        </a>
        <p style="color:#6b7280;font-size:13px">
          Si no solicitaste esto, podés ignorar este correo. Tu contraseña no cambiará.
        </p>
        <p style="color:#6b7280;font-size:12px">O copiá este enlace: ${resetUrl}</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: '¡Bienvenido a Conect App!',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">¡Hola, ${name}!</h2>
        <p>Tu cuenta fue creada con éxito. Ya podés empezar a comprar y vender en Conect App.</p>
        <a href="${APP_URL}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ir a Conect App
        </a>
      </div>
    `,
  });
}

export async function sendNewMessageEmail(to: string, senderName: string, preview: string, conversationId: string) {
  const url = `${APP_URL}/inbox/${conversationId}`;
  return sendEmail({
    to,
    subject: `Nuevo mensaje de ${senderName} — Conect`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">Nuevo mensaje</h2>
        <p><strong>${senderName}</strong> te envió un mensaje:</p>
        <blockquote style="background:#f3f4f6;border-left:4px solid #6366f1;padding:12px 16px;margin:16px 0;border-radius:4px;color:#374151">
          ${preview}
        </blockquote>
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ver conversación
        </a>
      </div>
    `,
  });
}

export async function sendNewOfferEmail(
  to: string,
  buyerName: string,
  listingTitle: string,
  amount: number,
  currency: string,
  offerId: string,
) {
  const url = `${APP_URL}/offers`;
  const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
  return sendEmail({
    to,
    subject: `Nueva oferta de ${buyerName} — Conect`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">💰 Nueva oferta recibida</h2>
        <p><strong>${buyerName}</strong> hizo una oferta por <strong>${listingTitle}</strong>:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <span style="font-size:28px;font-weight:800;color:#16a34a">${formatted}</span>
        </div>
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ver oferta y responder
        </a>
        <p style="color:#6b7280;font-size:13px">Podés aceptar, rechazar o hacer una contraoferta desde la app.</p>
      </div>
    `,
  });
}

export async function sendOfferResponseEmail(
  to: string,
  sellerName: string,
  listingTitle: string,
  action: 'accepted' | 'rejected' | 'countered',
  counterAmount?: number,
  currency?: string,
) {
  const actionLabel = action === 'accepted' ? 'aceptó tu oferta' : action === 'rejected' ? 'rechazó tu oferta' : 'hizo una contraoferta';
  const emoji = action === 'accepted' ? '✅' : action === 'rejected' ? '❌' : '🔄';
  const url = `${APP_URL}/offers`;
  const counterText =
    action === 'countered' && counterAmount && currency
      ? `<p>Contraoferta: <strong>${new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(counterAmount)}</strong></p>`
      : '';

  return sendEmail({
    to,
    subject: `${emoji} ${sellerName} ${actionLabel} — Conect`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">${emoji} Respuesta a tu oferta</h2>
        <p><strong>${sellerName}</strong> ${actionLabel} por <strong>${listingTitle}</strong>.</p>
        ${counterText}
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ver mis ofertas
        </a>
      </div>
    `,
  });
}
