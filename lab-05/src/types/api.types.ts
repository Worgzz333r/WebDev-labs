export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
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

