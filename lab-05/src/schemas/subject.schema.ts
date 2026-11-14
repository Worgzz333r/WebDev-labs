import { z } from 'zod';

export const subjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Вкажіть назву предмета' })
    .max(100, { error: 'Назва має містити не більше 100 символів' }),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;