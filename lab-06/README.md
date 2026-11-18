# Лабораторна робота 06 — Розширені можливості та розгортання клієнта

Клієнт на React для системи обліку відвідуваності «Student Attendance Tracking System»: групи, предмети, розклад занять, позначки присутності та фото-документи до них. Серверна частина — [lab-03](../lab-03/README.md) (Express + Prisma + Socket.io).

## Статус виконання

- [x] **Рівень 1** (завдання 1–7) — real-time, сповіщення, онлайн-статус, модалки, таби, dropdown
- [x] **Рівень 2** (завдання 8–14) — dnd, графіки, infinite scroll, зображення з crop, календар, rich text, анімації
- [x] **Рівень 3** (завдання 15–22) — code splitting, PWA, кешування, SEO, тести, CI/CD, розгортання

## ✨ Функціональність

- React 19 + TypeScript + Vite, Tailwind CSS 4 (світла/темна тема)
- Аутентифікація (JWT з refresh), захищені маршрути, ролі ADMIN/TEACHER/STUDENT
- CRUD для груп, предметів, занять, користувачів; відвідуваність з фото-документами
- Real-time (Socket.io): сповіщення-дзвіночок, онлайн-статуси, автооновлення списків
- Drag and drop карток на панелі (dnd-kit, з клавіатурною підтримкою), графіки (Recharts)
- Нескінченне прокручування списку користувачів (useInfiniteQuery + IntersectionObserver)
- Завантаження зображень з попереднім переглядом і обрізанням (react-easy-crop)
- Календар вибору дати (react-day-picker, uk-локаль), rich-тема заняття (Tiptap + DOMPurify)
- Анімації переходів сторінок (Motion)
- PWA: офлайн-режим, установка на головний екран
- Тести компонентів (Vitest + Testing Library), CI/CD (GitHub Actions → Vercel)

## 🛠 Технології

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · TanStack Query 5 (з персистенцією кешу) · Zustand · Socket.io-client · React Hook Form + Zod · Headless UI · dnd-kit · Recharts · Tiptap · react-day-picker · react-easy-crop · Motion · DOMPurify · Vitest · vite-plugin-pwa

## 📦 Встановлення та запуск

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api, VITE_SOCKET_URL=http://localhost:3000
npm run dev            # http://localhost:5173
```

Для сповіщень, онлайн-статусів і живих списків має працювати сервер [lab-03](../lab-03/README.md).

```bash
npm test      # модульні тести (Vitest)
npm run build # збірка + stats.html (карта бандла, у .gitignore)
npm run preview
```

## 📁 Структура

```
src/
├── components/
│   ├── common/        # Button, Modal, ConfirmDialog, Tabs, SearchableSelect, Table,
│   │                  # Skeleton, Loading, DatePickerField, RichTextEditor, StatsChart,
│   │                  # PageTransition, AuthImage, Sortable helpers…
│   ├── attendance/    # AttendancePanel, CropUploadDialog
│   ├── dashboard/     # StatsSection (lazy, Recharts)
│   └── layout/        # Header, Sidebar, Footer, Layout
├── pages/             # групи/предмети/заняття/користувачі (список, деталі, форма)
├── services/          # api, socket, groups, subjects, lessons, users, attendance, files, reports
├── stores/            # authStore, notificationsStore, presenceStore
├── hooks/             # useSocketConnection, useSocketEvent, useRealtimeSync, useLookups, useDebounce, useTheme
├── schemas/           # Zod-схеми форм
└── test/              # setup.ts для Vitest
```

## 🚀 Розгортання (Vercel) і CI/CD

1. Зареєструватися на vercel.com через GitHub, «Add New… → Project» → обрати репозиторій (Vercel сам розпізнає Vite: `npm run build`, каталог `dist`).
2. У Environment Variables задати `VITE_API_URL` та `VITE_SOCKET_URL` (адреси розгорнутого сервера lab-03); після першого деплою скопіювати адресу клієнта в `FRONTEND_URL` сервера і перезапустити його.
3. `vercel.json` містить SPA-rewrite усіх шляхів на `/index.html` — без нього пряме відкриття `/users` дало б 404. Змінні `VITE_*` підставляються під час збірки, тому після їх зміни потрібне повторне розгортання.
4. CI/CD — `.github/workflows/deploy.yml`: на кожен push/PR у `main` виконуються лінтинг, тести та збірка; деплой на Vercel через CLI виконується лише з `main` і лише після успішних перевірок. Для нього в GitHub → Settings → Secrets and variables → Actions додати `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (ORG/PROJECT ID — з файлу `.vercel/project.json` після `npx vercel link`). Щоб не було подвійних деплоїв, вимкнути автодеплой Vercel (Settings → Git) або залишити одну зі схем.

## 🧪 Тестування

```bash
npm test
```

- `NotificationBell.test.tsx` — real-time сповіщення: подія збільшує лічильник непрочитаних, клік позначає прочитаним; при розмонтуванні знімається власний обробник сокета (життєвий цикл підписок)
- `ConfirmDialog.test.tsx` — модальне підтвердження: заголовок/текст, onConfirm, «Скасувати» та закриття клавішею Escape

## 📊 Продуктивність

- Кожна сторінка — окремий lazy-чанк; важкі бібліотеки виношені з початкового завантаження: Recharts (384 кБ / 110 кБ gzip) — тільки в чанку «Статистики», Tiptap (404 кБ / 128 кБ gzip) — тільки у формі заняття
- Початкове завантаження: основний чанк 559 кБ (177 кБ gzip) + чанки першого екрана
- Кеш запитів: staleTime 60 с, gcTime 10 хв; довідкові дані (групи, предмети) персистуються в localStorage, персональні — ні (безпека після logout, `queryClient.clear()`)
- PWA: service worker пре-кешує обволонку (53 записи), API — NetworkFirst з expires 5 хв; перевірка офлайн — `npm run build && npm run preview`, DevTools → Application → Service Workers, вкладка Network → Offline
- Метрики Lighthouse/PageSpeed на розгорнутій версії заповнити після деплою

## 🔐 Безпека

- JWT у `Authorization`/`auth.token`, виходу скидає і кеш запитів
- Персональні дані не персистуються в localStorage
- HTML з редактора санітизується DOMPurify перед рендером
- Зображення віддаються лише авторизованим запитом (blob + object URL)

## 👨‍💻 Автор

Назар, ІПЗ-42.
