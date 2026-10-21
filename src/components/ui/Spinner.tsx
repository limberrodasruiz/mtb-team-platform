type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const SIZE_STYLES: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Cargando'}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 ${SIZE_STYLES[size]}`}
      />
      {label !== undefined ? <span className="text-sm text-slate-500">{label}</span> : null}
    </span>
  );
}
