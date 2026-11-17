import type { ReactNode } from 'react';
import { motion } from 'motion/react';

// М'яка поява вмісту сторінки при навігації (завдання 14).
// Обгортає <Outlet/> у Layout: кожна нова сторінка монтується знову — і анімація повторюється.
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
