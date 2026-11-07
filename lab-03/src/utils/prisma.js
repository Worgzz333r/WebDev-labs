import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Журнал запитів вмикається змінною LOG_QUERIES=true (для пошуку повільних запитів)
const logQueries = process.env.LOG_QUERIES === 'true';

const prisma = new PrismaClient({
  adapter,
  log: logQueries ? [{ emit: 'event', level: 'query' }] : [],
});

if (logQueries) {
  const slowMs = Number(process.env.SLOW_QUERY_MS) || 0;
  prisma.$on('query', (e) => {
    if (e.duration >= slowMs) console.log(`[query] ${e.duration} ms  ${e.query}`);
  });
}

export default prisma;