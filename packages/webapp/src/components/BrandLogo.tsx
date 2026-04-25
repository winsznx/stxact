import { clsx } from 'clsx';
import type { CSSProperties } from 'react';

interface BrandGlyphProps {
  className?: string;
  style?: CSSProperties;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  detailColor?: string;
  decorative?: boolean;
}

export interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  iconStyle?: CSSProperties;
  labelClassName?: string;
  showLabel?: boolean;
}

/**
 * Executes logic associated with brand glyph.
 */
export function BrandGlyph({
  className,
  style,
  backgroundColor = 'var(--background-raised)',
  borderColor = 'var(--foreground)',
  accentColor = 'var(--accent)',
  detailColor = 'var(--foreground-subtle)',
  decorative = false,
}: BrandGlyphProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={clsx('h-9 w-9 shrink-0', className)}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'stxact'}
    >
      <rect width="128" height="128" fill={backgroundColor} />
      <rect x="24" y="24" width="80" height="80" stroke={borderColor} strokeWidth="4" />
      <path d="M44 48H81" stroke={detailColor} strokeWidth="4" strokeLinecap="square" />
      <path d="M44 60H74" stroke={detailColor} strokeWidth="4" strokeLinecap="square" />
      <rect x="102" y="16" width="18" height="18" fill={accentColor} />
      <path
        d="M45 78L57 90L84 63"
        stroke={borderColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Executes logic associated with brand logo.
 */
export function BrandLogo({
  className,
  iconClassName,
  iconStyle,
  labelClassName,
  showLabel = true,
}: BrandLogoProps) {
  return (
    <div className={clsx('inline-flex items-center gap-3', className)}>
      <BrandGlyph className={iconClassName} style={iconStyle} decorative={showLabel} />
      {showLabel ? (
        <span className={clsx('font-serif text-xl font-semibold tracking-tight', labelClassName)}>
          stxact
        </span>
      ) : (
        <span className="sr-only">stxact</span>
      )}
    </div>
  );
}
