import axios from 'axios';
import type { ApiError } from '@/types/api.types';

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    if (!error.response) return 'Сервер недоступний. Перевірте з’єднання.';
    if (error.response.status === 401) {
      return 'Потрібна авторизація. Увійдіть у систему.';
    }
    return error.response.data?.error ?? `Помилка запиту (${error.response.status})`;
  }
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
}
