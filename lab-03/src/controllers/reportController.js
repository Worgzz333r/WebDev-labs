import prisma from '../utils/prisma.js';
import { Prisma } from '../generated/prisma/client.ts';
import { toId } from '../utils/query.js';

// GET /api/reports/attendance-summary?groupId=1&dateFrom=2026-09-01&dateTo=2026-12-31
export const attendanceSummary = async (req, res) => {
  const groupId = toId(req.query.groupId);
  if (!groupId) return res.status(400).json({ error: 'groupId is required' });

  const { dateFrom, dateTo } = req.query;
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return res.status(400).json({ error: 'Dates must be ISO 8601, e.g. 2026-10-30' });
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) to.setUTCHours(23, 59, 59, 999);

  // Умови за датою додаються лише якщо їх передали; значення йдуть параметрами (без SQL-ін'єкцій)
  const fromSql = from ? Prisma.sql`AND l.date >= ${from}` : Prisma.empty;
  const toSql = to ? Prisma.sql`AND l.date <= ${to}` : Prisma.empty;

  // Один запит: LEFT JOIN залишає студентів без записів (total = 0), COUNT(*) FILTER рахує статуси
  const rows = await prisma.$queryRaw`
    SELECT u.id AS "studentId",
           u."fullName",
           COUNT(a.id)::int AS total,
           (COUNT(*) FILTER (WHERE a.status = 'PRESENT'))::int AS present,
           (COUNT(*) FILTER (WHERE a.status = 'ABSENT'))::int AS absent,
           (COUNT(*) FILTER (WHERE a.status = 'LATE'))::int AS late,
           (COUNT(*) FILTER (WHERE a.status = 'EXCUSED'))::int AS excused,
           ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE'))
                 / NULLIF(COUNT(a.id), 0), 1)::float AS "attendancePercent"
    FROM "User" u
    LEFT JOIN "Attendance" a
      ON a."studentId" = u.id
     AND a."lessonId" IN (
           SELECT l.id FROM "Lesson" l
           WHERE l."groupId" = ${groupId} ${fromSql} ${toSql}
         )
    WHERE u."groupId" = ${groupId} AND u.role = 'STUDENT'
    GROUP BY u.id, u."fullName"
    ORDER BY u."fullName"`;

  res.json({ groupId, dateFrom: dateFrom ?? null, dateTo: dateTo ?? null, data: rows });
};