import React from 'react';

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(' ');
}

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx('block text-sm font-medium text-slate-700', className)}
    >
      {children}
    </label>
  );
}

const fieldBase =
  'mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400';
const fieldRing =
  'border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
const fieldDisabled =
  'disabled:bg-slate-50 disabled:text-slate-500 disabled:placeholder:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200';

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cx(fieldBase, fieldRing, fieldDisabled, className)}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={cx(fieldBase, fieldRing, fieldDisabled, 'min-h-[120px]', className)}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={cx(fieldBase, fieldRing, fieldDisabled, className)}
    />
  );
}

export function HelpText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cx('mt-2 text-xs leading-relaxed text-slate-500', className)}>
      {children}
    </p>
  );
}

export function ErrorText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cx('mt-2 text-sm text-rose-700', className)}>
      {children}
    </p>
  );
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
  }
) {
  const {
    variant = 'primary',
    size = 'md',
    className,
    type,
    ...rest
  } = props;

  const base =
    'inline-flex items-center justify-center rounded-xl font-semibold transition ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes =
    size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm';

  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600'
      : variant === 'secondary'
      ? 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-600'
      : variant === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-600'
      : 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-indigo-600';

  return (
    <button
      {...rest}
      type={type ?? 'button'}
      className={cx(base, sizes, styles, className)}
    />
  );
}