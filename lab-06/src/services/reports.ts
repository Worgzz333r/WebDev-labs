import api from './api';
import type { AttendanceSummaryRow } from '@/types/api.types';

export const reportsService = {
  // Звіт відвідуваності по студентах групи (ADMIN/TEACHER), дані для графіків
  attendanceSummary: async (groupId: number, dateFrom?: string, dateTo?: string) => {
    const { data } = await api.get<{ data: AttendanceSummaryRow[] }>('/reports/attendance-summary', {
      params: { groupId, dateFrom, dateTo },
    });
    return data.data;
  },
};
