import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { persister, persistOptions, queryClient } from './lib/queryClient';
import './index.css';

// відновлення кешу з localStorage + автоматичне збереження змін (завдання 18)
void persistQueryClient({ queryClient, persister, ...persistOptions });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
