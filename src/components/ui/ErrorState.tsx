interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Ocurrió un error',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center ${className}`}
    >
      <p className="text-base font-semibold text-red-800">{title}</p>
      <p className="max-w-md text-sm text-red-700">{message}</p>
      {onRetry !== undefined ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
