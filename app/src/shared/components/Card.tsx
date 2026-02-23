import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={[
        // Enterprise, calm surface
        'rounded-2xl bg-white',
        // IMPORTANT: lock readable foreground on light surfaces (prevents dark-shell inheritance issues)
        'text-slate-900',
        // Crisp border + subtle elevation (SaaS)
        'border border-slate-200 shadow-sm',
        // Prevent visual glitches with inner rounded children
        'overflow-hidden',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, className }: CardHeaderProps) {
  return (
    <div
      className={[
        'px-5 sm:px-6',
        'pt-5 sm:pt-6',
        'pb-4',
        // Soft separation without feeling “boxed”
        'border-b border-slate-100',
        className ?? '',
      ].join(' ')}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div
      className={[
        'px-5 sm:px-6',
        'py-5 sm:py-6',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}