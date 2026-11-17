import api from './api';
import type { Lesson, LessonDetail, PaginatedResponse } from '@/types/api.types';

export interface LessonsQuery {
  page?: number;
  limit?: number;
  search?: string;
  groupId?: number;
  subjectId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'id' | 'date' | 'topic';
  order?: 'asc' | 'desc';
}

export interface LessonPayload {
  date: string;
  topic?: string;
  subjectId: number;
  groupId: number;
  teacherId: number;
}

export const lessonsService = {
  getAll: async (params: LessonsQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<Lesson>>('/lessons', { params });
    return data;
  },

  // Деталі повертають заняття разом із відвідуваністю (student у кожному записі)
  getById: async (id: number) => {
    const { data } = await api.get<LessonDetail>(`/lessons/${id}`);
    return data;
  },

  create: async (payload: LessonPayload) => {
    const { data } = await api.post<Lesson>('/lessons', payload);
    return data;
  },

  update: async (id: number, payload: LessonPayload) => {
    const { data } = await api.put<Lesson>(`/lessons/${id}`, payload);
    return data;
  },

  remove: async (id: number) => {
    await api.delete(`/lessons/${id}`);
  },
};
