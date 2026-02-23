import React from 'react';

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-200">
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "mt-2 w-full rounded-xl bg-slate-950/60 px-4 py-3 text-slate-50",
        "ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500",
        "placeholder:text-slate-500"
      ].join(" ")}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "mt-2 w-full rounded-xl bg-slate-950/60 px-4 py-3 text-slate-50",
        "ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500",
        "placeholder:text-slate-500"
      ].join(" ")}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "mt-2 w-full rounded-xl bg-slate-950/60 px-4 py-3 text-slate-50",
        "ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      ].join(" ")}
    />
  );
}

export function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-slate-400 leading-relaxed">{children}</p>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-rose-300">{children}</p>;
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const variant = props.variant ?? "primary";
  const base =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950";
  const styles =
    variant === "primary"
      ? "bg-indigo-500 text-white hover:bg-indigo-400 focus:ring-indigo-500"
      : "bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-slate-500";
  const { className, ...rest } = props;
  return <button {...rest} className={[base, styles, className].filter(Boolean).join(" ")} />;
}
