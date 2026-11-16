import type { ComponentProps } from 'react';

interface BadgeProps extends ComponentProps<'span'> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
}

const variantClasses = {
  info: 'bg-primary-100 text-primary-900',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
};

export default function Badge({
  variant = 'info',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
