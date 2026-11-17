import { z } from 'zod';

const selectId = (message: string) =>
  z
    .string()
    .min(1, { error: message })
    .transform((v) => Number(v));

export const lessonSchema = z.object({
  // дата й час розділені: дату обирає календар (react-day-picker), час — окреме поле
  day: z.string().min(1, { error: 'Оберіть дату' }),
  time: z.string().regex(/^\d{2}:\d{2}$/, { error: 'Вкажіть час' }),
  // тема зберігається як HTML з Tiptap (завдання 13), тому ліміт більший за 200 символів
  topic: z.string().trim().max(5000, { error: 'Не більше 5000 символів' }).optional(),
  subjectId: selectId('Оберіть предмет'),
  groupId: selectId('Оберіть групу'),
  teacherId: selectId('Оберіть викладача'),
});

export type LessonFormInput = z.input<typeof lessonSchema>;
export type LessonFormData = z.output<typeof lessonSchema>;
