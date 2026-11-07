import { publish } from './events.js';

// Без io (наприклад, у тестах, що не піднімають сокети) нічого не робить
export async function emitToRooms(req, rooms, event, payload) {
  const io = req.app.get('io');
  if (!io) return;
  await publish(io, rooms, event, payload);
}

// Відвідуваність бачать: заняття (кімната lesson) і сам студент
export const emitAttendance = (req, event, record) =>
  emitToRooms(req, [`lesson:${record.lessonId}`, `user:${record.studentId}`], event, record);

// Заняття бачать: його кімната, кімната групи й викладач
export const emitLesson = (req, event, lesson) =>
  emitToRooms(
    req,
    [`lesson:${lesson.id}`, `group:${lesson.groupId}`, `user:${lesson.teacherId}`],
    event,
    lesson,
  );

// Групу бачать персонал і її студенти
export const emitGroup = (req, event, group) =>
  emitToRooms(req, ['staff', `group:${group.id}`], event, group);

// Предмети бачить персонал
export const emitSubject = (req, event, subject) => emitToRooms(req, ['staff'], event, subject);