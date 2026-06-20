/**
 * Sistema de reputación bidireccional — Conect App
 *
 * COMPRADOR: ratio ponderado de rechazos (ventana 30 días)
 * VENDEDOR:  % de concreción, tiempo de respuesta, transacciones completadas
 */

import { prisma } from '@/lib/prisma';

// ─── NIVELES DEL COMPRADOR ────────────────────────────────────────────────────

export type BuyerLevel = 0 | 1 | 2 | 3 | 4;

export const BUYER_LEVEL_CONFIG = {
  0: { label: 'Verde',       color: '🟢', minRatio: 0,    maxRatio: 0.40, minOffers: 0  },
  1: { label: 'Amarillo',    color: '🟡', minRatio: 0.40, maxRatio: 0.55, minOffers: 8  },
  2: { label: 'Naranja',     color: '🟠', minRatio: 0.55, maxRatio: 0.70, minOffers: 12 },
  3: { label: 'Rojo',        color: '🔴', minRatio: 0.70, maxRatio: 0.80, minOffers: 15 },
  4: { label: 'Suspendido',  color: '⛔', minRatio: 0.80, maxRatio: 1.0,  minOffers: 15 },
} as const;

export const BUYER_LEVEL_LIMITS = {
  0: { dailyOffers: null,  offerDelay: 0    },  // sin restricción
  1: { dailyOffers: null,  offerDelay: 0    },  // solo advertencia
  2: { dailyOffers: 10,    offerDelay: 7200 },  // 10/día + delay 2hs en segundos
  3: { dailyOffers: 3,     offerDelay: 0    },  // 3/día
  4: { dailyOffers: 0,     offerDelay: 0    },  // suspendido
} as const;

// ─── PLAZOS DE REOFERTA ───────────────────────────────────────────────────────

// Horas de espera tras rechazo según número de rechazo (1ro, 2do, 3ro)
export const REJECTION_COOLDOWN_HOURS = [48, 120, 360]; // 48h, 5 días, 15 días

// Horas de espera tras oferta ignorada (3 intentos máximo)
export const IGNORED_COOLDOWN_HOURS = 24;

// Bloqueo de publicación tras 3 ignoradas
export const IGNORED_BLOCK_DAYS = 7;

// ─── UMBRALES DEL VENDEDOR ────────────────────────────────────────────────────

export const SELLER_CONCRETION_THRESHOLDS = {
  RED:    0.30,  // < 30% → etiqueta roja
  YELLOW: 0.50,  // 30-50% → etiqueta amarilla
  OK:     0.70,  // 50-70% → advertencia neutral
};

// ─── ACTUALIZAR REPUTACIÓN DEL COMPRADOR ─────────────────────────────────────

/**
 * Recalcula el offerRejectionRatio y nivel del comprador.
 * Se llama después de cada rechazo, aceptación, o expiración.
 */
export async function updateBuyerReputation(buyerId: string) {
  // Ventana deslizante: últimas 30 días
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const offers = await prisma.offer.findMany({
    where: {
      buyerId,
      createdAt: { gte: since },
    },
    include: { listing: { select: { minPrice: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const total = offers.length;

  // Período de gracia: primeras 5 ofertas no computan nivel
  if (total < 5) {
    await prisma.user.update({
      where: { id: buyerId },
      data: { offersTotal: total, offersRejected: 0, offerRejectionRatio: 0, buyerLevel: 0 },
    });
    return;
  }

  // Calcular ratio ponderado
  let weightedRejections = 0;
  let weightedTotal = 0;

  offers.forEach((offer, idx) => {
    // Peso temporal: más reciente = mayor peso (decae linealmente)
    const recencyWeight = 1 - (idx / total) * 0.5; // rango 0.5–1.0

    // Peso de mala fe: oferta muy por debajo del mínimo cuenta doble
    let maliciousWeight = 1;
    if (
      offer.listing.minPrice &&
      offer.amount < offer.listing.minPrice * 0.8
    ) {
      maliciousWeight = 2;
    }

    const weight = recencyWeight * maliciousWeight;
    weightedTotal += weight;

    if (offer.status === 'REJECTED' || offer.status === 'EXPIRED') {
      weightedRejections += weight;
    }
  });

  const ratio = weightedTotal > 0 ? weightedRejections / weightedTotal : 0;

  // Determinar nivel
  let newLevel: BuyerLevel = 0;
  if (ratio >= 0.80 && total >= 15) newLevel = 4;
  else if (ratio >= 0.70 && total >= 15) newLevel = 3;
  else if (ratio >= 0.55 && total >= 12) newLevel = 2;
  else if (ratio >= 0.40 && total >= 8)  newLevel = 1;
  else newLevel = 0;

  const user = await prisma.user.findUnique({ where: { id: buyerId } });
  const currentLevel = (user?.buyerLevel ?? 0) as BuyerLevel;

  // Para subir de nivel necesita 7 días en el nivel actual
  let finalLevel = newLevel;
  if (newLevel < currentLevel && user?.buyerLevelSince) {
    const daysSince = (Date.now() - user.buyerLevelSince.getTime()) / 86400000;
    if (daysSince < 7) {
      finalLevel = currentLevel; // mantener nivel hasta los 7 días
    }
  }

  // Suspensión de 72hs (nivel 4)
  let suspendedUntil: Date | null = null;
  if (finalLevel === 4 && currentLevel < 4) {
    suspendedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);
  } else if (finalLevel === 4 && user?.suspendedUntil) {
    suspendedUntil = user.suspendedUntil; // mantener suspensión existente
  }

  await prisma.user.update({
    where: { id: buyerId },
    data: {
      offersTotal: total,
      offersRejected: Math.round(weightedRejections),
      offerRejectionRatio: ratio,
      buyerLevel: finalLevel,
      buyerLevelSince: finalLevel !== currentLevel ? new Date() : user?.buyerLevelSince,
      suspendedUntil,
    },
  });

  // Advertencia in-app en nivel 1
  if (finalLevel === 1 && currentLevel === 0) {
    await prisma.notification.create({
      data: {
        type: 'BUYER_LEVEL_WARNING',
        title: '⚠️ Tus ofertas tienen poca aceptación',
        body: 'Asegurate de ofertar dentro del rango del precio pedido por el vendedor.',
        userId: buyerId,
      },
    });
  }
}

// ─── ACTUALIZAR REPUTACIÓN DEL VENDEDOR ──────────────────────────────────────

/**
 * Recalcula el score del vendedor tras cada venta concretada o pendiente.
 */
export async function updateSellerReputation(
  sellerId: string,
  opts: { newSale?: boolean; responseMinutes?: number } = {}
) {
  const user = await prisma.user.findUnique({ where: { id: sellerId } });
  if (!user) return;

  const completedSales     = user.completedSales     + (opts.newSale ? 1 : 0);
  const totalAcceptedOffers = user.totalAcceptedOffers;

  const concretionRate =
    totalAcceptedOffers > 0 ? completedSales / totalAcceptedOffers : 0;

  // Promedio móvil de tiempo de respuesta
  let avgResponseMinutes = user.avgResponseMinutes;
  if (opts.responseMinutes != null) {
    const count = user.ratingCount || 1;
    avgResponseMinutes = Math.round(
      (avgResponseMinutes * count + opts.responseMinutes) / (count + 1)
    );
  }

  await prisma.user.update({
    where: { id: sellerId },
    data: { completedSales, concretionRate, avgResponseMinutes },
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Devuelve la etiqueta visible del comprador para el vendedor.
 * Color + texto corto. No exponer al comprador mismo.
 */
export function getBuyerLabel(level: number, completedPurchases: number) {
  if (completedPurchases === 0) return { emoji: '🟡', text: 'Comprador nuevo · sin historial' };
  if (level >= 3)               return { emoji: '🔴', text: `Historial bajo · nivel ${level}` };
  if (level === 2)              return { emoji: '🟠', text: `Comprador activo · nivel naranja` };
  return { emoji: '🟢', text: `Comprador verificado · ${completedPurchases} compras` };
}

/**
 * Devuelve el badge/etiqueta del vendedor para su perfil.
 */
export function getSellerBadge(concretionRate: number, completedSales: number) {
  if (completedSales < 3) return null; // no mostrar sin historial
  if (concretionRate < 0.30) return { color: 'red',    text: `${Math.round(concretionRate * 100)}% de ventas concretadas` };
  if (concretionRate < 0.50) return { color: 'yellow', text: `${Math.round(concretionRate * 100)}% de ventas concretadas` };
  if (concretionRate < 0.70) return { color: 'gray',   text: `${Math.round(concretionRate * 100)}% de ventas concretadas` };
  return { color: 'green', text: `${Math.round(concretionRate * 100)}% de ventas concretadas` };
}

/**
 * Verifica si el comprador puede enviar una oferta ahora.
 * Retorna null si puede, o un string con el motivo si no puede.
 */
export async function canBuyerMakeOffer(
  buyerId: string,
  listingId: string,
): Promise<{ allowed: boolean; reason?: string; unblockAt?: Date }> {
  const user = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!user) return { allowed: false, reason: 'Usuario no encontrado' };

  // ¿Suspendido globalmente?
  if (user.buyerLevel === 4 && user.suspendedUntil && user.suspendedUntil > new Date()) {
    return {
      allowed: false,
      reason: `Tu cuenta está suspendida hasta el ${user.suspendedUntil.toLocaleDateString('es-AR')}`,
      unblockAt: user.suspendedUntil,
    };
  }

  // ¿Bloqueado en esta publicación?
  const block = await prisma.offerBlock.findUnique({
    where: { buyerId_listingId: { buyerId, listingId } },
  });

  if (block?.permanent) {
    return { allowed: false, reason: 'No podés ofertar más en esta publicación.' };
  }

  if (block?.blockedUntil && block.blockedUntil > new Date()) {
    return {
      allowed: false,
      reason: `Podés volver a ofertar el ${block.blockedUntil.toLocaleDateString('es-AR')}`,
      unblockAt: block.blockedUntil,
    };
  }

  // ¿Límite diario?
  const limits = BUYER_LEVEL_LIMITS[user.buyerLevel as keyof typeof BUYER_LEVEL_LIMITS];
  if (limits.dailyOffers !== null && limits.dailyOffers !== undefined) {
    if (limits.dailyOffers === 0) {
      return { allowed: false, reason: 'No podés enviar ofertas mientras tu cuenta está suspendida.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.offer.count({
      where: { buyerId, createdAt: { gte: today } },
    });

    if (todayCount >= limits.dailyOffers) {
      return {
        allowed: false,
        reason: `Alcanzaste el límite de ${limits.dailyOffers} ofertas por día.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Registra un rechazo o vencimiento y actualiza el OfferBlock para esta publicación.
 */
export async function recordOfferRejection(
  buyerId: string,
  listingId: string,
  type: 'rejected' | 'ignored'
) {
  const block = await prisma.offerBlock.findUnique({
    where: { buyerId_listingId: { buyerId, listingId } },
  });

  const now = new Date();

  if (type === 'ignored') {
    const ignoredCount = (block?.ignoredCount ?? 0) + 1;
    const isLastChance = ignoredCount >= 3;

    await prisma.offerBlock.upsert({
      where: { buyerId_listingId: { buyerId, listingId } },
      create: {
        buyerId,
        listingId,
        ignoredCount,
        blockedUntil: isLastChance
          ? new Date(now.getTime() + IGNORED_BLOCK_DAYS * 24 * 60 * 60 * 1000)
          : null,
      },
      update: {
        ignoredCount,
        blockedUntil: isLastChance
          ? new Date(now.getTime() + IGNORED_BLOCK_DAYS * 24 * 60 * 60 * 1000)
          : block?.blockedUntil,
      },
    });
  } else {
    // rejected
    const retryCount = (block?.retryCount ?? 0) + 1;
    const isPermanent = retryCount >= 4;

    const cooldownHours = isPermanent
      ? 0
      : REJECTION_COOLDOWN_HOURS[Math.min(retryCount - 1, REJECTION_COOLDOWN_HOURS.length - 1)];

    await prisma.offerBlock.upsert({
      where: { buyerId_listingId: { buyerId, listingId } },
      create: {
        buyerId,
        listingId,
        retryCount,
        permanent: isPermanent,
        blockedUntil: !isPermanent && cooldownHours > 0
          ? new Date(now.getTime() + cooldownHours * 60 * 60 * 1000)
          : null,
      },
      update: {
        retryCount,
        permanent: isPermanent,
        blockedUntil: !isPermanent && cooldownHours > 0
          ? new Date(now.getTime() + cooldownHours * 60 * 60 * 1000)
          : null,
      },
    });
  }

  // Actualizar ratio global del comprador
  await updateBuyerReputation(buyerId);
}
