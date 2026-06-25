import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getIP } from '@/lib/rateLimit';
import { requireAuth } from '@/lib/requireAuth';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

async function sendSMS(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn('[sms] Twilio no configurado — SMS no enviado');
    return { ok: false, error: 'Twilio no configurado' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[sms] Twilio error', err);
    return { ok: false, error: 'No se pudo enviar el SMS' };
  }
  return { ok: true };
}

/**
 * POST /api/auth/send-sms
 * Body: { phone: "+5491122334455" }
 * Envía un código de 6 dígitos por SMS al número indicado.
 * Anti-spam: 3 SMS/teléfono/hora + 5 SMS/IP/hora.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { phone } = await req.json();
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json(
      { error: 'Número de teléfono inválido. Incluí el código de país (ej: +5491122334455)' },
      { status: 400 }
    );
  }

  // Anti-spam: por teléfono
  const rlPhone = rateLimit(`sms-phone:${phone}`, { limit: 3, windowSecs: 3600 });
  if (!rlPhone.allowed) {
    return NextResponse.json(
      { error: 'Máximo 3 SMS por número por hora. Intentá más tarde.' },
      { status: 429 }
    );
  }

  // Anti-spam: por IP
  const rlIp = rateLimit(`sms-ip:${getIP(req)}`, { limit: 5, windowSecs: 3600 });
  if (!rlIp.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intentá más tarde.' },
      { status: 429 }
    );
  }

  // Verificar que el teléfono no esté ya verificado por otro usuario
  const existing = await prisma.user.findFirst({
    where: { phone, phoneVerified: true, id: { not: auth.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Este número ya está registrado en otra cuenta' },
      { status: 400 }
    );
  }

  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  await prisma.user.update({
    where: { id: auth.id },
    data: { phone, smsCode: code, smsCodeExpires: expires },
  });

  const result = await sendSMS(phone, `Tu código de Conect App es: ${code}. Expira en 10 minutos.`);

  if (!result.ok) {
    // En desarrollo, devolvemos el código para testing
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ ok: true, devCode: code });
    }
    return NextResponse.json({ error: result.error || 'Error al enviar SMS' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
