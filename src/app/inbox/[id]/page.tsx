import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChatWindow from '@/components/ChatWindow';

interface Props {
  params: { id: string };
}

async function getConversation(id: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id,
      participants: { some: { id: userId } },
    },
    include: {
      listing: {
        select: {
          id: true, title: true, price: true, currency: true,
          images: { orderBy: { order: 'asc' }, take: 1 },
        },
      },
      participants: { select: { id: true, name: true, image: true } },
    },
  });
}

export default async function ConversationPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const conversation = await getConversation(params.id, session.user.id);
  if (!conversation) notFound();

  const otherUser = conversation.participants.find((p) => p.id !== session.user?.id)!;
  const listingImage = conversation.listing.images[0]?.url;

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col">
      {/* Back nav */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Link href="/inbox" className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <Link
          href={`/listing/${conversation.listing.id}`}
          className="text-sm text-gray-500 hover:text-brand-600 truncate"
        >
          {conversation.listing.title}
        </Link>
      </div>

      <ChatWindow
        conversationId={conversation.id}
        listingTitle={conversation.listing.title}
        listingImage={listingImage}
        otherUser={otherUser}
      />
    </div>
  );
}
