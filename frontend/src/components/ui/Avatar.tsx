import { getInitials, getFileUrl } from '../../utils/helpers';
import { clsx } from 'clsx';

interface AvatarProps {
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({
  firstName,
  lastName,
  avatarUrl,
  size = 'sm',
  className,
}) => {
  if (avatarUrl) {
    return (
      <img
        src={getFileUrl(avatarUrl)}
        alt={`${firstName} ${lastName}`}
        className={clsx('rounded-full object-cover', SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center font-bold text-primary-400 shrink-0',
        SIZE_CLASSES[size],
        className
      )}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
};
