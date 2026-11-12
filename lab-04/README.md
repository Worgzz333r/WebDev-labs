# WebDev Client (lab-04)

## Опис проєкту
Клієнтська частина (React) для серверної системи з лабораторних робіт 1-3. На цьому етапі: каркас проєкту, інструменти розробки, базові UI-компоненти, маршрутизація, Axios, темна тема.

## Технології
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router 8
- Axios
- ESLint + Prettier

## Встановлення та запуск

### Вимоги
- Node.js 24 LTS
- npm

### Інструкції
```bash
git clone https://github.com/Worgzz333r/WebDev-labs.git
cd WebDev-labs/lab-04
npm install
cp .env.example .env
npm run dev
npm run build
```

## Структура проєкту
```
src/
├── components/
│   ├── common/      # Button, Input, Card, Badge, Loading, ErrorBoundary
│   └── layout/      # Header, Footer, Layout
├── pages/           # HomePage, AboutPage, NotFoundPage
├── services/        # Axios (api.ts) з interceptors
├── types/           # Типи відповідей API
├── utils/           # Функції форматування
├── hooks/           # useTheme
└── constants/       # Константи застосунку
```

## Скріншоти
![Головна, світла тема](docs/home-light.png)
![Головна, темна тема](docs/home-dark.png)

## Автор
[Ім'я, група]