import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Container({ children, className }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <main
        className={[
          'flex-1',
          'mx-auto w-full max-w-6xl',
          // REMOVE horizontal padding completely
          'py-6 sm:py-8',
          className ?? '',
        ].join(' ')}
      >
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl py-4 text-center">
          <p className="text-xs text-slate-600 tracking-wide">
            Paid for by Kelly Grappe for Secretary of State
          </p>
        </div>
      </footer>
    </div>
  );
}