import api from './api';
import type { FileRecord } from '@/types/api.types';

export const filesService = {
  upload: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<{ message: string; file: FileRecord }>('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.file;
  },

  // GET /files/:id вимагає Bearer, тому для <img> отримуємо blob і робимо локальний object URL
  getBlobUrl: async (id: number) => {
    const { data } = await api.get<Blob>(`/files/${id}`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  },

  remove: async (id: number) => {
    await api.delete(`/files/${id}`);
  },
};
