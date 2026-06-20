'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bell, MessageCircle, Star, Heart, Tag, ShieldAlert, CreditCard, User, CheckCheck,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: string;
}

const TYPE_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  MESSAGE:        { icon: MessageCircle, color: 'text-blue-600',   bg: 'bg-blue-50' },
  NEW_OFFER:      { icon: Tag,           color: 'text-amber-600',  bg: 'bg-amber-50' },
  OFFER_ACCEPTED: { icon: Tag,           color: 'text-green-600',  bg: 'bg-green-50' },
  OFFER_REJECTED: { icon: Tag,           color: 'text-red-600',    bg: 'bg-red-50' },
  OFFER_COUNTERED:{ icon: Tag,           color: 'text-blue-600',   bg: 'bg-blue-50' },
  REVIEW:         { icon: Star,          color: 'text-yellow-500', bg: 'bg-yellow-50' },
  NEW_FOLLOWER:   { icon: User,          color: 'text-purple-600', bg: 'bg-purple-50' },
  FAVORITE:       { icon: Heart,         color: 'text-pink-500',   bg: 'bg-pink-50' },
  REPORT:         { icon: ShieldAlert,   color: 'text-red-600',    bg: 'bg-red-50' },
  PAYMENT:        { icon: CreditCard,    color: 'text-green-600',  bg: 'bg-green-50' },
};

function getNavUrl(notif: Notification): string | null {
  try {
    const data = notif.data ? JSON.parse(notif.data) : {};
    if (data.conversationId) return `/inbox/${data.conversationId}`;
    if (data.listingId)       return `/listing/${data.listingId}`;
    if (data.userId)          return `/profile/${data.userId}`;
    if (data.offerId)         return `/inbox`; // TODO: offers web page
  } catch {}
  return null;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status]);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []))
      .finally(() => setLoading(false));
  }, [session?.user]);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center text-gray-400">
        Cargando notificaciones...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Sin notificaciones</p>
          <p className="text-sm mt-1">Te avisaremos cuando haya actividad</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const cfg = TYPE_ICON[notif.type] ?? { icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50' };
            const Icon = cfg.icon;
            const href = getNavUrl(notif);

            const content = (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  notif.read
                    ? 'bg-white border-gray-100'
                    : 'bg-brand-50/40 border-brand-200'
                } ${href ? 'hover:border-brand-300 hover:shadow-sm cursor-pointer' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>
                    {notif.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                )}
              </div>
            );

            return href ? (
              <a key={notif.id} href={href}>{content}</a>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
