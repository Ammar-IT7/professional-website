import React, { useEffect } from 'react';

interface NotificationData {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
}

interface NotificationProps {
  notification: NotificationData;
  onClose: () => void;
}

const typeColors: Record<string, { bg: string; color: string }> = {
  success: { bg: '#d1fae5', color: '#059669' },
  error: { bg: '#fee2e2', color: '#dc2626' },
  info: { bg: '#dbeafe', color: '#2563eb' },
  warning: { bg: '#fef3c7', color: '#d97706' },
};

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.isVisible, onClose]);

  if (!notification.isVisible) return null;
  const { bg, color } = typeColors[notification.type] || typeColors.info;
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        background: bg,
        color,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '1rem 2rem',
        fontFamily: 'Cairo, sans-serif',
        fontWeight: 600,
        fontSize: 18,
        minWidth: 220,
        textAlign: 'right',
        direction: 'rtl',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
      role="alert"
      aria-live="polite"
    >
      <span style={{ flex: 1 }}>{notification.message}</span>
      <button
        onClick={onClose}
        aria-label="إغلاق التنبيه"
        style={{
          background: 'none',
          border: 'none',
          color,
          fontSize: 22,
          cursor: 'pointer',
          marginLeft: 8,
        }}
      >×</button>
    </div>
  );
};

export default Notification; 