import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  change?: number;
  changeLabel?: string;
  footer?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBg = 'bg-primary-500/10 text-primary-400',
  change,
  changeLabel,
  footer,
}) => {
  const isPositive = (change ?? 0) > 0;
  const isNegative = (change ?? 0) < 0;

  return (
    <div className="card p-6 hover:border-surface-muted transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-text-muted font-medium">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        </div>
        <div className={clsx('p-3 rounded-xl', iconBg)}>
          {icon}
        </div>
      </div>

      {(change !== undefined || footer) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <div className={clsx(
              'flex items-center gap-1 text-xs font-medium',
              isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-text-muted'
            )}>
              {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
              {Math.abs(change)}%
            </div>
          )}
          {changeLabel && (
            <p className="text-xs text-text-muted">{changeLabel}</p>
          )}
          {footer && !changeLabel && (
            <p className="text-xs text-text-muted">{footer}</p>
          )}
        </div>
      )}
    </div>
  );
};
