/**
 * Rate limiting en memoria (sin dependencias externas).
 * Para producción multi-instancia, reemplazar con Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Máximo de requests por ventana */
  limit: number;
  /** Duración de la ventana en segundos */
  windowSecs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica y registra un hit de rate limiting.
 * @param key    Clave única (ej: IP + endpoint)
 * @param config Límites a aplicar
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Nueva ventana
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, newEntry);
    return { allowed: true, remaining: config.limit - 1, resetAt: newEntry.resetAt };
  }

  entry.count++;

  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

/** Extrae la IP del request de Next.js */
export function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
