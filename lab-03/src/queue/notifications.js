import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { notifyMany } from '../utils/notifications.js';

const CHUNK = 500;
let queue = null;

export function startNotificationQueue(io) {
  if (!process.env.REDIS_URL) return;
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue('notifications', { connection });
  new Worker(
    'notifications',
    async (job) => {
      const { userIds, payload } = job.data;
      await notifyMany(io, userIds, payload);
    },
    { connection, concurrency: 2 },
  );
}

export async function enqueueNotifyMany(io, userIds, payload) {
  if (!queue) return notifyMany(io, userIds, payload); // без Redis: як раніше
  for (let i = 0; i < userIds.length; i += CHUNK) {
    await queue.add(
      'send',
      { userIds: userIds.slice(i, i + CHUNK), payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 500 },
    );
  }
}