import React from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  icon?: React.ReactNode;
  formatValue?: (val: number) => string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 0.05,
  onChange,
  label,
  icon,
  formatValue = (v) => `${Math.round(v * 100)}%`,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className={`glass-slider-wrapper window-no-drag ${className}`.trim()} title={label}>
      {icon && <span style={{ display: 'inline-flex', opacity: 0.8 }}>{icon}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="glass-slider"
        aria-label={label || 'Scale slider'}
        style={{
          background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, rgba(255, 255, 255, 0.16) ${percentage}%, rgba(255, 255, 255, 0.16) 100%)`,
        }}
      />
      {formatValue && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            minWidth: '38px',
            textAlign: 'right',
          }}
        >
          {formatValue(value)}
        </span>
      )}
    </div>
  );
};

export default Slider;
