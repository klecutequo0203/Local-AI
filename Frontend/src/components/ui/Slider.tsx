import React, { useRef, useEffect, useState, useCallback } from 'react';

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
  step = 0.01,
  onChange,
  label,
  icon,
  formatValue = (v) => `${Math.round(v * 100)}%`,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastValRef = useRef<number>(value);
  const [localVal, setLocalVal] = useState<number>(value);

  // Tính toán vị trí dừng chính xác khớp với tâm của thumb (16px tròn)
  // Tại 0%: tâm ở 8px -> dừng ở calc(0% + 8px)
  // Tại 50%: tâm ở 50% -> dừng ở calc(50% + 0px)
  // Tại 100%: tâm ở 100% - 8px -> dừng ở calc(100% - 8px)
  const getGradient = useCallback(
    (val: number) => {
      const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
      const offsetPx = ((0.5 - pct / 100) * 16).toFixed(2);
      const stopPos = `calc(${pct}% + ${offsetPx}px)`;
      return `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${stopPos}, rgba(255, 255, 255, 0.16) ${stopPos}, rgba(255, 255, 255, 0.16) 100%)`;
    },
    [min, max]
  );

  // Đồng bộ khi prop value từ component cha thay đổi
  useEffect(() => {
    setLocalVal(value);
    lastValRef.current = value;
    if (inputRef.current) {
      inputRef.current.style.background = getGradient(value);
    }
  }, [value, getGradient]);

  // Cập nhật DOM trực tiếp và đồng bộ ngay trên sự kiện kéo (0ms delay)
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = parseFloat(e.currentTarget.value);
    e.currentTarget.style.background = getGradient(v);
    setLocalVal(v);
    if (lastValRef.current !== v) {
      lastValRef.current = v;
      onChange(v);
    }
  };

  return (
    <div className={`glass-slider-wrapper window-no-drag ${className}`.trim()} title={label}>
      {icon && <span style={{ display: 'inline-flex', opacity: 0.8 }}>{icon}</span>}
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={localVal}
        onInput={handleInput}
        onChange={handleInput}
        className="glass-slider"
        aria-label={label || 'Scale slider'}
        style={{
          background: getGradient(localVal),
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
          {formatValue(localVal)}
        </span>
      )}
    </div>
  );
};

export default Slider;
