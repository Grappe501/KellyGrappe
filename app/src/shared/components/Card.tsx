import React from 'react';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={['px-5 pt-5 pb-3', className].filter(Boolean).join(' ')}>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={['px-5 pb-5', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
