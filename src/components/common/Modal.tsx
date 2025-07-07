import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  focusTrap?: boolean;
  escToClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, focusTrap = false, escToClose = true }) => {
  const modalRef = React.useRef<HTMLDivElement>(null);

  // ESC key to close
  React.useEffect(() => {
    if (!isOpen || !escToClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Focus trap
      if (focusTrap && e.key === 'Tab' && modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableEls.length === 0) return;
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        } else if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, focusTrap, escToClose]);

  // Focus modal on open
  React.useEffect(() => {
    if (isOpen && focusTrap && modalRef.current) {
      setTimeout(() => {
        if (!modalRef.current) return;
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableEls.length) focusableEls[0].focus();
      }, 10);
    }
  }, [isOpen, focusTrap]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        transition: 'background 0.2s',
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <div
        ref={modalRef}
        className="modal-fade-in"
        style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '100%',
          overflow: 'auto',
          position: 'relative',
          animation: 'modalFadeIn 0.3s ease-out',
          outline: 'none',
        }}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Close button */}
        <button
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0.375rem',
            transition: 'all 0.2s ease',
          }}
          onClick={onClose}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
          aria-label="إغلاق"
        >
          ×
        </button>

        {/* Header */}
        {title && (
          <div
            style={{
              padding: '1.5rem 1.5rem 0 1.5rem',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <h2
              id="modal-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0,
                textAlign: 'center',
              }}
            >
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div
          style={{
            padding: title ? '1.5rem' : '2rem',
            maxHeight: 'calc(90vh - 4rem)',
            overflow: 'auto',
          }}
        >
          {children}
        </div>
      </div>
      <style>
        {`
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Modal; 