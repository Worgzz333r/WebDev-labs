import prisma from '../utils/prisma.js';

// Скільки подій максимум повертаємо за один запит відновлення
export const REPLAY_LIMIT = 500;

// Зберігає подію в журналі (seq) і розсилає її в кімнати.
// Клієнт отримує (payload, { seq }) і запам'ятовує останній seq.
export async function publish(io, rooms, type, payload) {
  const event = await prisma.realtimeEvent.create({
    // JSON-копія, щоб Date та інші типи коректно лягли в колонку Json
    data: { type, rooms, payload: JSON.parse(JSON.stringify(payload)) },
  });
  io.to(rooms).emit(type, payload, { seq: event.seq });
  return event;
}

// Пропущені події в заданих кімнатах після lastSeq (за зростанням seq)
export async function eventsSince(rooms, lastSeq) {
  const [oldest, events] = await Promise.all([
    prisma.realtimeEvent.findFirst({ orderBy: { seq: 'asc' }, select: { seq: true } }),
    prisma.realtimeEvent.findMany({
      where: { seq: { gt: lastSeq }, rooms: { hasSome: rooms } },
      orderBy: { seq: 'asc' },
      take: REPLAY_LIMIT + 1,
      select: { seq: true, type: true, payload: true },
    }),
  ]);
  return {
    events: events.slice(0, REPLAY_LIMIT),
    hasMore: events.length > REPLAY_LIMIT,
    // старіші за журнал події могли бути видалені: тоді клієнту треба перезавантажити стан через REST
    gap: oldest ? lastSeq < oldest.seq - 1 : false,
  };
}