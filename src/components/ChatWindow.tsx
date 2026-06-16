'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Send } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; name: string | null; image: string | null };
}

interface Props {
  conversationId: string;
  listingTitle: string;
  listingImage?: string;
  otherUser: { id: string; name: string | null; image: string | null };
}

export default function ChatWindow({ conversationId, listingTitle, listingImage, otherUser }: Props) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar mensajes
  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []));
  }, [conversationId]);

  // Socket.io
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', { path: '/socket.io' });
    socketRef.current = socket;

    socket.emit('join_conversation', conversationId);

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId !== session?.user?.id) {
        setOtherTyping(true);
        setTimeout(() => setOtherTyping(false), 2000);
      }
    });

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    };
  }, [conversationId, session?.user?.id]);

  // Scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  function handleTyping() {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socketRef.current?.emit('typing', { conversationId, userId: session?.user?.id });
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const body = input.trim();
    setInput('');
    setSending(true);

    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });

    setSending(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header de la conv */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        {listingImage && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
            <Image src={listingImage} alt={listingTitle} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{otherUser.name}</p>
          <p className="text-xs text-gray-400 truncate">{listingTitle}</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg) => {
          const isMe = msg.senderId === session?.user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-gray-200 mt-1">
                  {msg.sender.image ? (
                    <Image src={msg.sender.image} alt="" width={28} height={28} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                      {msg.sender.name?.[0]}
                    </div>
                  )}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-sm leading-snug ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-xs text-gray-400 px-1">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>
            </div>
          );
        })}

        {otherTyping && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-end gap-2 p-3 bg-white border-t border-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTyping(); }}
          placeholder="Escribí un mensaje..."
          className="flex-1 input rounded-full px-4"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="btn-primary rounded-full p-2.5 w-10 h-10 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
