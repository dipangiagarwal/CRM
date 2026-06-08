import React from 'react';
import { Loader2 } from 'lucide-react';

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
