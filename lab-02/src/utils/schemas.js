import { z } from 'zod';

const Role = z.enum(['ADMIN', 'TEACHER', 'STUDENT']);
const Status = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const nameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
});

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  role: Role.optional(),
  groupId: z.number().int().positive().optional(),
});

export const userUpdateSchema = userCreateSchema.partial();

export const lessonCreateSchema = z.object({
  date: z.string().datetime({ message: 'Date must be ISO 8601, e.g. 2026-10-30T09:00:00Z' }),
  topic: z.string().trim().optional(),
  subjectId: z.number().int().positive(),
  groupId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
});

export const lessonUpdateSchema = lessonCreateSchema.partial();

export const attendanceCreateSchema = z.object({
  lessonId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  status: Status.optional(),
  comment: z.string().trim().max(500).optional(),
});

export const attendanceUpdateSchema = z.object({
  status: Status.optional(),
  comment: z.string().trim().max(500).optional(),
});

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  groupId: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});