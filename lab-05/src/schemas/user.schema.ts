import { z } from 'zod';

export const ROLES = ['ADMIN', 'TEACHER', 'STUDENT'] as const;

export const roleLabels: Record<(typeof ROLES)[number], string> = {
  ADMIN: 'Адміністратор',
  TEACHER: 'Викладач',
  STUDENT: 'Студент',
};

const base = z.object({
  fullName: z.string().trim().min(1, { error: 'Вкажіть ім’я' }).max(100, { error: 'Не більше 100 символів' }),
  email: z.email({ error: 'Некоректний email' }),
  role: z.enum(ROLES, { error: 'Оберіть роль' }),
  // select дає рядок; порожній рядок означає «без групи»
  groupId: z.string().transform((v) => (v === '' ? undefined : Number(v))),
});

// Створення: пароль обов'язковий
export const userCreateSchema = base.extend({
  password: z.string().min(8, { error: 'Пароль має містити щонайменше 8 символів' }),
});

// Редагування: порожній пароль означає «не змінювати»
export const userEditSchema = base.extend({
  password: z
    .string()
    .refine((v) => v === '' || v.length >= 8, { error: 'Пароль має містити щонайменше 8 символів' }),
});

export type UserFormInput = z.input<typeof userCreateSchema>;
export type UserFormData = z.output<typeof userCreateSchema>;