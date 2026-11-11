# Звіт з лабораторної роботи 3

## Тема роботи: Взаємодія в реальному часі та фіналізація серверної частини

Здобувач освіти: [Генелюк Назар Олексійович]
Група: [ІПЗ-42]
GitHub репозиторій: [https://github.com/Worgzz333r/WebDev-labs/tree/main/lab-03]
Розгорнутий застосунок: [https://webdev-labs-omr1.onrender.com]
Рівень складності: [3]

## Реалізований функціонал

Предметна область: система обліку відвідуваності студентів (розвиток лабораторної 2). Стек: Node.js 24, Express 5, PostgreSQL, Prisma 7, Socket.io 4, Redis (`@socket.io/redis-adapter`, BullMQ, `redis`, `ioredis`), prom-client, pino, zod, node:test + supertest + socket.io-client. Інструкція із запуску та змінні середовища описані в `README.md`, WebSocket API описано в `docs/websocket-api.md`.

Функції, які потребують реального часу: відмітки відвідуваності, розклад пар, групи та предмети, сповіщення студентам, онлайн-статус користувачів.

### Рівень 1

- Socket.io інтегровано в Express через явний HTTP-сервер (`src/server.js`), ініціалізація в `src/socket/index.js`; CORS обмежено адресою `FRONTEND_URL`.
- Система кімнат: `user:<id>` (персональна), `group:<id>`, `staff` (`ADMIN` і `TEACHER`) підключаються автоматично, `lesson:<id>` через подію `room:join` з перевіркою прав (`src/socket/rooms.js`).
- Оновлення в реальному часі для відвідуваності: `attendance:created`, `attendance:updated`, `attendance:deleted` надходять у кімнату заняття та персональну кімнату студента.
- Сповіщення: модель `Notification` у БД, REST-ендпоінти `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, доставка подією `notification` у кімнату `user:<id>`.
- Оптимізація повільних запитів: журнал запитів Prisma (`LOG_QUERIES`, `SLOW_QUERY_MS`), аналіз через `EXPLAIN ANALYZE` (`scripts/explain.js`), індекси `@@index`.
- Розгортання: Render (Frankfurt, Free), база PostgreSQL на Neon, Redis на Upstash; `GET /health` для перевірки стану.

### Рівень 2

- Автентифікація WebSocket через JWT: токен передається в `auth.token`, сервер перевіряє його та існування користувача в БД (`io.use` у `src/socket/index.js`). Без токена, з недійсним токеном або для видаленого користувача з'єднання відхиляється з помилкою `unauthorized`.
- Спливання токена: за `exp` токена сервер надсилає `auth:expired` і розриває з'єднання; клієнт оновлює токен через `/auth/refresh` і підключається знову.
- Сповіщення з типами (`ATTENDANCE`, `LESSON`, `SYSTEM`) і пріоритетами (`LOW`, `NORMAL`, `HIGH`). Відмітка `ABSENT` породжує сповіщення з пріоритетом `HIGH`.
- Реальний час для всіх основних сутностей: відвідуваність, пари (`lesson:*`), групи (`group:*`), предмети (`subject:*`). Кожна подія доставляється лише в потрібні кімнати (`src/socket/emit.js`).
- Онлайн-статус: `presence:update` надсилається, коли користувач отримує перше з'єднання або втрачає останнє; `presence:list` повертає список онлайн (персонал бачить усіх, студент лише свою групу).
- Повторне підключення з відновленням подій: таблиця `RealtimeEvent` із порядковим номером `seq`, кожна подія приходить як `(payload, { seq })`. Після перепідключення клієнт викликає `events:since` із останнім `seq`; відповідь містить `events`, `hasMore` (якщо подій більше 500) і `gap` (якщо старіші події вже видалено і потрібно перезавантажити стан через REST).
- Комплексна оптимізація: індекси, усунення N+1 через `include`/`select`, пагінація всіх списків, кешування груп і предметів з інвалідацією.
- Обробка помилок: помилки обробників повертаються через ack (`{ ok: false, error }`) або подією `app:error`.

![Міграція `add_realtime_events` (журнал подій із порядковим номером `seq`)](screenshots/migration-realtime-events.png)

![Міграція `add_notifications` (модель сповіщень)](screenshots/migration-notifications.png)

![Два підключені клієнти: подія `attendance:updated` отримана в реальному часі](screenshots/realtime-two-clients.png)

![Шестеро одночасних клієнтів: `lesson:created`, `presence:list`, відновлення пропущених подій (`scripts/multi-client.js`)](screenshots/multi-client.png)

![Сповіщення `notification` з пріоритетом `HIGH` після відмітки `ABSENT`](screenshots/notification-high.png)

### Рівень 3

- Горизонтальне масштабування: `@socket.io/redis-adapter` підключається, коли задано `REDIS_URL`; без нього застосунок працює в одно-процесному режимі.
- Rate limiting для WebSocket-подій: 30 подій за 10 с на сокет (`WS_RATE_LIMIT`, `WS_RATE_WINDOW_MS`), перевищення дає помилку `rate_limited` (`src/socket/handle.js`).
- Черга фонових задач: масові сповіщення через BullMQ (`src/queue/notifications.js`), порціями по 500 одержувачів, 3 спроби з експоненційною затримкою. Без Redis сповіщення надсилаються напряму.
- Розширене кешування у Redis: списки груп і предметів кешуються з інвалідацією при змінах; без Redis кеш працює в пам'яті процесу.
- Метрики та моніторинг: `GET /metrics` (Prometheus, захищено `METRICS_TOKEN`): метрики Node.js, тривалість HTTP-запитів, кількість WebSocket-з'єднань, влучання й промахи кешу; журналювання через `pino` / `pino-http`.
- Автомасштабування: Render Free його не підтримує, тому в README описано підготовку (стан у Redis, JWT без локального стану) і вимогу sticky sessions для кількох інстансів.
- Документація WebSocket API: `docs/websocket-api.md` (підключення, кімнати, події клієнта й сервера, коди помилок, приклад клієнта).

![Метрики Prometheus на `/metrics` (лічильник WebSocket-з'єднань, кеш, HTTP-запити)](screenshots/metrics.png)

![Перевірка обмеження частоти WebSocket-подій (`rate_limited`)](screenshots/ratelimit-check.png)

![Перевірка Redis-адаптера та кешу (`scripts/redis-check.js`)](screenshots/redis-check.png)

![Перевірка черги масових сповіщень BullMQ (`scripts/queue-check.js`)](screenshots/queue-check.png)

### Оптимізація бази даних

Тестовий набір даних створено скриптом `npm run seed:load`. Плани виконання збережено у `reports/explain-before.txt` і `reports/explain-after.txt`.

| Запит | До | Після | Індекс |
|---|---|---|---|
| Кількість відміток студента | Seq Scan, 6.064 мс | Index Only Scan, 0.181 мс | `Attendance(studentId, id)` |
| Остання сторінка відміток студента | Index Scan по `pkey`, 0.565 мс | Index Scan, 0.059 мс | `Attendance(studentId, id)` |
| Пари групи за період | Seq Scan, 0.345 мс | Index Scan Backward, 0.069 мс | `Lesson(groupId, date)` |
| Усі відсутні (`status=ABSENT`) | Seq Scan, 5.362 мс | Seq Scan, 5.907 мс | не додавався |

Індекс на `status` свідомо не створювався: умова відповідає приблизно 10% таблиці (19 932 з ~200 000 записів), тому планувальник вибирає Seq Scan, а індекс лише сповільнював би запис. Додатково створено індекси `Notification(userId, readAt)`, `Notification(userId, createdAt)`, GIN-індекс `RealtimeEvent(rooms)` для пошуку пропущених подій за кімнатами, `RealtimeEvent(createdAt)`, `AuditLog(userId)`, `AuditLog(action)`, `AuditLog(createdAt)`, `File(uploadedBy)`.

Інші заходи: пул з'єднань `pg.Pool` (параметри `DB_POOL_*`, на Neon використовується pooled-рядок підключення), складний звіт `GET /reports/attendance-summary` одним raw SQL запитом (`LEFT JOIN` + `COUNT(*) FILTER`, параметризований).

![Міграція `add_performance_indexes`](screenshots/migration-peformance-indexes.png)

![`EXPLAIN ANALYZE` до додавання індексу: Seq Scan](screenshots/explain-before.png)

![`EXPLAIN ANALYZE` після додавання індексу: Index Scan](screenshots/explain-after.png)

### Розгортання

- Render, Root Directory `lab-03`, Build Command `npm ci && npx prisma generate && npx prisma migrate deploy`, Start Command `npm start`, Health Check Path `/health`.
- Змінні середовища: `DATABASE_URL` (Neon), `REDIS_URL` (Upstash), `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `FRONTEND_URL`, `METRICS_TOKEN`, `NODE_VERSION=24`; `LOG_QUERIES` вимкнено.
- Міграції застосовуються командою `prisma migrate deploy` (`migrate dev` на робочій базі не використовується).
- Обмеження безкоштовного тарифу, які враховано: засинання сервісу після 15 хвилин (WebSocket-з'єднання розриваються, клієнт перепідключається й викликає `events:since`); тимчасова файлова система (довідки зникають після перезапуску, для постійного зберігання потрібне S3-сумісне сховище); безкоштовна база Render видаляється через 30 днів, тому використано Neon; ліміт Upstash 500 тисяч команд на місяць (за вичерпання достатньо прибрати `REDIS_URL`).

![Застосування міграцій на робочій базі (`prisma migrate deploy`)](screenshots/migrate-deploy.png)

![Відповідь `GET /health` на розгорнутому застосунку (Render)](screenshots/health.png)

### Тестування

Команда `npm test` (`node --test`, `supertest`, `socket.io-client`, реальна БД PostgreSQL, Redis у тестах вимкнено). Разом 64 тести:

| Файл | Тестів | Що перевіряє |
|---|---|---|
| `auth.test.js` | 13 | реєстрація, вхід, ролі, refresh-токени |
| `features.test.js` | 29 | файли, пагінація, пошук, сортування, журнал дій, 2FA |
| `socket.test.js` | 5 | відхилення без токена й для видаленого користувача, кімнати та персональні сповіщення, чужа кімната, `auth:expired` |
| `realtime.test.js` | 6 | події відвідуваності, пар, груп і предметів, batch-сповіщення, онлайн-статус, відновлення пропущених подій |
| `notifications.test.js` | 6 | REST сповіщень: доступ, фільтри, прочитані, видалення |
| `cache.test.js` | 2 | кеш предметів і груп та його інвалідація |
| `reports.test.js` | 3 | звіт відвідуваності, фільтр за датою, валідація й права |

Результат запуску:

![Результат `npm test`: 64 тести, 64 пройдено, 0 помилок](screenshots/test-1.png)
![Результат `npm test`: 64 тести, 64 пройдено, 0 помилок](screenshots/test-2.png)

Додатково для розгорнутого застосунку: `scripts/smoke.js` (швидка перевірка), `scripts/multi-client.js` (кілька одночасно підключених клієнтів), `scripts/ratelimit-check.js`, `scripts/redis-check.js`, `scripts/queue-check.js`.

## Ключові фрагменти коду

Автентифікація WebSocket-з'єднання, `src/socket/index.js`:

```javascript
io.use(async (socket, next) => {
  try {
    socket.user = verifyAccessToken(socket.handshake.auth?.token);
    // Користувача могли видалити, поки токен ще дійсний
    const dbUser = await prisma.user.findUnique({
      where: { id: socket.user.userId },
      select: { groupId: true },
    });
    if (!dbUser) return next(new Error('unauthorized'));
    socket.data.userId = socket.user.userId;
    socket.data.groupId = dbUser.groupId;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});
```

Збереження події в журнал і розсилка в кімнати, `src/socket/events.js`:

```javascript
export async function publish(io, rooms, type, payload) {
  const event = await prisma.realtimeEvent.create({
    data: { type, rooms, payload: JSON.parse(JSON.stringify(payload)) },
  });
  io.to(rooms).emit(type, payload, { seq: event.seq });
  return event;
}
```

Обробник подій з обмеженням частоти та ack, `src/socket/handle.js`:

```javascript
export function handle(socket, event, fn) {
  socket.on(event, async (...args) => {
    const ack = typeof args.at(-1) === 'function' ? args.pop() : null;
    try {
      const now = Date.now();
      const rl = (socket.data.rl ??= { start: now, count: 0 });
      if (now - rl.start > WINDOW_MS) { rl.start = now; rl.count = 0; }
      if (++rl.count > LIMIT) throw new SocketError('rate_limited');

      const result = (await fn(...args)) ?? {};
      ack?.({ ok: true, ...result });
    } catch (err) {
      const code = err instanceof SocketError ? err.code : 'internal';
      if (ack) ack({ ok: false, error: code });
      else socket.emit('app:error', { event, error: code });
    }
  });
}
```

Batch-сповіщення одним запитом до БД, `src/utils/notifications.js`:

```javascript
export async function notifyMany(io, userIds, { type, priority = 'NORMAL', title, body, data }) {
  if (userIds.length === 0) return [];
  const notifications = await prisma.notification.createManyAndReturn({
    data: userIds.map((userId) => ({ userId, type, priority, title, body, data })),
  });
  for (const n of notifications) io?.to(`user:${n.userId}`).emit('notification', n);
  return notifications;
}
```

## Висновок

Самооцінка: [5]

Обґрунтування: [виконано всі завдання рівнів 1, 2 і 3. Socket.io інтегровано з JWT-автентифікацією, кімнатами, сповіщеннями з типами й пріоритетами та відновленням пропущених подій через журнал RealtimeEvent із порядковим номером seq. З рівня 3 реалізовано Redis-адаптер (перевірено двома інстансами), rate limiting WebSocket-подій, чергу BullMQ для масових сповіщень, кешування в Redis, метрики Prometheus і журналювання pino та документацію WebSocket API. Запити оптимізовано індексами з порівнянням EXPLAIN ANALYZE до і після (Seq Scan замінено на Index Scan), усунено N+1 і додано пагінацію та raw SQL звіт. Застосунок розгорнуто на Render (БД на Neon, Redis на Upstash) із GET /health, міграції застосовуються через prisma migrate deploy. Роботу покрито 64 автоматичними тестами. Автомасштабування Render Free не підтримує, тому його підготовку й вимогу sticky sessions описано в README. Відновлення пропущених подій обмежено 500 записами, а довідки зберігаються на тимчасовій файловій системі, тож для постійного зберігання потрібне зовнішнє сховище.]
