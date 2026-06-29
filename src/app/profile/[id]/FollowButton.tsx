'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck } from 'lucide-react';

interface Props {
  profileId: string;
  initialFollowing: boolean;
  initialCount: number;
}

export default function FollowButton({ profileId, initialFollowing, initialCount }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    setCount((c) => (prev ? c - 1 : c + 1));
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: profileId }),
      });
      if (res.status === 401) {
        setFollowing(prev);
        setCount((c) => (prev ? c + 1 : c - 1));
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setFollowing(prev);
        setCount((c) => (prev ? c + 1 : c - 1));
      } else {
        setFollowing(data.following);
      }
    } catch {
      setFollowing(prev);
      setCount((c) => (prev ? c + 1 : c - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-60 ${
          following
            ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {following
          ? <><UserCheck className="w-4 h-4" /> Siguiendo</>
          : <><UserPlus className="w-4 h-4" /> Seguir</>}
      </button>
      {count > 0 && (
        <span className="text-xs text-gray-400">{count} seguidores</span>
      )}
    </div>
  );
}
