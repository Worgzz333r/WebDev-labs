import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Система обліку відвідуваності студентів API',
      version: '2.0.0',
      description: `
API для обліку відвідуваності.

## Реальний час (WebSocket / Socket.io)

З'єднання встановлюється за тим самим хостом/портом. Автентифікація відбувається під час ініціалізації: клієнт має передати JWT у властивості \`auth.token\`.

### Кімнати (Rooms)
Користувачі автоматично приєднуються до:
- \`user:<id>\` — персональні сповіщення.
- \`group:<id>\` — події своєї групи (для студентів).
- \`staff\` — для викладачів та адміністраторів.

Для приєднання до подій конкретного заняття використовуйте подію \`room:join\` з аргументом \`lesson:<id>\`.

### Події від клієнта (Client-to-Server)
Усі події підтримують підтвердження (Acknowledgements).
- \`room:join\` (payload: string) — приєднатися до кімнати.
- \`room:leave\` (payload: string) — покинути кімнату.
- \`presence:list\` — отримати список користувачів онлайн.
- \`events:since\` (payload: number) — запит пропущених подій після перепідключення (передається останній \`seq\`).

### Події від сервера (Server-to-Client)
- \`attendance:created\` / \`updated\` / \`deleted\`
- \`lesson:created\` / \`updated\` / \`deleted\`
- \`notification\` — нове сповіщення.
- \`presence:update\` — зміна онлайн-статусу користувача.
- \`auth:expired\` — токен недійсний, потрібно оновити через REST та перепідключитися.
      `,
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      responses: {
        BadRequest: {
          description: 'Помилка валідації або некоректний id',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Токен відсутній, недійсний або прострочений',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Недостатньо прав',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Не знайдено',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', example: 'student@example.com' },
            fullName: { type: 'string', example: 'Іван Студент' },
            role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
            groupId: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        Group: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'ІПЗ-32' },
          },
        },
        NameInput: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string', maxLength: 100, example: 'ІПЗ-32' } },
        },
        Subject: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Бази даних' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 25 },
            totalPages: { type: 'integer', example: 3 },
            hasMore: { type: 'boolean', example: true },
          },
        },
        UserCreate: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'teacher@example.com' },
            password: { type: 'string', minLength: 8, example: 'password123' },
            fullName: { type: 'string', example: 'Петро Викладач' },
            role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'], example: 'TEACHER' },
            groupId: { type: 'integer', example: 1 },
          },
        },
        UserUpdate: {
          type: 'object',
          description: 'Усі поля необов’язкові; password змінюється лише якщо переданий',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
            groupId: { type: 'integer' },
          },
        },
        Lesson: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            date: { type: 'string', format: 'date-time', example: '2026-10-30T09:00:00Z' },
            topic: { type: 'string', nullable: true, example: 'Вступ до SQL' },
            subjectId: { type: 'integer', example: 1 },
            groupId: { type: 'integer', example: 1 },
            teacherId: { type: 'integer', example: 2 },
            subject: { $ref: '#/components/schemas/Subject' },
            group: { $ref: '#/components/schemas/Group' },
            teacher: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                fullName: { type: 'string' },
              },
            },
          },
        },
        LessonCreate: {
          type: 'object',
          required: ['date', 'subjectId', 'groupId', 'teacherId'],
          properties: {
            date: { type: 'string', format: 'date-time', example: '2026-10-30T09:00:00Z' },
            topic: { type: 'string', example: 'Вступ до SQL' },
            subjectId: { type: 'integer', example: 1 },
            groupId: { type: 'integer', example: 1 },
            teacherId: { type: 'integer', example: 2 },
          },
        },
        LessonUpdate: {
          type: 'object',
          description: 'Усі поля необов’язкові',
          properties: {
            date: { type: 'string', format: 'date-time' },
            topic: { type: 'string' },
            subjectId: { type: 'integer' },
            groupId: { type: 'integer' },
            teacherId: { type: 'integer' },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], example: 'ABSENT' },
            comment: { type: 'string', nullable: true, example: 'Захворів' },
            lessonId: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 3 },
            student: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                fullName: { type: 'string' },
              },
            },
            document: { type: 'object', nullable: true, description: 'Довідка, якщо прикріплена' },
          },
        },
        AttendanceCreate: {
          type: 'object',
          required: ['lessonId', 'studentId'],
          properties: {
            lessonId: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 3 },
            status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], default: 'PRESENT' },
            comment: { type: 'string', maxLength: 500, example: 'Захворів' },
          },
        },
        AttendanceUpdate: {
          type: 'object',
          description: 'Змінюються лише status і comment',
          properties: {
            status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] },
            comment: { type: 'string', maxLength: 500 },
          },
        },
      },
      parameters: {
        Page: {
          in: 'query', name: 'page',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Номер сторінки',
        },
        Limit: {
          in: 'query', name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          description: 'Кількість записів на сторінці',
        },
        Order: {
          in: 'query', name: 'order',
          schema: { type: 'string', enum: ['asc', 'desc'] },
          description: 'Напрямок сортування',
        },
        SortBy: {
          in: 'query', name: 'sortBy',
          schema: { type: 'string' },
          description: 'Поле сортування (допустимі значення залежать від ресурсу)',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export default swaggerJsdoc(options);