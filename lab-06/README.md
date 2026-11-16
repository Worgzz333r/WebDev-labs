# Лабораторна робота 06 — Розширені можливості та розгортання клієнта

Клієнт на React (основа — lab-05) для системи обліку відвідуваності. Сервер — [lab-03](../lab-03/README.md).

## Статус виконання

- [x] **Рівень 1** (завдання 1–7)
- [ ] Рівень 2 (завдання 8–14)
- [ ] Рівень 3 (завдання 15–22)

## Рівень 1: що реалізовано

| № | Завдання | Де |
|---|----------|----|
| 1 | Socket.io-client | `src/services/socket.ts`, `hooks/useSocketConnection.ts`, `hooks/useSocketEvent.ts` |
| 2 | Сповіщення в реальному часі | `components/NotificationBell.tsx`, `stores/notificationsStore.ts` |
| 3 | Онлайн-статус | `components/OnlineStatus.tsx`, `stores/presenceStore.ts` (колонка «Статус» у «Користувачі» та індикатор у шапці) |
| 4 | Списки в реальному часі | `hooks/useRealtimeSync.ts`: події `group/subject/lesson/attendance:*` → `invalidateQueries` |
| 5 | Модальні вікна | `components/common/Modal.tsx`, `ConfirmDialog.tsx` (Headless UI Dialog) |
| 6 | Таби | `components/common/Tabs.tsx` (використано на Dashboard) |
| 7 | Випадне меню з пошуком | `components/common/SearchableSelect.tsx` (фільтр груп у «Користувачі») |

З'єднання одне на весь застосунок (`Layout`), токен передається під час підключення, кожен компонент знімає лише власний обробник.

## Запуск

```bash
npm install
cp .env.example .env   # VITE_API_URL та VITE_SOCKET_URL (без /api)
npm run dev
```

Для роботи сповіщень, онлайн-статусу й живих списків має працювати сервер з lab-03.

## Автор
Назар, ІПЗ-42.
