export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Формат відповіді серверної частини з лабораторної роботи 2
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  error: string;
}

export interface Group {
  id: number;
  name: string;
  _count: { students: number };
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: { accessToken: string; refreshToken: string };
}

export interface GroupDetail {
  id: number;
  name: string;
  students: { id: number; fullName: string; email: string }[];
}

export interface GroupStudent {
  id: number;
  fullName: string;
  email: string;
}

export interface Subject {
  id: number;
  name: string;
}

export interface UserShort {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export interface Lesson {
  id: number;
  date: string;
  topic: string | null;
  subjectId: number;
  groupId: number;
  teacherId: number;
  subject: Subject;
  group: { id: number; name: string };
  teacher: { id: number; fullName: string };
}

// GET /api/lessons/:id повертає заняття разом із повним списком відвідуваності
export interface LessonDetail extends Lesson {
  attendance: Attendance[];
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface FileRecord {
  id: number;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedBy: number;
  createdAt: string;
}

// Document — 1:1-зв'язка відмітки відвідуваності з файлом (лабораторна робота 2).
// GET /attendance/:id повертає document без розгорнутого file — метадані є лише у відповіді на upload.
export interface AttendanceDocument {
  id: number;
  attendanceId: number;
  fileId: number;
  file?: FileRecord;
}

export interface Attendance {
  id: number;
  status: AttendanceStatus;
  comment: string | null;
  lessonId: number;
  studentId: number;
  student: { id: number; fullName: string };
  document?: AttendanceDocument | null;
}

// Рядок звіту GET /api/reports/attendance-summary
export interface AttendanceSummaryRow {
  studentId: number;
  fullName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercent: number;
}

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface UserRecord extends UserShort {
  role: Role;
  groupId: number | null;
  createdAt: string;
}
