import React from 'react';

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      {children}
    </div>
  );
}