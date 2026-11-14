import { z } from 'zod';

const selectId = (message: string) =>
  z
    .string()
    .min(1, { error: message })
    .transform((v) => Number(v));

export const lessonSchema = z.object({
  date: z.string().min(1, { error: 'Вкажіть дату й час' }),
  topic: z.string().trim().max(200, { error: 'Не більше 200 символів' }).optional(),
  subjectId: selectId('Оберіть предмет'),
  groupId: selectId('Оберіть групу'),
  teacherId: selectId('Оберіть викладача'),
});

export type LessonFormInput = z.input<typeof lessonSchema>;
export type LessonFormData = z.output<typeof lessonSchema>;