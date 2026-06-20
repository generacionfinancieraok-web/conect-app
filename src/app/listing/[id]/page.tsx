import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ListingDetailContent from './ListingDetailContent';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { order: 'asc' }, take: 1 }, category: true },
    });

    if (!listing) return { title: 'Publicación no encontrada — Conect' };

    const price = new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
    }).format(listing.price);
    const title = `${listing.title} — ${price} | Conect`;
    const description = listing.description.slice(0, 155);
    const image = listing.images[0]?.url ?? undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(image && { images: [{ url: image, width: 1200, height: 630, alt: listing.title }] }),
        type: 'website',
        locale: 'es_AR',
        siteName: 'Conect',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return { title: 'Conect — Compra y vende cerca tuyo' };
  }
}

export default function ListingDetailPage() {
  return <ListingDetailContent />;
}
