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

const AVATAR_PALETTES = [
  'bg-rose-500/10 border-rose-500/20 text-rose-400',
  'bg-orange-500/10 border-orange-500/20 text-orange-400',
  'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'bg-teal-500/10 border-teal-500/20 text-teal-400',
  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  'bg-violet-500/10 border-violet-500/20 text-violet-400',
  'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
  'bg-pink-500/10 border-pink-500/20 text-pink-400',
];

const getAvatarColorClass = (firstName: string, lastName?: string | null) => {
  const name = `${firstName} ${lastName || ''}`.trim();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
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

  const colorClass = getAvatarColorClass(firstName, lastName);

  return (
    <div
      className={clsx(
        'rounded-full border flex items-center justify-center font-bold shrink-0 transition-colors duration-200',
        colorClass,
        SIZE_CLASSES[size],
        className
      )}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
};
