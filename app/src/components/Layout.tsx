import React from 'react';
import '../styles/theme.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-container">
      <div className="header">
        <h1>Office of the Secretary of State</h1>
        <p>Official Event Request Submission</p>
      </div>

      <div className="card">
        {children}
      </div>

      <div className="footer">
        © {new Date().getFullYear()} Kelly Grappe Campaign. All rights reserved.
      </div>
    </div>
  );
}