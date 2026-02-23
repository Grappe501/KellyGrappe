import React from 'react';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center">
      {/* 2x bleed containment: strong, calm frame without narrowing mobile */}
      <div className="w-full max-w-7xl border-x-2 border-slate-300 bg-slate-50 min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>

        {/* Compliance footer: always visible, every page */}
        <footer className="px-4 py-4 text-center text-[11px] leading-relaxed text-slate-500 border-t border-slate-200 bg-slate-50">
          Paid for by Kelly Grappe for Secretary of State
        </footer>
      </div>
    </div>
  );
}