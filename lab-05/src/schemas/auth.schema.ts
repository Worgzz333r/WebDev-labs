import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Невірний формат email' }),
  password: z.string().min(8, { error: 'Пароль має містити мінімум 8 символів' }),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, { error: "Ім'я має містити мінімум 2 символи" }),
    email: z.email({ error: 'Невірний формат email' }),
    password: z.string().min(8, { error: 'Пароль має містити мінімум 8 символів' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
