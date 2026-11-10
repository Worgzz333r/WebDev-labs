# WebSocket API

Реальний час реалізовано на Socket.io. Сервер: той самий хост і порт, що й REST API.

## Підключення

```js
import { io } from 'socket.io-client';

const socket = io(API_URL, { auth: { token: accessToken } });
```

- Автентифікація: JWT access-токен у `auth.token`.
- Без токена, з недійсним токеном або для видаленого користувача з'єднання відхиляється з помилкою `unauthorized` (подія `connect_error`).
- CORS: дозволено origin із `FRONTEND_URL`.
- Кілька інстансів сервера синхронізуються через Redis-адаптер (`REDIS_URL`).

### Спливання токена

Коли access-токен спливає, сервер надсилає `auth:expired` і розриває з'єднання. Клієнт оновлює токен через `POST /api/auth/refresh` (тіло `{ "refreshToken": "..." }`, у відповідь нова пара токенів) і підключається знову з новим `auth.token`, після чого запитує пропущені події (`events:since`).

## Кімнати

| Кімната | Хто потрапляє | Призначення |
|---|---|---|
| `user:<id>` | автоматично, кожен користувач | персональні події та сповіщення |
| `group:<id>` | автоматично, своя група | події групи та її занять |
| `staff` | автоматично, `ADMIN` і `TEACHER` | події груп і предметів, статус онлайн |
| `lesson:<id>` | через `room:join` | події конкретного заняття |

Права на `room:join` (кімнати `lesson:<id>` і `group:<id>`):

- `ADMIN`: будь-які;
- `TEACHER`: лише свої заняття та групи, у яких веде заняття;
- `STUDENT`: лише своя група та заняття своєї групи.

Інші назви кімнат (зокрема `user:*`, `staff`) приєднати вручну не можна.

## Події від клієнта

Усі обробники повертають результат через **ack**: `{ ok: true, ... }` або `{ ok: false, error }`. Якщо ack не передано, помилка надходить подією `app:error`.

### `room:join`

- Аргумент: `room` (рядок, напр. `"lesson:12"`).
- Успіх: `{ ok: true }`.
- Помилки: `forbidden`.

### `room:leave`

- Аргумент: `room`.
- Успіх: `{ ok: true }`.

### `presence:list`

Хто зараз онлайн. Персонал бачить усіх, студент лише свою групу.

- Успіх: `{ ok: true, online: [userId, ...] }`.

### `events:since`

Відновлення пропущених подій після перепідключення.

- Аргумент: `lastSeq` (ціле число ≥ 0, останній отриманий `seq`).
- Повертає події лише з тих кімнат, у яких зараз перебуває сокет.
- Успіх:

```json
{
  "ok": true,
  "events": [{ "seq": 41, "type": "attendance:updated", "payload": { } }],
  "hasMore": false,
  "gap": false
}
```

- `hasMore: true`: подій більше за 500, треба повторити запит із останнім `seq`.
- `gap: true`: старіші події вже видалено з журналу, потрібно перезавантажити стан через REST.
- Помилки: `bad_request`.

## Події від сервера

Події з журналу (`attendance:*`, `lesson:*`, `group:*`, `subject:*`) приходять як `(payload, { seq })`. Клієнт зберігає останній `seq` і передає його в `events:since` після перепідключення.

| Подія | Кімнати-одержувачі | Payload |
|---|---|---|
| `attendance:created`, `attendance:updated` | `lesson:<lessonId>`, `user:<studentId>` | запис відвідуваності (`status`: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) |
| `attendance:deleted` | `lesson:<lessonId>`, `user:<studentId>` | `{ id, lessonId, studentId }` |
| `lesson:created`, `lesson:updated` | `lesson:<id>`, `group:<groupId>`, `user:<teacherId>` | заняття разом із групою та викладачем (`teacher: { id, fullName }`) |
| `lesson:deleted` | `lesson:<id>`, `group:<groupId>`, `user:<teacherId>` | `{ id, groupId, teacherId }` |
| `group:created`, `group:updated` | `staff`, `group:<id>` | група |
| `group:deleted` | `staff`, `group:<id>` | `{ id, name }` |
| `subject:created`, `subject:updated` | `staff` | предмет |
| `subject:deleted` | `staff` | `{ id, name }` |

### `notification`

Кімната: `user:<id>`. Payload: запис `Notification` з БД:

```json
{
  "id": 1,
  "userId": 5,
  "type": "ATTENDANCE",
  "priority": "HIGH",
  "title": "Відмічено відвідуваність",
  "body": "Статус: відсутній",
  "data": { "attendanceId": 7, "lessonId": 12 },
  "readAt": null,
  "createdAt": "2026-11-10T12:00:00.000Z"
}
```

Типи (`type`): `ATTENDANCE`, `LESSON`, `SYSTEM`. Пріоритети (`priority`): `LOW`, `NORMAL`, `HIGH`.

Коли надсилаються:

| Тип | Подія | Одержувач | `data` |
|---|---|---|---|
| `ATTENDANCE` | відмітку створено або змінено (`HIGH`, якщо статус `ABSENT`, інакше `NORMAL`) | студент | `{ attendanceId, lessonId }` |
| `LESSON` | заняття створено, змінено або скасовано | усі студенти групи | `{ lessonId }` |

Масові сповіщення (`notifyMany`) надсилаються по одному в персональну кімнату кожного одержувача; для великих розсилок використовується черга BullMQ.

### `presence:update`

Кімнати: `staff` і `group:<groupId>` користувача. Спрацьовує, коли користувач отримує перше з'єднання або втрачає останнє.

```json
{ "userId": 5, "online": true, "at": "2026-11-10T12:00:00.000Z" }
```

### `auth:expired`

Токен спливе або вже сплив, з'єднання буде розірвано. Див. «Спливання токена».

### `app:error`

Помилка обробника події, коли клієнт не передав ack.

```json
{ "event": "room:join", "error": "forbidden" }
```

## Коди помилок

| Код | Значення |
|---|---|
| `unauthorized` | недійсний або відсутній токен (під час підключення) |
| `forbidden` | немає прав на кімнату |
| `bad_request` | некоректний аргумент |
| `rate_limited` | перевищено ліміт подій: 30 за 10 с на сокет (`WS_RATE_LIMIT`, `WS_RATE_WINDOW_MS`) |
| `internal` | внутрішня помилка сервера |

## Приклад клієнта

```js
let lastSeq = 0;

socket.on('connect', async () => {
  const res = await socket.emitWithAck('events:since', lastSeq);
  if (res.ok) {
    if (res.gap) await reloadStateViaRest();
    res.events.forEach(applyEvent);
    lastSeq = res.events.at(-1)?.seq ?? lastSeq;
  }
});

socket.on('attendance:updated', (record, { seq }) => {
  lastSeq = seq;
  updateUI(record);
});

socket.on('auth:expired', async () => {
  const token = await refreshAccessToken();
  socket.auth.token = token;
  socket.connect();
});
```
