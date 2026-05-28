import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'nutrir_token';
const USER_KEY = 'nutrir_user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'paciente' | 'nutricionista' | 'admin';
  avatar?: string;
  plan?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isReady: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isReady: false,

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      const user = userJson ? (JSON.parse(userJson) as User) : null;
      set({ token, user, isReady: true });
    } catch {
      set({ isReady: true });
    }
  },

  login: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    set({ user: updated });
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated)).catch(() => null);
  },
}));
