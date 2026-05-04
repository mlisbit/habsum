type LoaderProps = {
  className?: string;
  label?: string;
};

export function Loader({ className, label = 'Loading' }: LoaderProps) {
  const rootClass = ['loader', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass || undefined} role="status" aria-live="polite" aria-label={label}>
      <span className="loader__spinner" aria-hidden />
      <span className="loader__label text-b-s text-light">{label}</span>
    </div>
  );
}
