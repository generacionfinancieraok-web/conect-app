import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, setApiToken } from '@/lib/api';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    await SecureStore.setItemAsync('auth_token', data.token);
    setApiToken(data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  loginWithGoogle: async (idToken) => {
    const data = await authApi.loginWithGoogle(idToken);
    await SecureStore.setItemAsync('auth_token', data.token);
    setApiToken(data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    await authApi.register(name, email, password);
    const data = await authApi.login(email, password);
    await SecureStore.setItemAsync('auth_token', data.token);
    setApiToken(data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  updateUser: (partial) => {
    set((state) => ({ user: state.user ? { ...state.user, ...partial } : null }));
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    setApiToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        setApiToken(token);
        const data = await authApi.loginWithToken(token);
        set({ user: data.user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      setApiToken(null);
      set({ isLoading: false });
    }
  },
}));
