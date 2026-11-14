import api from './api';
import type { PaginatedResponse, UserShort } from '@/types/api.types';

export const usersService = {
  getTeachers: async () => {
    const { data } = await api.get<PaginatedResponse<UserShort>>('/users', {
      params: { role: 'TEACHER', limit: 100, sortBy: 'id', order: 'asc' },
    });
    return data.data;
  },
};