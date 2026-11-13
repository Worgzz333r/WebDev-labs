import { z } from 'zod';

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Вкажіть назву групи' })
    .max(100, { error: 'Назва має містити не більше 100 символів' }),
});

export type GroupFormData = z.infer<typeof groupSchema>;