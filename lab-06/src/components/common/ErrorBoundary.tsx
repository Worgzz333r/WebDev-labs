import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Error Boundary досі реалізується лише класовим компонентом
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Помилка відтворення:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div role="alert" className="space-y-2">
        <p>Щось пішло не так. Оновіть сторінку.</p>
        {/* у дев-режимі показуємо причину, щоб її було видно без консолі */}
        {import.meta.env.DEV && this.state.error && (
          <pre className="max-w-full overflow-auto rounded bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}
