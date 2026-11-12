import api from '@/services/api';
import type { Group, PaginatedResponse } from '@/types/api.types';

export async function getGroups(search?: string): Promise<PaginatedResponse<Group>> {
  const { data } = await api.get<PaginatedResponse<Group>>('/groups', { params: { search } });
  return data;
}
