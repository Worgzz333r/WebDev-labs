# Система обліку відвідуваності студентів (Backend API)

Лабораторна робота №3: взаємодія в реальному часі та фіналізація серверної частини. Backend на Node.js + Express 5 + PostgreSQL (Prisma ORM) + Socket.io. Розвиває проєкт з лабораторної №2 (автентифікація, ролі, файли, журнал дій).

Розгорнутий застосунок: https://webdev-labs-omr1.onrender.com (Render Free, див. розділ «Розгортання та обмеження»).

## Що нового порівняно з лабораторною №2

- **Socket.io** із JWT-автентифікацією, кімнатами (`user`, `group`, `lesson`, `staff`) і перевіркою прав на підписку
- оновлення в реальному часі: відвідуваність, пари, групи, предмети
- **сповіщення**: збереження в БД, REST API, доставка через WebSocket, типи та пріоритети, масова розсилка
- **онлайн-статус** користувачів
- **відновлення пропущених подій** після перепідключення (журнал подій із порядковим номером `seq`)
- оновлення access токена без втрати підписок (`auth:expired` + повторне підключення)
- **оптимізація БД**: індекси, перевірка запитів через `EXPLAIN ANALYZE`, кешування, складний звіт на raw SQL
- **Redis**: адаптер Socket.io для кількох інстансів, черга масових сповіщень (BullMQ), кеш
- обмеження частоти WebSocket-подій
- метрики **Prometheus** (`/metrics`) і структуроване журналювання (`pino`)
- розгортання: Render + Neon (PostgreSQL) + Upstash (Redis)

<details>
<summary>Що було в лабораторній №2</summary>

- реєстрація та вхід, паролі хешуються **Argon2id**
- **JWT**: короткоживучий access токен і refresh токен із ротацією та відкликанням
- ролі `ADMIN`, `TEACHER`, `STUDENT` і middleware авторизації для кожного маршруту
- файловий сервіс (Multer 2.x) і довідки до відміток відвідуваності
- пагінація, пошук, фільтри та сортування у списках
- зміна пароля, **двофакторна аутентифікація** (TOTP)
- **журнал дій користувачів** (`/audit-logs`, лише для `ADMIN`)
- завантаження **кількох файлів** одним запитом
- документація **Swagger** (`/api-docs`)
- захист: `helmet`, CORS, rate limiting
- автотести (`node:test` + `supertest`)

</details>

## Стек

- Node.js 24, Express 5
- PostgreSQL, Prisma ORM 7 (`@prisma/adapter-pg`)
- Socket.io 4, `@socket.io/redis-adapter`
- Redis (`redis`, `ioredis`), BullMQ (черга сповіщень)
- prom-client (метрики), pino / pino-http (журналювання)
- zod (валідація), argon2 (хешування паролів), jsonwebtoken
- multer 2.x (файли), swagger-jsdoc + swagger-ui-express
- helmet, cors, express-rate-limit
- тести: вбудований `node:test`, supertest, socket.io-client

## Структура проєкту

```
lab-03/
├── docs/
│   └── websocket-api.md     # документація WebSocket API
├── prisma/
│   ├── schema.prisma        # схема БД
│   └── migrations/          # міграції
├── scripts/                 # create-admin, seed-test, seed-load, explain, smoke та інші
├── src/
│   ├── app.js               # збірка застосунку (без listen, для тестів)
│   ├── server.js            # HTTP-сервер + Socket.io
│   ├── config/swagger.js    # налаштування Swagger
│   ├── controllers/         # логіка обробки запитів
│   ├── middleware/          # auth, authorize, upload
│   ├── routes/              # маршрути та Swagger-анотації
│   ├── socket/              # Socket.io: index, rooms, emit, events, presence, handle, handlers/
│   ├── queue/               # черга масових сповіщень (BullMQ)
│   └── utils/               # jwt, password, totp, audit, prisma, query, cache, notifications, metrics ...
├── tests/                   # автотести
├── requests.http            # ручні запити (REST Client)
├── reports/                 # звіт, скріншоти, EXPLAIN до/після
└── prisma.config.ts
```

## Запуск

1. Встановити залежності:
   ```bash
   npm install
   ```
2. Створити базу даних `attendance` у PostgreSQL.
3. Скопіювати `.env.example` у `.env` і заповнити значення. Секрети згенерувати командою:
   ```bash
   node -p "require('node:crypto').randomBytes(32).toString('hex')"
   ```
4. Застосувати міграції та згенерувати клієнт Prisma:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. Створити першого адміністратора (реєстрація завжди створює роль `STUDENT`):
   ```bash
   npm run seed:admin
   ```
6. Запустити сервер:
   ```bash
   npm run dev      # з автоперезапуском (node --watch)
   npm start        # звичайний запуск
   ```

Сервер: `http://localhost:3000`. Перевірка: `GET /health` → `{"status":"ok","uptime":...}` (також `GET /api/health`). Документація API: `http://localhost:3000/api-docs`.

### Redis (необов'язково)

Без `REDIS_URL` застосунок працює в одно-процесному режимі: кеш у пам'яті, масові сповіщення надсилаються напряму без черги, адаптер Socket.io не підключається. Для перевірки рівня 3 локально:

```bash
docker run -d --name redis-lab -p 6379:6379 redis:7
```

і в `.env`: `REDIS_URL=redis://localhost:6379`.

### Корисні скрипти

| Команда | Призначення |
|---|---|
| `npm run seed:admin` | створити адміністратора |
| `npm run seed:load` | згенерувати великий набір даних для перевірки індексів (лише для локальної БД) |
| `npm run explain -- reports/explain-before.txt` | зберегти плани виконання `EXPLAIN ANALYZE` у файл |
| `node scripts/smoke.js` | швидка перевірка розгорнутого застосунку |

## Змінні середовища

| Змінна | Опис | Приклад |
|---|---|---|
| `PORT` | порт сервера | `3000` |
| `DATABASE_URL` | рядок підключення до PostgreSQL | `postgresql://postgres:pass@localhost:5432/attendance` |
| `JWT_SECRET` | секрет підпису access токена | випадковий рядок |
| `JWT_EXPIRES_IN` | час життя access токена | `15m` |
| `REFRESH_TOKEN_SECRET` | секрет підпису refresh токена | інший випадковий рядок |
| `REFRESH_TOKEN_EXPIRES_IN` | час життя refresh токена | `7d` |
| `UPLOAD_DIR` | папка для завантажених файлів | `uploads` |
| `MAX_FILE_SIZE` | максимальний розмір файлу, байт | `5242880` |
| `MAX_FILES` | максимум файлів в одному запиті (`/files/upload-multiple`) | `5` |
| `FRONTEND_URL` | дозволене джерело для CORS (HTTP і WebSocket) | `http://localhost:5173` |
| `REDIS_URL` | Redis для адаптера Socket.io, черги та кешу (необов'язково; для хмарного Redis схема `rediss://`) | `redis://localhost:6379` |
| `METRICS_TOKEN` | токен для `GET /metrics` (`Authorization: Bearer <token>`); якщо не задано, `/metrics` відкритий | випадковий рядок |
| `LOG_QUERIES` | журнал повільних SQL-запитів Prisma (на проді не вмикати) | `true` |
| `SLOW_QUERY_MS` | поріг «повільного» запиту, мс | `50` |
| `WS_RATE_LIMIT`, `WS_RATE_WINDOW_MS` | ліміт подій від одного сокета за вікно (за замовчуванням 30 подій за 10 000 мс) | `30`, `10000` |
| `RATE_LIMIT_MAX` | ліміт запитів з однієї IP за 15 хвилин | `100` |
| `AUTH_RATE_LIMIT_MAX` | ліміт НЕвдалих спроб на `/auth/login`, `/refresh`, `/change-password`, `/2fa/*` за 15 хвилин | `20` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | дані для `npm run seed:admin` | `admin@example.com` |

Файл `.env` не потрапляє в репозиторій.

## Аутентифікація та авторизація

- Пароль хешується через **Argon2id**. У базі зберігається лише хеш, у відповідях поле `password` не повертається.
- **Access токен** (JWT, за замовчуванням 15 хвилин) передається в заголовку `Authorization: Bearer <token>`. У payload лежать `userId` і `role`.
- **Refresh токен** (за замовчуванням 7 днів) зберігається в БД як SHA-256 хеш, тому його можна відкликати. При кожному `POST /api/auth/refresh` застосовується **ротація**: старий токен відкликається, видається нова пара. Якщо відкликаний токен пред'явити повторно, відкликаються всі токени користувача.
- `POST /api/auth/logout` відкликає refresh токен.
- Публічна реєстрація завжди створює роль `STUDENT`, поле `role` у запиті ігнорується. Адміністратора створює `npm run seed:admin`.

### Права доступу за ролями

| Ресурс | Читання | Створення / зміна / видалення |
|---|---|---|
| `/groups`, `/subjects` | будь-який авторизований | `ADMIN` |
| `/users` | `ADMIN`, `TEACHER` | `ADMIN` |
| `/lessons` | будь-який авторизований | `ADMIN`, `TEACHER` |
| `/attendance` | будь-який авторизований (`STUDENT` бачить лише свої записи) | `ADMIN`, `TEACHER` |
| `POST /attendance/:id/document` | | `STUDENT`, лише до власного запису |
| `/files` | авторизований | авторизований (видалення: власник або `ADMIN`) |
| `/audit-logs` | `ADMIN` | |

Без токена сервер повертає `401`, з токеном недостатньої ролі `403`.

## API

Базовий URL: `http://localhost:3000/api`. Формат даних: JSON. Усі маршрути, крім `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` і `/health`, вимагають токен.

### Автентифікація `/auth`

| Метод | URL | Опис | Тіло запиту |
|---|---|---|---|
| POST | `/auth/register` | реєстрація (роль `STUDENT`) | `{ "email", "password", "fullName", "groupId"? }` |
| POST | `/auth/login` | вхід, повертає `user` і `tokens` | `{ "email", "password", "code"? }` |
| POST | `/auth/refresh` | нова пара токенів (ротація) | `{ "refreshToken" }` |
| POST | `/auth/logout` | відкликання refresh токена | `{ "refreshToken" }` |
| POST | `/auth/change-password` | зміна пароля (потрібен токен) | `{ "currentPassword", "newPassword" }` |
| POST | `/auth/2fa/setup` | почати налаштування 2FA, повертає `secret` і `otpauthUrl` (потрібен токен) | |
| POST | `/auth/2fa/enable` | підтвердити кодом і ввімкнути 2FA (потрібен токен) | `{ "code" }` |
| POST | `/auth/2fa/disable` | вимкнути 2FA (потрібен токен) | `{ "password", "code" }` |

Пароль: від 8 до 128 символів.

**Двофакторна аутентифікація (TOTP).** Користувач викликає `/auth/2fa/setup`, додає отриманий `secret` у застосунок-автентифікатор і підтверджує кодом через `/auth/2fa/enable`. Після цього `/auth/login` вимагає поле `code` (6 цифр): без нього сервер повертає `401` із `twoFactorRequired: true`. Код дійсний 30 секунд, допускається зсув годинника на один крок. Для вимкнення потрібні і пароль, і код. Алгоритм (RFC 6238) реалізовано в `src/utils/totp.js` без зовнішніх залежностей. Секрет не повертається у відповідях API.

### Групи `/groups`, предмети `/subjects`

| Метод | URL | Опис | Тіло запиту |
|---|---|---|---|
| GET | `/groups`, `/subjects` | список із пагінацією | |
| GET | `/groups/:id`, `/subjects/:id` | один запис | |
| POST | `/groups`, `/subjects` | створити | `{ "name": "KN-21" }` |
| PUT | `/groups/:id`, `/subjects/:id` | оновити | `{ "name": "KN-22" }` |
| DELETE | `/groups/:id`, `/subjects/:id` | видалити | |

### Користувачі `/users`

| Метод | URL | Опис |
|---|---|---|
| GET | `/users` | список із пагінацією |
| GET | `/users/:id` | користувач разом з групою |
| POST | `/users` | створити користувача (будь-яка роль) |
| PUT | `/users/:id` | оновити (усі поля необов'язкові) |
| DELETE | `/users/:id` | видалити |

Тіло POST: `email`, `password` (мін. 8 символів), `fullName`, `role` (`ADMIN`/`TEACHER`/`STUDENT`, необов'язково), `groupId` (необов'язково).

### Пари `/lessons`

| Метод | URL | Опис |
|---|---|---|
| GET | `/lessons` | список із пагінацією, пошуком і фільтрами |
| GET | `/lessons/:id` | пара з відмітками відвідуваності |
| POST | `/lessons` | створити пару |
| PUT | `/lessons/:id` | оновити пару |
| DELETE | `/lessons/:id` | видалити пару (відмітки видаляються каскадно) |

Тіло POST: `date` (ISO 8601, наприклад `2026-10-30T09:00:00Z`), `topic` (необов'язково), `subjectId`, `groupId`, `teacherId`.

### Відвідуваність `/attendance`

| Метод | URL | Опис |
|---|---|---|
| GET | `/attendance` | список відміток із пагінацією, пошуком і фільтрами |
| GET | `/attendance/:id` | одна відмітка |
| POST | `/attendance` | створити відмітку |
| PUT | `/attendance/:id` | змінити статус або коментар |
| DELETE | `/attendance/:id` | видалити відмітку |
| POST | `/attendance/:id/document` | студент прикріплює довідку (`multipart/form-data`, поле `file`) |

Тіло POST: `lessonId`, `studentId`, `status` (`PRESENT`/`ABSENT`/`LATE`/`EXCUSED`, за замовчуванням `PRESENT`), `comment` (до 500 символів). Пара `(lessonId, studentId)` унікальна. До одного запису можна прикріпити лише одну довідку (повторно: `409`).

### Файли `/files`

| Метод | URL | Опис |
|---|---|---|
| POST | `/files/upload` | завантажити файл (`multipart/form-data`, поле `file`) |
| GET | `/files/:id` | отримати файл |
| POST | `/files/upload-multiple` | завантажити кілька файлів (`multipart/form-data`, поле `files`, до `MAX_FILES`) |
| PUT | `/files/:id` | оновити файл: замінити вміст (поле `file`) і/або змінити ім'я (`originalName`); власник або `ADMIN` |
| DELETE | `/files/:id` | видалити файл (власник або `ADMIN`) |

Файловий сервіс перевіряє MIME-тип і розширення разом (білий список), обмежує розмір (`MAX_FILE_SIZE`, за замовчуванням 5 МБ) і кількість файлів у запиті (`/files/upload`: 1, `/files/upload-multiple`: до `MAX_FILES`, за замовчуванням 5). Пакет завантажується за принципом «усе або нічого»: якщо хоч один файл недопустимий або запис у БД не вдався, жоден файл не зберігається. Файл зберігається на диску під згенерованим іменем, оригінальне ім'я лише записується в БД. Якщо запис у БД не вдався, файл з диска прибирається.

### Журнал дій `/audit-logs`

Лише для `ADMIN`. Підтримує пагінацію, сортування (`sortBy`: `id`, `createdAt`, `action`; за замовчуванням нові записи першими) і фільтри `userId`, `action`, `entity`, `dateFrom`, `dateTo`.

| Дія (`action`) | Коли записується |
|---|---|
| `USER_REGISTERED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT` | реєстрація, вхід, невдалий вхід, вихід |
| `LOGIN_2FA_FAILED`, `TWO_FACTOR_ENABLED`, `TWO_FACTOR_DISABLED` | події двофакторної аутентифікації |
| `PASSWORD_CHANGED`, `PASSWORD_CHANGE_FAILED` | зміна пароля та невдала спроба |
| `REFRESH_TOKEN_REUSE` | повторне використання відкликаного refresh токена (ознака викрадення) |
| `FILE_UPLOADED`, `FILES_UPLOADED`, `FILE_UPDATED`, `FILE_DELETED` | операції з файлами |
| `ATTENDANCE_CREATED`, `ATTENDANCE_UPDATED`, `ATTENDANCE_DELETED`, `DOCUMENT_ATTACHED` | зміни відвідуваності та довідок |

Кожен запис містить користувача, IP-адресу, сутність і дату. Паролі та токени в журнал не потрапляють. Збій запису в журнал не ламає основний запит.

### Сповіщення `/notifications`

Доступні будь-якому авторизованому користувачу, кожен бачить лише свої сповіщення.

| Метод | URL | Опис |
|---|---|---|
| GET | `/notifications` | список із пагінацією |
| PATCH | `/notifications/:id/read` | позначити прочитаним |
| PATCH | `/notifications/read-all` | позначити всі прочитаними |
| DELETE | `/notifications/:id` | видалити |

Типи (`type`): `ATTENDANCE`, `LESSON`, `SYSTEM`. Пріоритети (`priority`): `LOW`, `NORMAL`, `HIGH`. Сповіщення створюються автоматично: студент отримує його, коли відмітку відвідуваності створено або змінено (для статусу `ABSENT` пріоритет `HIGH`), а всі студенти групи, коли пару створено, змінено або скасовано. Новe сповіщення одразу надходить подією `notification` у WebSocket.

### Звіти `/reports`

| Метод | URL | Опис | Доступ |
|---|---|---|---|
| GET | `/reports/attendance-summary?groupId=&dateFrom=&dateTo=` | зведення відвідуваності студентів групи: `total`, `present`, `absent`, `late`, `excused`, `attendancePercent` | `ADMIN`, `TEACHER` |

Реалізовано одним SQL-запитом (`LEFT JOIN` + `COUNT(*) FILTER`), параметри передаються безпечно, без конкатенації рядків.

### Службові маршрути

| Метод | URL | Опис |
|---|---|---|
| GET | `/health` | стан сервера та БД (`503`, якщо БД недоступна) |
| GET | `/metrics` | метрики Prometheus (захищено `METRICS_TOKEN`) |

## Пагінація, пошук, фільтрація, сортування

Списки повертають відповідь у форматі:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5, "hasMore": true }
}
```

Спільні параметри query:

| Параметр | Опис |
|---|---|
| `page` | номер сторінки, від 1 (за замовчуванням 1) |
| `limit` | елементів на сторінці, 1–100 (за замовчуванням 10) |
| `search` | пошук без урахування регістру (тема пари, ім'я студента, назва тощо) |
| `sortBy`, `order` | поле з білого списку та `asc`/`desc` |

Додаткові фільтри:

| Ресурс | Фільтри | Поля для `sortBy` |
|---|---|---|
| `/lessons` | `subjectId`, `groupId`, `teacherId`, `dateFrom`, `dateTo` | `id`, `date`, `topic` |
| `/attendance` | `lessonId`, `studentId`, `status`, `dateFrom`, `dateTo`, `search` (ім'я студента) | `id`, `status` |
| `/subjects` | `search` | `id`, `name` |

Некоректні значення фільтрів повертають `400`. Дата без часу в `dateTo` включає весь день.

## Реальний час (WebSocket)

Повна документація подій, кімнат, payload і помилок: [`docs/websocket-api.md`](docs/websocket-api.md).

Коротко:

- підключення: `io(API_URL, { auth: { token: accessToken } })`; без дійсного токена з'єднання відхиляється (`unauthorized`);
- кімнати: `user:<id>` (персональна), `group:<id>`, `staff` (`ADMIN` і `TEACHER`) підключаються автоматично, `lesson:<id>` через подію `room:join` з перевіркою прав;
- події: `attendance:*`, `lesson:*`, `group:*`, `subject:*`, `notification`, `presence:update`;
- кожна подія з журналу приходить із порядковим номером `seq`; після перепідключення клієнт передає `lastSeq` в `events:since` і отримує пропущене (або `gap: true`, якщо потрібно перезавантажити стан через REST);
- коли access токен спливає, сервер надсилає `auth:expired` і розриває з'єднання; клієнт оновлює токен через `/auth/refresh` і підключається знову;
- помилки обробників повертаються через ack (`{ ok: false, error }`) або подією `app:error`; ліміт: 30 подій за 10 с на сокет.

## Оптимізація бази даних

- індекси (`@@index` у `schema.prisma`) додано лише під реальні запити, перевірені через `EXPLAIN ANALYZE` (Seq Scan замінено на Index Scan); плани до та після збережено в `reports/explain-before.txt` і `reports/explain-after.txt`;
- N+1 усунено через `include` / `select`, списки мають пагінацію;
- рідко змінювані дані (списки груп і предметів) кешуються з інвалідацією при змінах; кеш у Redis, а без `REDIS_URL` у пам'яті процесу;
- складний звіт відвідуваності виконується одним raw SQL запитом;
- повільні запити видно в журналі при `LOG_QUERIES=true` (поріг `SLOW_QUERY_MS`).

## Моніторинг і журналювання

- `GET /metrics`: метрики Node.js, тривалість HTTP-запитів (за методом, маршрутом і статусом), кількість WebSocket-з'єднань, влучання та промахи кешу;
- запити та помилки журналюються через `pino` / `pino-http`.

## Розгортання та обмеження

Застосунок розгорнуто на **Render** (регіон Frankfurt, тариф Free):

- **Root Directory**: `lab-03`;
- **Build Command**: `npm ci && npx prisma generate && npx prisma migrate deploy`;
- **Start Command**: `npm start`;
- **Health Check Path**: `/health`;
- змінні середовища: `NODE_VERSION=24`, `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `FRONTEND_URL`, `REDIS_URL`, `METRICS_TOKEN` та інші з таблиці вище;
- PostgreSQL: **Neon** (Frankfurt); Redis: **Upstash** (Frankfurt, безкоштовний тариф).

Міграції застосовуються автоматично під час збірки (`prisma migrate deploy`). Після зміни схеми локально: `npx prisma migrate dev` і `npx prisma generate`.

### Обмеження безкоштовних тарифів

- **«Засинання».** Render Free зупиняє сервіс після періоду без запитів, перший запит після цього виконується повільно (десятки секунд), а відкриті WebSocket-з'єднання розриваються. Клієнт має перепідключатися і запитувати пропущені події (`events:since`).
- **Завантажені файли (довідки).** Файлова система Render Free тимчасова: файли в `uploads/` зникають після перезапуску або нового деплою. Метадані файлів у БД зберігаються, але самі файли можуть стати недоступними. Для продакшну файли слід зберігати у зовнішньому сховищі (наприклад, S3-сумісному), змінивши лише шар збереження файлів. У межах цієї лабораторної роботи обрано рішення описати обмеження, а не підключати окреме сховище.
- **Upstash Free.** Ліміт 500 тисяч команд на місяць. Якщо його вичерпано, достатньо прибрати `REDIS_URL`: застосунок перейде на кеш у пам'яті та пряму розсилку сповіщень.
- **Neon Free.** Обмежені обсяг сховища і час обчислень; база може «прокидатися» із затримкою.
- **Автомасштабування.** Render Free не підтримує горизонтальне масштабування. Застосунок до нього підготовлений: стан розсилки подій винесено в Redis (адаптер Socket.io), кеш і черга спільні для інстансів, а автентифікація не залежить від локального стану процесу. На платному тарифі достатньо ввімкнути автомасштабування за навантаженням; працездатність кількох інстансів перевірено локально (два процеси на портах 3000 і 3001 з одним Redis).

## Приклади

### Вхід

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@example.com", "password": "admin12345" }
```

Відповідь `200 OK`:

```json
{
  "message": "Успішний вхід",
  "user": { "id": 1, "email": "admin@example.com", "fullName": "Administrator", "role": "ADMIN" },
  "tokens": { "accessToken": "<jwt>", "refreshToken": "<jwt>" }
}
```

### Захищений запит

```http
GET /api/attendance?status=ABSENT&dateFrom=2026-10-01&page=1&limit=20
Authorization: Bearer <accessToken>
```

### Відмова за роллю

```http
POST /api/groups
Authorization: Bearer <токен студента>
```

Відповідь `403 Forbidden`:

```json
{ "error": "Недостатньо прав для виконання цієї операції" }
```

Більше прикладів у `requests.http` і в Swagger (`/api-docs`).

## Обробка помилок

Усі помилки повертаються у форматі JSON з полем `error`.

| Код | Коли |
|---|---|
| 400 | помилка валідації, некоректний id або фільтр, непідтримуваний тип або завеликий файл, некоректний JSON |
| 401 | немає токена, токен недійсний або прострочений, хибний email чи пароль, недійсний refresh токен, потрібен або невірний код 2FA (`twoFactorRequired: true`) |
| 403 | недостатньо прав для ролі або чужий ресурс |
| 404 | запис або маршрут не знайдено |
| 409 | порушення унікальності (дублікат), довідка вже прикріплена |
| 429 | перевищено ліміт запитів |
| 500 | внутрішня помилка сервера |

## Безпека

- паролі: Argon2id; повідомлення про помилку входу однакове для хибного email і хибного пароля
- refresh токени зберігаються лише як хеш, ротація та відкликання
- двофакторна аутентифікація (TOTP); вимкнення вимагає пароль і код
- журнал дій користувачів, окремо фіксуються невдалі входи та повторне використання відкликаного токена
- `helmet` (безпечні HTTP-заголовки), CORS з білим списком джерела, rate limiting на `/api/` та окремий суворіший ліміт невдалих спроб на auth-маршрутах (захист від підбору паролів і кодів 2FA)
- валідація вхідних даних через zod, білі списки для полів сортування, обмеження `limit`
- WebSocket: JWT при підключенні, перевірка прав на кімнати, ліміт частоти подій, перевірка існування користувача, примусове розірвання з'єднання при спливанні токена
- `/metrics` закрито токеном (`METRICS_TOKEN`)
- ORM Prisma (параметризовані запити, у raw SQL значення передаються параметрами), секрети лише в `.env` (локально) і в змінних середовища Render

## Тестування

```bash
npm test
```

Використовується вбудований тестовий раннер Node.js (`node:test`) і `supertest`. Тести працюють із реальною БД, тому бажано мати окрему тестову базу. Тести охоплюють автентифікацію, файли, ролі, пагінацію, пошук, сортування, журнал дій, 2FA, а також WebSocket (відхилення без токена, кімнати та права, події відвідуваності й занять, сповіщення, онлайн-статус, відновлення пропущених подій), сповіщення та звіт. У тестах Redis вимкнено (`REDIS_URL` скидається в `tests/setup.js`). Разом 64 тести. Ручні запити: `requests.http`. Скріншоти: папка `reports/`.
