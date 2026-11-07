const { z } = require('zod');

const Role = z.enum(['ADMIN', 'TEACHER', 'STUDENT']);
const Status = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

exports.nameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
});

exports.userCreateSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  role: Role.optional(),
  groupId: z.number().int().positive().optional(),
});

exports.userUpdateSchema = exports.userCreateSchema.partial();

exports.lessonCreateSchema = z.object({
  date: z.string().datetime({ message: 'Date must be ISO 8601, e.g. 2026-10-30T09:00:00Z' }),
  topic: z.string().trim().optional(),
  subjectId: z.number().int().positive(),
  groupId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
});

exports.lessonUpdateSchema = exports.lessonCreateSchema.partial();

exports.attendanceCreateSchema = z.object({
  lessonId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  status: Status.optional(),
  comment: z.string().trim().max(500).optional(),
});

exports.attendanceUpdateSchema = z.object({
  status: Status.optional(),
  comment: z.string().trim().max(500).optional(),
});