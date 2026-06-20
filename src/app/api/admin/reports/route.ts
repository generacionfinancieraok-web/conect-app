import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  if (ADMIN_EMAILS.length === 0) return true;
  return ADMIN_EMAILS.includes(email);
}

// GET /api/admin/reports — Listar reportes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'PENDING';
  const page = Number(searchParams.get('page') || 1);
  const limit = 20;

  const reports = await prisma.report.findMany({
    where: { status: status as any },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      reporter: { select: { id: true, name: true, email: true, image: true } },
      listing: { select: { id: true, title: true, status: true } },
      reportedUser: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const total = await prisma.report.count({ where: { status: status as any } });

  return NextResponse.json({ reports, total, page, pages: Math.ceil(total / limit) });
}

// PATCH /api/admin/reports — Actualizar status de reporte
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { reportId, status, action } = await req.json();

  if (!reportId || !status) {
    return NextResponse.json({ error: 'reportId y status requeridos' }, { status: 400 });
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status },
    include: { listing: true },
  });

  // Si la acción es pausar la publicación denunciada
  if (action === 'pause_listing' && report.listingId) {
    await prisma.listing.update({
      where: { id: report.listingId },
      data: { status: 'PAUSED' },
    });
  }

  // Si la acción es eliminar la publicación denunciada
  if (action === 'delete_listing' && report.listingId) {
    await prisma.listing.update({
      where: { id: report.listingId },
      data: { status: 'DELETED' },
    });
  }

  return NextResponse.json(report);
}
