import React from 'react';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ className, ...props }) => {
  return (
    <div className={clsx('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
      <input
        type="text"
        className="input-field pl-9"
        {...props}
      />
    </div>
  );
};
