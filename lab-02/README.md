# Система обліку відвідуваності студентів (Backend API)

Лабораторна робота №1: backend на Node.js + Express.js + PostgreSQL (Prisma ORM).

## Стек

- Node.js, Express 5
- PostgreSQL 18
- Prisma ORM 7
- zod (валідація), bcrypt (хешування паролів), dotenv, cors

## Структура проєкту

```
lab-01/
├── prisma/
│   ├── schema.prisma        # схема БД
│   └── migrations/          # міграції
├── src/
│   ├── app.js               # точка входу
│   ├── controllers/         # логіка обробки запитів
│   ├── routes/              # маршрути
│   └── utils/               # prisma-клієнт, валідація, обробник помилок
├── reports/                 # звіт
├── prisma.config.ts
└── .env                     # змінні середовища (не в git)
```

## Запуск

1. Встановити залежності:
   ```bash
   npm install
   ```
2. Створити базу даних `attendance` у PostgreSQL.
3. Створити файл `.env` у корені `lab-01`:
   ```
   PORT=3000
   DATABASE_URL="postgresql://postgres:<пароль>@localhost:5432/attendance"
   ```
4. Застосувати міграції:
   ```bash
   npx prisma migrate dev
   ```
5. Запустити сервер:
   ```bash
   npm run dev      # з автоперезапуском (nodemon)
   npm start        # звичайний запуск
   ```

Сервер буде доступний на `http://localhost:3000`. Перевірка: `GET /api/health` → `{"status":"ok"}`.

## Змінні середовища

| Змінна | Опис | Приклад |
|---|---|---|
| `PORT` | порт Express-сервера | `3000` |
| `DATABASE_URL` | рядок підключення до PostgreSQL | `postgresql://postgres:pass@localhost:5432/attendance` |

## Модель даних

| Таблиця | Опис |
|---|---|
| `Group` | навчальна група (наприклад, КН-21) |
| `User` | користувач з роллю `ADMIN`, `TEACHER` або `STUDENT` |
| `Subject` | навчальний предмет |
| `TeacherSubject` | зв'язок викладач ↔ предмет (M:N) |
| `Lesson` | пара: предмет, група, викладач, дата, тема |
| `Attendance` | відмітка студента на парі: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` |
| `Document` | довідка до відмітки (1:1 з `Attendance`) |

Зв'язки:

- `Group` 1:N `User` (студенти групи)
- `Subject` 1:N `Lesson`, `Group` 1:N `Lesson`, `User` (викладач) 1:N `Lesson`
- `Lesson` 1:N `Attendance`, `User` (студент) 1:N `Attendance`
- `User` (викладач) M:N `Subject` через `TeacherSubject`
- `Attendance` 1:1 `Document`
- унікальна пара `(lessonId, studentId)`: студента не можна відмітити на одній парі двічі

## API

Базовий URL: `http://localhost:3000/api`. Формат даних: JSON.

### Групи `/groups`

| Метод | URL | Опис | Тіло запиту |
|---|---|---|---|
| GET | `/groups` | список груп (з кількістю студентів) | |
| GET | `/groups/:id` | група зі списком студентів | |
| POST | `/groups` | створити групу | `{ "name": "KN-21" }` |
| PUT | `/groups/:id` | оновити групу | `{ "name": "KN-22" }` |
| DELETE | `/groups/:id` | видалити групу | |

### Предмети `/subjects`

| Метод | URL | Опис | Тіло запиту |
|---|---|---|---|
| GET | `/subjects` | список предметів (з кількістю пар) | |
| GET | `/subjects/:id` | один предмет | |
| POST | `/subjects` | створити предмет | `{ "name": "Web Development" }` |
| PUT | `/subjects/:id` | оновити предмет | `{ "name": "Databases" }` |
| DELETE | `/subjects/:id` | видалити предмет | |

### Користувачі `/users`

Поле `password` у відповідях ніколи не повертається. У базі зберігається bcrypt-хеш.

| Метод | URL | Опис |
|---|---|---|
| GET | `/users` | список користувачів |
| GET | `/users/:id` | користувач разом з групою |
| POST | `/users` | створити користувача |
| PUT | `/users/:id` | оновити (усі поля необов'язкові) |
| DELETE | `/users/:id` | видалити |

Тіло POST:

| Поле | Тип | Обов'язкове | Правило |
|---|---|---|---|
| `email` | string | так | коректна пошта, унікальна |
| `password` | string | так | мінімум 6 символів |
| `fullName` | string | так | не порожнє |
| `role` | string | ні | `ADMIN`, `TEACHER`, `STUDENT` (за замовчуванням `STUDENT`) |
| `groupId` | number | ні | id існуючої групи |

### Пари `/lessons`

| Метод | URL | Опис |
|---|---|---|
| GET | `/lessons` | список пар. Фільтри: `?groupId=2&subjectId=1` |
| GET | `/lessons/:id` | пара з відмітками відвідуваності |
| POST | `/lessons` | створити пару |
| PUT | `/lessons/:id` | оновити пару |
| DELETE | `/lessons/:id` | видалити пару (відмітки видаляються каскадно) |

Тіло POST:

| Поле | Тип | Обов'язкове | Правило |
|---|---|---|---|
| `date` | string | так | ISO 8601, наприклад `2026-10-30T09:00:00Z` |
| `topic` | string | ні | тема пари |
| `subjectId` | number | так | id предмета |
| `groupId` | number | так | id групи |
| `teacherId` | number | так | id викладача |

### Відвідуваність `/attendance`

| Метод | URL | Опис |
|---|---|---|
| GET | `/attendance` | список відміток. Фільтри: `?lessonId=1&studentId=2` |
| GET | `/attendance/:id` | одна відмітка |
| POST | `/attendance` | створити відмітку |
| PUT | `/attendance/:id` | змінити статус або коментар |
| DELETE | `/attendance/:id` | видалити відмітку |

Тіло POST:

| Поле | Тип | Обов'язкове | Правило |
|---|---|---|---|
| `lessonId` | number | так | id пари |
| `studentId` | number | так | id студента |
| `status` | string | ні | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` (за замовчуванням `PRESENT`) |
| `comment` | string | ні | до 500 символів |

## Приклади

### Створення групи

```http
POST /api/groups
Content-Type: application/json

{ "name": "KN-21" }
```

Відповідь `201 Created`:

```json
{ "id": 1, "name": "KN-21" }
```

### Створення студента

```http
POST /api/users
Content-Type: application/json

{
  "email": "ivan@test.com",
  "password": "secret123",
  "fullName": "Ivan Petrenko",
  "role": "STUDENT",
  "groupId": 1
}
```

Відповідь `201 Created`:

```json
{
  "id": 2,
  "email": "ivan@test.com",
  "fullName": "Ivan Petrenko",
  "role": "STUDENT",
  "groupId": 1,
  "createdAt": "2026-10-29T13:38:49.815Z"
}
```

### Відмітка відвідуваності

```http
POST /api/attendance
Content-Type: application/json

{ "lessonId": 1, "studentId": 2, "status": "LATE", "comment": "Запізнився на 10 хв" }
```

## Обробка помилок

Усі помилки повертаються у форматі JSON з полем `error`.

| Код | Коли | Приклад відповіді |
|---|---|---|
| 400 | помилка валідації тіла запиту | `{ "error": "Validation failed", "details": [{ "field": "email", "message": "Invalid email" }] }` |
| 400 | некоректний id в URL | `{ "error": "Invalid id" }` |
| 400 | пов'язаного запису не існує (зовнішній ключ) | `{ "error": "Related record does not exist" }` |
| 400 | некоректний JSON | `{ "error": "Invalid JSON" }` |
| 404 | запис або маршрут не знайдено | `{ "error": "Record not found" }` / `{ "error": "Route not found" }` |
| 409 | порушення унікальності (дублікат) | `{ "error": "Already exists: ..." }` |
| 500 | внутрішня помилка сервера | `{ "error": "Internal server error" }` |

## Тестування

Усі ендпоінти перевірялися через PowerShell (`Invoke-RestMethod`) і Postman. Скріншоти знаходяться у папці `reports/`.
