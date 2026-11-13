import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Error Boundary досі реалізується лише класовим компонентом
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Помилка відтворення:', error, info.componentStack);
  }

  render() {
    return this.state.hasError
      ? (this.props.fallback ?? <p role="alert">Щось пішло не так. Оновіть сторінку.</p>)
      : this.props.children;
  }
}
