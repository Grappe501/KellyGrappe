import React from 'react';

type Props = React.HTMLAttributes<HTMLDivElement>;

export default function Container({
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <div
      className={`min-h-screen w-full bg-slate-100 flex justify-center ${className}`}
      {...rest}
    >
      <div className="w-full max-w-7xl border-x-4 border-slate-300 bg-slate-50 sm:shadow-sm">
        {children}
      </div>
    </div>
  );
}