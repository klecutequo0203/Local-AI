import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  ZoomIn,
} from 'lucide-react';
import { IconButton } from '../components/ui/IconButton';
import { Slider } from '../components/ui/Slider';
import { Tooltip } from '../components/ui/Tooltip';

export const App: React.FC = () => {
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [characterScale, setCharacterScale] = useState(1.0);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 30%, rgba(30, 41, 59, 0.4) 0%, transparent 70%)',
      }}
    >
      {/* Ghost Trigger Button - Luôn hiển thị khi UI bị ẩn */}
      {isUiHidden && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 'var(--z-toolbar)',
          }}
        >
          <Tooltip content="Hiện lại giao diện điều khiển" position="left">
            <IconButton
              icon={<Eye size={18} />}
              label="Hiện lại UI"
              activeState="active"
              onClick={() => setIsUiHidden(false)}
            />
          </Tooltip>
        </div>
      )}

      {/* Main Floating Controls Container */}
      <div
        className={`ui-transition-fade ${isUiHidden ? 'ui-hidden' : 'ui-visible'}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Floating Pill Toolbar */}
        <div className="glass-pill window-drag-region">
          {/* 1. Mute nó (TTS / AI voice) */}
          <Tooltip content={isAiMuted ? 'Bật âm thanh AI' : 'Mute âm thanh AI'} position="top">
            <IconButton
              icon={isAiMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              label={isAiMuted ? 'Unmute AI' : 'Mute AI'}
              activeState={isAiMuted ? 'muted' : 'default'}
              onClick={() => setIsAiMuted((prev) => !prev)}
            />
          </Tooltip>

          {/* 2. Mute mình (Microphone) */}
          <Tooltip content={isMicMuted ? 'Bật microphone' : 'Mute microphone'} position="top">
            <IconButton
              icon={isMicMuted ? <MicOff size={17} /> : <Mic size={17} />}
              label={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              activeState={isMicMuted ? 'muted' : 'default'}
              onClick={() => setIsMicMuted((prev) => !prev)}
            />
          </Tooltip>

          {/* 3. Always on top */}
          <Tooltip
            content={isAlwaysOnTop ? 'Bỏ ghim trên cùng' : 'Ghim cửa sổ trên cùng'}
            position="top"
          >
            <IconButton
              icon={isAlwaysOnTop ? <PinOff size={17} /> : <Pin size={17} />}
              label="Always on top"
              activeState={isAlwaysOnTop ? 'pinned' : 'default'}
              onClick={() => setIsAlwaysOnTop((prev) => !prev)}
            />
          </Tooltip>

          {/* Divider */}
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'var(--glass-border-base)',
              margin: '0 2px',
            }}
          />

          {/* 4. Slider scale nhân vật */}
          <Tooltip content="Thu phóng kích thước nhân vật Live2D" position="top">
            <Slider
              value={characterScale}
              min={0.5}
              max={2.0}
              step={0.05}
              onChange={setCharacterScale}
              icon={<ZoomIn size={15} color="var(--text-secondary)" />}
              label="Zoom Scale"
            />
          </Tooltip>

          {/* Divider */}
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'var(--glass-border-base)',
              margin: '0 2px',
            }}
          />

          {/* 5. Nút ẩn UI */}
          <Tooltip content="Ẩn toàn bộ UI (giữ click-through)" position="top">
            <IconButton
              icon={<EyeOff size={17} />}
              label="Ẩn UI"
              onClick={() => setIsUiHidden(true)}
            />
          </Tooltip>
        </div>

        {/* Status Preview Card */}
        <div
          className="glass-surface"
          style={{
            padding: '12px 18px',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>
            AI Sound:{' '}
            <strong style={{ color: isAiMuted ? 'var(--accent-rose)' : 'var(--accent-cyan)' }}>
              {isAiMuted ? 'MUTED' : 'ACTIVE'}
            </strong>
          </span>
          <span>•</span>
          <span>
            Mic:{' '}
            <strong style={{ color: isMicMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              {isMicMuted ? 'MUTED' : 'LISTENING'}
            </strong>
          </span>
          <span>•</span>
          <span>
            Pin:{' '}
            <strong
              style={{ color: isAlwaysOnTop ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
            >
              {isAlwaysOnTop ? 'PINNED' : 'NORMAL'}
            </strong>
          </span>
          <span>•</span>
          <span>
            Scale: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(characterScale * 100)}%</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
