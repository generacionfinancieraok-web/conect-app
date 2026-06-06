import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
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

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  async login(email: string, password: string) {
    // Usamos la API de NextAuth con credentials
    const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password, csrfToken: '', json: 'true' }),
    });
    // NextAuth mobile: obtenemos un JWT propio via endpoint custom
    return apiFetch<{ token: string; user: any }>('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(name: string, email: string, password: string) {
    return apiFetch<{ user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async loginWithToken(token: string) {
    return apiFetch<{ user: any }>('/api/auth/mobile/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ─── Listings ────────────────────────────────────────────────────────────────

export const listingsApi = {
  getAll: (params?: Record<string, any>) =>
    apiFetch<{ listings: any[]; pagination: any }>('/api/listings', { params }),

  getById: (id: string) =>
    apiFetch<{ listing: any }>(`/api/listings/${id}`),

  create: (data: any) =>
    apiFetch<{ listing: any }>('/api/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<{ listing: any }>(`/api/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`/api/listings/${id}`, { method: 'DELETE' }),
};

// ─── Search ──────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (params: Record<string, any>) =>
    apiFetch<{ listings: any[]; pagination: any }>('/api/search', { params }),
};

// ─── Categories ──────────────────────────────────────────────────────────────

export const categoriesApi = {
  getAll: () => apiFetch<{ categories: any[] }>('/api/categories'),
};

// ─── Conversations ───────────────────────────────────────────────────────────

export const conversationsApi = {
  getAll: () =>
    apiFetch<{ conversations: any[] }>('/api/conversations'),

  create: (listingId: string, initialMessage?: string) =>
    apiFetch<{ conversation: any }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ listingId, initialMessage }),
    }),

  getMessages: (conversationId: string, cursor?: string) =>
    apiFetch<{ messages: any[]; nextCursor: string | null }>(
      `/api/conversations/${conversationId}/messages`,
      { params: cursor ? { cursor } : undefined }
    ),

  sendMessage: (conversationId: string, body: string) =>
    apiFetch<{ message: any }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
};

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadImage(uri: string): Promise<{ url: string; publicId: string }> {
  const token = await getToken();
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error subiendo imagen');
  return data;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentsApi = {
  createPreference: (listingId: string) =>
    apiFetch<{ preferenceId: string; initPoint: string; paymentId: string }>(
      '/api/payments/create',
      { method: 'POST', body: JSON.stringify({ listingId }) }
    ),
};
