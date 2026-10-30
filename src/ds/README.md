# src/ds — внутренняя дизайн-система ITSalt

- Источник: внутренняя дизайн-система ITSalt (токены Tailwind v4, шрифты, UI-примитивы с тестами).
- Изменено: убраны продуктовые стили и брендовые комментарии; `page-header` без router (хлебных крошек нет); импорты — относительные внутри `src/ds/`; тесты `*.test.tsx` подключены через `components.test.ts` (в `vitest.config.ts` включены только `*.test.ts`).
- Подключение: `@import "./ds/styles.css";` в `src/index.css` (нужны `tailwindcss` и `@tailwindcss/vite` в `vite.config.ts`); шрифты отдаются из `public/fonts/`.
- Компоненты: `import { Button } from './ds/components/button'`, утилиты — `./ds/lib/*`.
- Зависимости: `tailwindcss`, `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@tanstack/react-table`; для тестов — `@testing-library/*`, `jsdom`.
