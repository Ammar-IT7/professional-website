import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="nav">
      <div className="nav-container">
        <div className="nav-content">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="nav-brand">
              نظام إدارة التراخيص
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="nav-links">
            <button
              onClick={() => history.push('/')}
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              رفع الملفات
            </button>
            <button
              onClick={() => history.push('/dashboard')}
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              لوحة التحكم
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 