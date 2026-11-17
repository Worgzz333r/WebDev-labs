import api from './api';
import type {
  Attendance,
  AttendanceDocument,
  AttendanceStatus,
  PaginatedResponse,
} from '@/types/api.types';

export interface AttendanceQuery {
  lessonId?: number;
  studentId?: number;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface AttendancePayload {
  lessonId: number;
  studentId: number;
  status?: AttendanceStatus;
  comment?: string;
}

export const attendanceService = {
  getAll: async (params: AttendanceQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<Attendance>>('/attendance', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Attendance>(`/attendance/${id}`);
    return data;
  },

  create: async (payload: AttendancePayload) => {
    const { data } = await api.post<Attendance>('/attendance', payload);
    return data;
  },

  update: async (id: number, payload: { status?: AttendanceStatus; comment?: string }) => {
    const { data } = await api.put<Attendance>(`/attendance/${id}`, payload);
    return data;
  },

  remove: async (id: number) => {
    await api.delete(`/attendance/${id}`);
  },

  // Документ (фото пояснювальної тощо) додається лише до СВОГО запису — кінцева точка лише для студентів
  uploadDocument: async (attendanceId: number, blob: Blob, filename: string) => {
    const form = new FormData();
    form.append('file', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
    const { data } = await api.post<AttendanceDocument>(`/attendance/${attendanceId}/document`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
