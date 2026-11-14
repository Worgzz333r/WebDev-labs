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
  email: string
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