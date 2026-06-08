import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  dot?: boolean;
  dotColor?: string;
}

const VARIANT_CLASSES = {
  default: 'text-primary-400 bg-primary-500/10 border border-primary-500/30',
  success: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30',
  warning: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30',
  danger: 'text-red-400 bg-red-500/10 border border-red-500/30',
  info: 'text-blue-400 bg-blue-500/10 border border-blue-500/30',
  muted: 'text-text-muted bg-bg-hover border border-surface-border',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  dot,
  dotColor,
}) => {
  return (
    <span
      className={clsx(
        'badge',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full', dotColor ?? 'bg-current')}
        />
      )}
      {children}
    </span>
  );
};
