export function formatPrice(price: number, currency = 'ARS'): string {
  if (currency === 'ARS') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy',
  'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
  'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
  'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

export const CONDITIONS = [
  { value: 'NEW', label: 'Nuevo' },
  { value: 'LIKE_NEW', label: 'Como nuevo' },
  { value: 'GOOD', label: 'Buen estado' },
  { value: 'FAIR', label: 'Aceptable' },
  { value: 'POOR', label: 'Con detalles' },
];

export const CONDITION_LABEL: Record<string, string> = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Como nuevo',
  GOOD: 'Buen estado',
  FAIR: 'Aceptable',
  POOR: 'Con detalles',
};
