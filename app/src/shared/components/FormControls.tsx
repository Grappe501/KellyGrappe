import React from 'react';

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900',
        'ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600',
        'placeholder:text-slate-400'
      ].join(" ")}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900',
        'ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600',
        'placeholder:text-slate-400'
      ].join(" ")}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        'mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900',
        'ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600'
      ].join(" ")}
    />
  );
}

export function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-slate-600 leading-relaxed">{children}</p>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-rose-700">{children}</p>;
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const variant = props.variant ?? "primary";
  const base =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600"
      : "bg-slate-100 text-slate-900 hover:bg-slate-200 ring-1 ring-slate-300 focus:ring-slate-400";
  const { className, ...rest } = props;
  return <button {...rest} className={[base, styles, className].filter(Boolean).join(" ")} />;
}
