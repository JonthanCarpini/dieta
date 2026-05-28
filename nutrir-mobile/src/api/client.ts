import axios from 'axios';

const api = axios.create({
  baseURL: 'https://nutrir.online/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Lazy import to avoid circular dependency with authStore
api.interceptors.request.use((config) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore } = require('../store/authStore');
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useAuthStore } = require('../store/authStore');
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
