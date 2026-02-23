import React from 'react';

export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      {/* Mobile-first: comfortable gutters without narrowing content */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
