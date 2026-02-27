import React, { useEffect, useState } from 'react';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  enableThemeToggle?: boolean;
};

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem('kg_theme');
  if (stored === 'light' || stored === 'dark') return stored;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export default function Container({
  children,
  className = '',
  enableThemeToggle = true,
  ...rest
}: Props) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('kg_theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen w-full flex justify-center transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'
      } ${className}`}
      {...rest}
    >
      <div
        className={`w-full max-w-6xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900 text-slate-100 shadow-2xl shadow-black/40'
            : 'bg-white text-slate-900 shadow-xl shadow-slate-300/40'
        }`}
      >
        {enableThemeToggle && (
          <div className="flex justify-end p-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() =>
                setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
              }
              className="text-sm font-medium px-3 py-1 rounded-lg border transition hover:opacity-80"
            >
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </button>
          </div>
        )}

        <div className="px-6 py-10 sm:px-10 sm:py-14">
          {children}
        </div>
      </div>
    </div>
  );
}