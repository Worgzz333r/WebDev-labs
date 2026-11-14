import { useQuery } from '@tanstack/react-query';
import { groupsService } from '@/services/groups';
import { subjectsService } from '@/services/subjects';
import { usersService } from '@/services/users';

const staleTime = 5 * 60 * 1000;

export const useGroupOptions = () =>
  useQuery({
    queryKey: ['groups', 'options'],
    queryFn: async () => (await groupsService.getAll({ limit: 100 })).data,
    staleTime,
  });

export const useSubjectOptions = () =>
  useQuery({
    queryKey: ['subjects', 'options'],
    queryFn: async () => (await subjectsService.getAll({ limit: 100 })).data,
    staleTime,
  });

export const useTeacherOptions = (enabled = true) =>
  useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: usersService.getTeachers,
    staleTime,
    enabled,
  });