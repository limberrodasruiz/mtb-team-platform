import { Link } from 'react-router-dom';
import { Bike } from 'lucide-react';
import { useSiteSettings } from '../../providers/SiteSettingsProvider';
import { cn } from '../../utils/cn';

export function BrandMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { logoUrl, settings } = useSiteSettings();
  const dimensions =
    size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const icon = size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={settings.team_name}
        className={cn('shrink-0 rounded-xl object-contain', dimensions, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-[var(--brand-contrast)] shadow-sm',
        dimensions,
        className,
      )}
      aria-hidden
    >
      <Bike className={icon} strokeWidth={2.2} />
    </span>
  );
}

export function Logo({
  variant = 'light',
  className,
  onClick,
}: {
  variant?: 'light' | 'dark';
  className?: string;
  onClick?: () => void;
}) {
  const { settings } = useSiteSettings();

  return (
    <Link
      to="/"
      onClick={onClick}
      className={cn('flex min-w-0 items-center gap-2.5', className)}
      aria-label={`${settings.team_name} — inicio`}
    >
      <BrandMark />
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-[13px] font-extrabold uppercase leading-tight tracking-wide sm:text-sm',
            variant === 'dark' ? 'text-white' : 'text-slate-950',
          )}
        >
          {settings.team_name}
        </span>
        <span
          className={cn(
            'block truncate text-[9px] font-semibold uppercase tracking-[0.2em]',
            variant === 'dark' ? 'text-white/50' : 'text-slate-500',
          )}
        >
          {settings.slogan || 'Mountain bike'}
        </span>
      </span>
    </Link>
  );
}
