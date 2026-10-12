import React from 'react';

export type ButtonActiveState = 'default' | 'muted' | 'pinned' | 'active';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  activeState?: ButtonActiveState;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  activeState = 'default',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  ...rest
}) => {
  const stateClass =
    activeState === 'muted'
      ? 'state-muted'
      : activeState === 'pinned'
        ? 'state-pinned'
        : activeState === 'active'
          ? 'state-active'
          : '';

  const sizeStyle =
    size === 'sm'
      ? { width: 'var(--btn-size-sm)', height: 'var(--btn-size-sm)' }
      : size === 'lg'
        ? { width: 'var(--btn-size-lg)', height: 'var(--btn-size-lg)' }
        : { width: 'var(--btn-size-md)', height: 'var(--btn-size-md)' };

  return (
    <button
      type="button"
      className={`glass-btn window-no-drag ${stateClass} ${className}`.trim()}
      style={sizeStyle}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {icon}
    </button>
  );
};

export default IconButton;
