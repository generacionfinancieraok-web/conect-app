import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { participants: { some: { id: userId } } },
    include: {
      listing: {
        select: {
          id: true, title: true, price: true, currency: true, status: true,
          images: { orderBy: { order: 'asc' }, take: 1 },
        },
      },
      participants: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const conversations = await getConversations(session.user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Mensajes</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No tenés conversaciones aún</p>
          <p className="text-sm mt-1">Cuando contactes a un vendedor, aparecerá acá</p>
          <Link href="/" className="mt-4 inline-block btn-primary text-sm">Explorar publicaciones</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = conv.participants.find((p) => p.id !== session.user?.id);
            const lastMsg = conv.messages[0];
            const listingImg = conv.listing.images[0]?.url;

            return (
              <Link
                key={conv.id}
                href={`/inbox/${conv.id}`}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all"
              >
                {/* Foto del listing */}
                <div className="relative w-14 h-14 shrink-0">
                  {listingImg ? (
                    <Image
                      src={listingImg}
                      alt={conv.listing.title}
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-xl">📦</div>
                  )}
                  {/* Avatar del otro usuario */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                    {other?.image ? (
                      <Image src={other.image} alt={other.name || ''} width={24} height={24} className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-brand-100 flex items-center justify-center text-xs text-brand-600 font-bold">
                        {other?.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-gray-900 truncate">{other?.name}</p>
                    {lastMsg && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.listing.title}</p>
                  {lastMsg && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {lastMsg.sender.id === session.user?.id ? 'Vos: ' : ''}
                      {lastMsg.body}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
