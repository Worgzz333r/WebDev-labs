import api from './api';
import type { Group, PaginatedResponse } from '@/types/api.types';

export interface GroupsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const groupsService = {
  getAll: async (params: GroupsQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<Group>>('/groups', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Group>(`/groups/${id}`);
    return data;
  },

  create: async (payload: { name: string }) => {
    const { data } = await api.post<Group>('/groups', payload);
    return data;
  },

  update: async (id: number, payload: { name: string }) => {
    const { data } = await api.put<Group>(`/groups/${id}`, payload);
    return data;
  },

  remove: async (id: number) => {
    await api.delete(`/groups/${id}`);
  },
};