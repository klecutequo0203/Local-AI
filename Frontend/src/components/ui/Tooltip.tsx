import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      top: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      right: 'calc(100% + 8px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      left: 'calc(100% + 8px)',
      top: '50%',
      transform: 'translateY(-50%)',
    },
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      className={className}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className="glass-surface-subtle"
          style={{
            position: 'absolute',
            zIndex: 'var(--z-tooltip)',
            padding: '4px 8px',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-glass-sm)',
            border: '1px solid var(--glass-border-base)',
            ...positionStyles[position],
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
