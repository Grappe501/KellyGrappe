import React from 'react';

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center">
      {/* Containment Frame */}
      <div className="w-full max-w-7xl border-x-2 border-slate-300 bg-slate-50 sm:shadow-sm sm:rounded-none">
        {children}
      </div>
    </div>
  );
}