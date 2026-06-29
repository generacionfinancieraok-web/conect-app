import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import {
  IS_DEMO, DEMO_USER, MOCK_CATEGORIES, MOCK_LISTINGS, MOCK_REVIEWS,
  MOCK_CONVERSATIONS, MOCK_FAVORITES, MOCK_USERS,
  getMockListings, getMockUserProfile,
} from './mockData';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Module-level token cache — updated by auth store to avoid SecureStore read
// failures on certain Android devices/configurations.
let _cachedToken: string | null = null;

export function setApiToken(token: string | null) {
  _cachedToken = token;
}

async function getToken(): Promise<string | null> {
  if (_cachedToken) return _cachedToken;
  // Fallback to SecureStore (e.g. on first call before auth store hydrates)
  const stored = await SecureStore.getItemAsync('auth_token');
  if (stored) _cachedToken = stored;
  return stored;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const token = await getToken();

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  async login(email: string, password: string) {
    if (IS_DEMO) {
      // En modo demo: cualquier email/contraseña funciona
      // Credenciales de demo users también funcionan
      await new Promise(r => setTimeout(r, 400)); // simular latencia
      const demoUser = email.trim() === DEMO_USER.email
        ? DEMO_USER
        : { ...DEMO_USER, name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()), email };
      return { token: 'demo-token-' + Date.now(), user: demoUser };
    }
    return apiFetch<{ token: string; user: any }>('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name: string, email: string, password: string) {
    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 400));
      return { user: { ...DEMO_USER, name, email } };
    }
    return apiFetch<{ user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async loginWithToken(token: string) {
    if (IS_DEMO || token.startsWith('demo-token-')) {
      const stored = await SecureStore.getItemAsync('demo_user');
      const user = stored ? JSON.parse(stored) : DEMO_USER;
      return { user };
    }
    return apiFetch<{ user: any }>('/api/auth/mobile/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async loginWithGoogle(idToken: string) {
    return apiFetch<{ token: string; user: any }>('/api/auth/mobile/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  async sendVerifyEmail() {
    return apiFetch<{ ok: boolean; alreadyVerified?: boolean }>('/api/auth/verify-email', {
      method: 'POST',
    });
  },

  async sendSmsCode(phone: string) {
    return apiFetch<{ ok: boolean; devCode?: string }>('/api/auth/send-sms', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifySmsCode(code: string) {
    return apiFetch<{ ok: boolean; alreadyVerified?: boolean }>('/api/auth/verify-sms', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
};

// ─── Listings ────────────────────────────────────────────────────────────────

export const listingsApi = {
  getAll: (params?: Record<string, any>) => {
    if (IS_DEMO) return Promise.resolve(getMockListings(params));
    return apiFetch<{ listings: any[]; pagination: any }>('/api/listings', { params });
  },

  getById: (id: string) => {
    if (IS_DEMO) {
      const listing = MOCK_LISTINGS.find(l => l.id === id);
      if (!listing) return Promise.reject(new Error('Publicación no encontrada'));
      return Promise.resolve({ listing });
    }
    return apiFetch<{ listing: any }>(`/api/listings/${id}`);
  },

  create: (data: any) => {
    if (IS_DEMO) return Promise.resolve({ listing: { id: 'new-demo', ...data } });
    return apiFetch<{ listing: any }>('/api/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: any) => {
    if (IS_DEMO) return Promise.resolve({ listing: { id, ...data } });
    return apiFetch<{ listing: any }>(`/api/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    if (IS_DEMO) return Promise.resolve({});
    return apiFetch(`/api/listings/${id}`, { method: 'DELETE' });
  },

  stats: (listingId: string) => {
    if (IS_DEMO) {
      const l = MOCK_LISTINGS.find(x => x.id === listingId);
      return Promise.resolve({ views: l?.views ?? 0, saves: l?.saves ?? 0, offers: l?._count?.offers ?? 0 });
    }
    return apiFetch<any>(`/api/listings/${listingId}/stats`);
  },
};

// ─── Search ──────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (params: Record<string, any>) => {
    if (IS_DEMO) return Promise.resolve(getMockListings(params));
    return apiFetch<{ listings: any[]; pagination: any }>('/api/search', { params });
  },
};

// ─── Categories ──────────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: () => {
    if (IS_DEMO) return Promise.resolve({ categories: MOCK_CATEGORIES });
    return apiFetch<{ categories: any[] }>('/api/categories');
  },
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileApi = {
  getById: (userId: string) => {
    if (IS_DEMO) {
      const result = getMockUserProfile(userId);
      if (!result) return Promise.reject(new Error('Usuario no encontrado'));
      return Promise.resolve(result);
    }
    return apiFetch<{ profile: any }>(`/api/profile/${userId}`);
  },

  getMe: () => {
    if (IS_DEMO) return Promise.resolve({ user: DEMO_USER });
    return apiFetch<{ user: any }>('/api/users/me');
  },

  updateMe: (data: { name?: string; bio?: string | null }) => {
    if (IS_DEMO) return Promise.resolve({ user: { ...DEMO_USER, ...data } });
    return apiFetch<{ user: any }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ─── Conversations ───────────────────────────────────────────────────────────

export const conversationsApi = {
  getAll: () => {
    if (IS_DEMO) return Promise.resolve({ conversations: MOCK_CONVERSATIONS });
    return apiFetch<{ conversations: any[] }>('/api/conversations');
  },

  create: (listingId: string, initialMessage?: string) => {
    if (IS_DEMO) return Promise.resolve({ conversation: { id: 'demo-conv', listingId } });
    return apiFetch<{ conversation: any }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ listingId, initialMessage }),
    });
  },

  getMessages: (conversationId: string, cursor?: string) => {
    if (IS_DEMO) return Promise.resolve({ messages: [], nextCursor: null });
    return apiFetch<{ messages: any[]; nextCursor: string | null }>(
      `/api/conversations/${conversationId}/messages`,
      { params: cursor ? { cursor } : undefined }
    );
  },

  sendMessage: (conversationId: string, body: string) => {
    if (IS_DEMO) return Promise.resolve({ message: { id: 'demo-msg', body, createdAt: new Date().toISOString() } });
    return apiFetch<{ message: any }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  markRead: (conversationId: string) => {
    if (IS_DEMO) return Promise.resolve({ ok: true });
    return apiFetch<{ ok: boolean }>(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  },
};

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadImage(uri: string): Promise<{ url: string; publicId: string }> {
  if (IS_DEMO) return Promise.resolve({ url: uri, publicId: 'demo-' + Date.now() });
  const token = await getToken();
  // Use FileSystem.uploadAsync to avoid "Unsupported FormDataPart implementation"
  // error that occurs with plain fetch + FormData on some Android/Hermes configs.
  const result = await FileSystem.uploadAsync(`${BASE_URL}/api/upload`, uri, {
    httpMethod: 'POST',
    uploadType: (FileSystem.FileSystemUploadType?.MULTIPART ?? 1) as FileSystem.FileSystemUploadType,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status >= 400) {
    const data = JSON.parse(result.body);
    throw new Error(data.error || 'Error subiendo imagen');
  }
  return JSON.parse(result.body);
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentsApi = {
  createPreference: (listingId: string) => {
    if (IS_DEMO) return Promise.resolve({ preferenceId: 'demo', initPoint: '', paymentId: 'demo' });
    return apiFetch<{ preferenceId: string; initPoint: string; paymentId: string }>(
      '/api/payments/create',
      { method: 'POST', body: JSON.stringify({ listingId }) }
    );
  },
};

// ─── Favorites ───────────────────────────────────────────────────────────────

export const favoritesApi = {
  getAll: () => {
    if (IS_DEMO) return Promise.resolve(MOCK_FAVORITES);
    return apiFetch<any[]>('/api/favorites');
  },
  toggle: (listingId: string) => {
    if (IS_DEMO) return Promise.resolve({ favorited: true });
    return apiFetch<{ favorited: boolean }>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ listingId }),
    });
  },
};

// ─── Offers ──────────────────────────────────────────────────────────────────

export const offersApi = {
  getAll: (type: 'received' | 'sent' = 'received') => {
    if (IS_DEMO) {
      const mockOffers = [
        {
          id: 'offer-1',
          amount: 780000,
          currency: 'ARS',
          status: 'PENDING',
          message: 'Hola! Ofrezco $780.000 en efectivo, ¿trato?',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          listing: { id: 'listing-1', title: 'iPhone 14 Pro 256GB Deep Purple', price: 850000, currency: 'ARS', images: [{ url: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=200&h=200&fit=crop' }] },
          buyer: type === 'received' ? { ...MOCK_USERS[1], id: 'user-2' } : { id: 'demo-user', name: 'Usuario Demo', image: null },
          seller: type === 'received' ? { id: 'demo-user', name: 'Usuario Demo', image: null } : { ...MOCK_USERS[0], id: 'user-1' },
        },
      ];
      return Promise.resolve(mockOffers);
    }
    return apiFetch<any[]>('/api/offers', { params: { type } });
  },
  create: (listingId: string, amount: number, message?: string) => {
    if (IS_DEMO) return Promise.resolve({ id: 'demo-offer', amount, message, status: 'PENDING' });
    return apiFetch<any>('/api/offers', {
      method: 'POST',
      body: JSON.stringify({ listingId, amount, message }),
    });
  },
  respond: (offerId: string, action: 'accept' | 'reject' | 'counter', counterAmount?: number) => {
    if (IS_DEMO) return Promise.resolve({ id: offerId, status: action.toUpperCase() });
    return apiFetch<any>(`/api/offers/${offerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, counterAmount }),
    });
  },
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviewsApi = {
  getByUser: (userId: string) => {
    if (IS_DEMO) {
      const reviews = MOCK_REVIEWS.filter(r => r.reviewedId === userId);
      const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
      return Promise.resolve({ reviews, average: avg, count: reviews.length });
    }
    return apiFetch<{ reviews: any[]; average: number; count: number }>('/api/reviews', { params: { userId } });
  },
  create: (reviewedId: string, rating: number, comment?: string, listingId?: string) => {
    if (IS_DEMO) return Promise.resolve({ id: 'demo-review', rating, comment });
    return apiFetch<any>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ reviewedId, rating, comment, listingId }),
    });
  },
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportsApi = {
  create: (reason: string, details?: string, listingId?: string, userId?: string) => {
    if (IS_DEMO) return Promise.resolve({ id: 'demo-report' });
    return apiFetch<any>('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ reason, details, listingId, userId }),
    });
  },
};

// ─── Follow ──────────────────────────────────────────────────────────────────

export const followApi = {
  getStatus: (userId: string) => {
    if (IS_DEMO) return Promise.resolve({ isFollowing: false, followersCount: 0, followingCount: 0 });
    return apiFetch<{ isFollowing: boolean; followersCount: number; followingCount: number }>(
      '/api/follow', { params: { userId } }
    );
  },
  toggle: (followingId: string) => {
    if (IS_DEMO) return Promise.resolve({ following: true });
    return apiFetch<{ following: boolean }>('/api/follow', {
      method: 'POST',
      body: JSON.stringify({ followingId }),
    });
  },
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: () => {
    if (IS_DEMO) return Promise.resolve({ notifications: [], unreadCount: 0 });
    return apiFetch<{ notifications: any[]; unreadCount: number }>('/api/notifications');
  },
  markRead: () => {
    if (IS_DEMO) return Promise.resolve({});
    return apiFetch('/api/notifications', { method: 'PATCH' });
  },
  registerToken: (token: string) => {
    if (IS_DEMO) return Promise.resolve({});
    return apiFetch('/api/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
};

// ─── Nearby ──────────────────────────────────────────────────────────────────

export const nearbyApi = {
  get: (lat: number, lng: number, radius?: number, categoryId?: string) => {
    if (IS_DEMO) {
      const nearby = MOCK_LISTINGS.filter(l => l.latitude && l.longitude);
      return Promise.resolve(nearby);
    }
    return apiFetch<any[]>('/api/listings/nearby', {
      params: { lat, lng, radius: radius ?? 10, ...(categoryId ? { categoryId } : {}) },
    });
  },
};

// ─── Discover ────────────────────────────────────────────────────────────────

export const discoverApi = {
  getFeed: (page = 1, lat?: number, lng?: number) => {
    if (IS_DEMO) {
      const shuffled = [...MOCK_LISTINGS].sort(() => Math.random() - 0.5).slice(0, 10);
      return Promise.resolve({
        listings: shuffled, hasMore: false, page,
        isColdStart: false, coldStartTotal: null, favoriteCount: 99,
      });
    }
    return apiFetch<{
      listings: any[];
      hasMore: boolean;
      page: number;
      isColdStart: boolean;
      coldStartTotal: number | null;
      favoriteCount: number;
    }>('/api/discover', {
      params: { page, ...(lat ? { lat, lng } : {}) },
    });
  },
  dismiss: (listingId: string, reason?: string) => {
    if (IS_DEMO) return Promise.resolve({ ok: true });
    return apiFetch<{ ok: boolean }>('/api/discover', {
      method: 'POST',
      body: JSON.stringify({ listingId, reason }),
    });
  },
  undoDismiss: (listingId: string) => {
    if (IS_DEMO) return Promise.resolve({ ok: true });
    return apiFetch<{ ok: boolean }>('/api/discover', {
      method: 'DELETE',
      body: JSON.stringify({ listingId }),
    });
  },
  getHistory: () => {
    if (IS_DEMO) return Promise.resolve({ dismissed: [] as any[] });
    return apiFetch<{ dismissed: any[] }>('/api/discover?history=true');
  },
};

// ─── Promote ─────────────────────────────────────────────────────────────────

export const promoteApi = {
  promote: (listingId: string) => {
    if (IS_DEMO) return Promise.resolve({ promoted: true, expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() });
    return apiFetch<{ promoted: boolean; expiresAt: string }>(`/api/listings/${listingId}/promote`, { method: 'POST' });
  },
};

