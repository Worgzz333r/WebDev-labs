import axios from 'axios';
import { getErrorMessage } from '@/services/errors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor запиту: додає токен доступу до кожного запиту
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor відповіді: при 401 очищає токен, помилку перетворює на зрозуміле повідомлення
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      // Сторінку входу буде додано в наступній лабораторній роботі
    }
    return Promise.reject(new Error(getErrorMessage(error), { cause: error }));
  }
);

export default api;
