import { lazy, Suspense, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { motion, type Variants } from 'motion/react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Skeleton from '@/components/common/Skeleton';
import Tabs from '@/components/common/Tabs';
import { socket } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';

const StatsSection = lazy(() => import('@/components/dashboard/StatsSection'));

const subscribeSocket = (cb: () => void) => {
  socket.on('connect', cb);
  socket.on('disconnect', cb);
  return () => {
    socket.off('connect', cb);
    socket.off('disconnect', cb);
  };
};

interface Section {
  id: string;
  to: string;
  title: string;
  text: string;
  adminOnly?: boolean;
}

// Розділи панелі: додавайте нові сутності проєкту сюди
const sections: Section[] = [
  { id: 'groups', to: '/groups', title: 'Групи', text: 'Перегляд груп та кількості студентів' },
  { id: 'subjects', to: '/subjects', title: 'Предмети', text: 'Каталог навчальних предметів' },
  {
    id: 'lessons',
    to: '/lessons',
    title: 'Заняття',
    text: 'Розклад занять із фільтрами за групою та предметом',
  },
  {
    id: 'users',
    to: '/users',
    title: 'Користувачі',
    text: 'Керування користувачами системи',
    adminOnly: true,
  },
];

const ORDER_KEY = 'dashboard-sections-order';

// Порядок карток розділів зберігаємо локально: сервер не має поля для сортування,
// тому перетягування (завдання 8) змінює лише персональний порядок у браузері.
const loadOrder = (): string[] => {
  const ids = sections.map((s) => s.id);
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return ids;
    const saved = JSON.parse(raw) as unknown;
    if (!Array.isArray(saved)) return ids;
    const valid = saved.filter((id): id is string => typeof id === 'string' && ids.includes(id));
    return [...valid, ...ids.filter((id) => !valid.includes(id))];
  } catch {
    return ids;
  }
};

// Картка розділу, яку можна перетягнути: хук useSortable дає ref, жести та transform
function SortableSection({ section, disabled }: { section: Section; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'z-10 opacity-80' : undefined}
    >
      <Link
        to={section.to}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          if (isDragging) e.preventDefault(); // після перетягування клік не має вести на сторінку
        }}
        className="block h-full touch-none rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-gray-900"
        aria-roledescription="Сортуваний елемент"
      >
        <h3 className="mb-2 text-xl font-semibold">{section.title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{section.text}</p>
      </Link>
    </div>
  );
}

// варіанти stagger-анімації карток (завдання 14)
const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const connected = useSyncExternalStore(subscribeSocket, () => socket.connected);
  const [order, setOrder] = useState(loadOrder);

  // На чому можна перетягувати: мишею — після зсуву на 8px (щоб не конфліктувати з кліком),
  // клавіатурою — Пробіл щоб взяти, стрілки щоб перемістити (доступність)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder((ids) => {
      const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const visible = order
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is Section => s !== undefined && (!s.adminOnly || isAdmin));

  const tabs = [
    {
      label: 'Розділи',
      content: (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <motion.div
              variants={gridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              {visible.map((s) => (
                <motion.div key={s.id} variants={cardVariants}>
                  <SortableSection section={s} disabled={false} />
                </motion.div>
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      ),
    },
    {
      label: 'Реальний час',
      content: (
        <p className="text-gray-600 dark:text-gray-400">
          З'єднання Socket.io:{' '}
          <strong className={connected ? 'text-green-600' : 'text-red-600'}>
            {connected ? 'активне' : 'відсутнє'}
          </strong>
        </p>
      ),
    },
  ];

  if (canManage) {
    tabs.push({
      label: 'Статистика',
      content: (
        <Suspense fallback={<Skeleton className="h-80" />}>
          <StatsSection />
        </Suspense>
      ),
    });
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Вітаємо, {user?.fullName}!</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
