import React from 'react';

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 shadow-lg shadow-black/20 ring-1 ring-white/10">
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-5 pb-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-slate-300 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="px-5 pb-5">{children}</div>;
}
