import React from 'react';
import '../styles/theme.css';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-container">
      <header className="header-modern">
        <div className="header-inner">
          <h1>Kelly Grappe for Arkansas Secretary of State</h1>
          <p>
            Official Event Request Submission
          </p>
        </div>
      </header>

      <main className="card-modern">
        {children}
      </main>

      <footer className="footer-modern">
        <p>
          Building transparent, responsive public service.
        </p>
      </footer>
    </div>
  );
}