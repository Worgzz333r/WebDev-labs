import api from './api';
import type { PaginatedResponse, Subject } from '@/types/api.types';

export interface SubjectsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'id' | 'name';
  order?: 'asc' | 'desc';
}

export const subjectsService = {
  getAll: async (params: SubjectsQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<Subject>>('/subjects', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Subject>(`/subjects/${id}`);
    return data;
  },

  create: async (payload: { name: string }) => {
    const { data } = await api.post<Subject>('/subjects', payload);
    return data;
  },

  update: async (id: number, payload: { name: string }) => {
    const { data } = await api.put<Subject>(`/subjects/${id}`, payload);
    return data;
  },

  remove: async (id: number) => {
    await api.delete(`/subjects/${id}`);
  },
};