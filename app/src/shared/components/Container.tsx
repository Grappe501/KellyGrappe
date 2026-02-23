import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Container({ children, className }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main
        className={[
          'flex-1',
          'mx-auto w-full max-w-6xl',
          'px-4 sm:px-6 lg:px-8',
          'py-8',
          className ?? '',
        ].join(' ')}
      >
        {children}
      </main>

      {/* Global Compliance Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-xs text-gray-500 tracking-wide">
            Paid for by Kelly Grappe for Secretary of State
          </p>
        </div>
      </footer>
    </div>
  );
}