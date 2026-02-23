import React from 'react';

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex justify-center">
      {/* Outer frame */}
      <div className="w-full max-w-7xl border-x border-slate-200 bg-slate-50">
        {children}
      </div>
    </div>
  );
}