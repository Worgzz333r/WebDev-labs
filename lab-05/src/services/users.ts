import api from './api';
import type { PaginatedResponse, Role, UserRecord, UserShort } from '@/types/api.types';

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  groupId?: number;
  sortBy?: 'id' | 'fullName' | 'email' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface UserPayload {
  email: string;
  password?: string;
  fullName: string;
  role: Role;
  groupId?: number;
}

export const usersService = {
  getTeachers: async () => {
    const { data } = await api.get<PaginatedResponse<UserShort>>('/users', {
      params: { role: 'TEACHER', limit: 100, sortBy: 'id', order: 'asc' },
    });
    return data.data;
  },

  getAll: async (params: UsersQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<UserRecord>>('/users', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<UserRecord>(`/users/${id}`);
    return data;
  },

  create: async (payload: UserPayload) => {
    const { data } = await api.post<UserRecord>('/users', payload);
    return data;
  },

  update: async (id: number, payload: UserPayload) => {
    const { data } = await api.put<UserRecord>(`/users/${id}`, payload);
    return data;
  },

  remove: async (id: number) => {
    await api.delete(`/users/${id}`);
  },
};