import React from 'react';

interface SpinnerProps {
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, fontFamily: 'Cairo, sans-serif' }}>
    <div style={{ marginBottom: 16 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="24" cy="24" r="20" stroke="#2563eb" strokeWidth="6" opacity="0.2" />
        <path d="M44 24a20 20 0 0 1-20 20" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </svg>
    </div>
    {message && <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 18 }}>{message}</div>}
  </div>
);

export default Spinner; 