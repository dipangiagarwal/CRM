import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const SIZES = { sm: 16, md: 24, lg: 40 };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2
        size={SIZES[size]}
        className="animate-spin text-primary-400"
      />
      {text && <p className="text-sm text-text-muted">{text}</p>}
    </div>
  );
};

export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

// Generic Skeleton Pulsing Block
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('skeleton animate-pulse', className)} />
);

// Table loading skeleton
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="w-full space-y-4">
    {/* Table Header */}
    <div className="flex items-center gap-4 border-b border-surface-border pb-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Table Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-surface-border/40">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className={clsx('h-5 flex-1', j === 0 ? 'w-1/3' : '')} />
        ))}
      </div>
    ))}
  </div>
);

// Kanban stage loading skeleton
export const KanbanSkeleton: React.FC = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="shrink-0 w-72 bg-bg-card border border-surface-border rounded-2xl p-4 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between pb-2 border-b border-surface-border">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        {/* Cards skeleton */}
        {Array.from({ length: 3 }).map((_, j) => (
          <div key={j} className="bg-bg-elevated border border-surface-border/60 rounded-xl p-3.5 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/3 rounded-lg" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Card layout loading skeleton (e.g. settings, profile details)
export const CardSkeleton: React.FC = () => (
  <div className="card p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="space-y-3 pt-4 border-t border-surface-border">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  </div>
);

