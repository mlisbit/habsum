type LoaderProps = {
  className?: string;
  label?: string;
  size?: 'small' | 'medium';
};

const SIZE_CLASS = {
  small: 'loader--small',
  medium: 'loader--medium',
} as const;

export function Loader({ className, label = 'Loading', size = 'small' }: LoaderProps) {
  const rootClass = ['loader', SIZE_CLASS[size], className].filter(Boolean).join(' ');

  return (
    <div className={rootClass || undefined} role="status" aria-live="polite" aria-label={label}>
      <span className="loader__spinner" aria-hidden />
    </div>
  );
}
