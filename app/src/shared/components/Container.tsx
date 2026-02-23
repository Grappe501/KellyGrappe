import React from 'react';

export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        {children}
      </div>
    </div>
  );
}
