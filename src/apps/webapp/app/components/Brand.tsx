export type BrandSize = 'small' | 'large';

export function Brand({ size, className }: { size: BrandSize; className?: string }) {
  return (
    <span
      className={[
        'brand',
        size === 'small' ? 'brand--small' : 'brand--large',
        size === 'small' ? 'text-b-s' : 'text-h-m',
        size === 'large' ? 'gap-2' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img className="brand__icon" src="/favicon.svg" alt="" />
      <span>Habsum</span>
    </span>
  );
}
