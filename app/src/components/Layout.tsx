import React from 'react';

interface Props {
  label: string;
  children: React.ReactNode;
}

export default function FormField({ label, children }: Props) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}