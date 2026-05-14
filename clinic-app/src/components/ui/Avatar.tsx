import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────
type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string;
  initials?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

// ─── Size Map ─────────────────────────────────────────────────────
const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

// ─── Color from Name ──────────────────────────────────────────────
const avatarColors = [
  'bg-primary-500',
  'bg-accent-500',
  'bg-success-500',
  'bg-warning-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-teal-500',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// ─── Derive Initials ──────────────────────────────────────────────
function deriveInitials(name?: string, initials?: string): string {
  if (initials) return initials.slice(0, 2).toUpperCase();
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────
function Avatar({ src, initials, name, size = 'md', className }: AvatarProps) {
  const displayInitials = deriveInitials(name, initials);
  const bgColor = name ? getColorFromName(name) : 'bg-gray-400';

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn(
          'inline-block shrink-0 rounded-full object-cover',
          sizeStyles[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white',
        sizeStyles[size],
        bgColor,
        className,
      )}
      aria-label={name || 'Avatar'}
    >
      {displayInitials}
    </span>
  );
}

export { Avatar };
export type { AvatarProps, AvatarSize };
