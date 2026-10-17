import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
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
  MousePointerClick,
  GripVertical,
  MessageSquare,
} from 'lucide-react';
import { IconButton } from '../components/ui/IconButton';
import { Slider } from '../components/ui/Slider';
import { Tooltip } from '../components/ui/Tooltip';
import { Titlebar } from '../components/ui/Titlebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useMockChat } from '../hooks/useMockChat';
import '../styles/globals.css';

export const App: React.FC = () => {
  // ── Controls state ─────────────────────────────────────────────────────────
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isSmartHitTest, setIsSmartHitTest] = useState(true);
  const [isForceClickThrough, setIsForceClickThrough] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [characterScale, setCharacterScale] = useState(1.0);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // ── Chat (mock gateway) ─────────────────────────────────────────────────────
  const { messages, isThinking, sendMessage, clearMessages } = useMockChat();

  const handleClearMessages = useCallback(() => {
    clearMessages();
    showToast('Đã xoá lịch sử trò chuyện');
  }, [clearMessages, showToast]);

  // ── Window dragging ─────────────────────────────────────────────────────────
  const handleStartDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.window-no-drag')) return;

    try {
      await invoke('set_is_dragging', { dragging: true });
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.warn('[Window] startDragging failed:', err);
    } finally {
      invoke('set_is_dragging', { dragging: false }).catch(() => {});
    }
  }, []);

  // ── Smart hit-rect sync ─────────────────────────────────────────────────────
  const syncHitRects = useCallback(() => {
    const targets = document.querySelectorAll('.interactive-hit-target');
    const rects: Array<{ x: number; y: number; width: number; height: number }> = [];
    targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        rects.push({
          x: Math.round(r.left),
          y: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
        });
      }
    });
    invoke('update_hit_rects', { rects }).catch(() => {});
  }, []);

  useEffect(() => {
    syncHitRects();
    const interval = setInterval(syncHitRects, 600);
    window.addEventListener('resize', syncHitRects);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', syncHitRects);
    };
  }, [syncHitRects]);

  // Re-sync when visibility changes (toolbar hide/show, chat open/close)
  useEffect(() => {
    const timer = setTimeout(syncHitRects, 80);
    return () => clearTimeout(timer);
  }, [isUiHidden, isChatOpen, syncHitRects]);

  // ── Sync initial always-on-top state from window ────────────────────────────
  useEffect(() => {
    getCurrentWindow()
      .isAlwaysOnTop()
      .then((val) => setIsAlwaysOnTop(val))
      .catch(() => {});
  }, []);

  // ── Always on Top ───────────────────────────────────────────────────────────
  const handleToggleAlwaysOnTop = useCallback(async () => {
    const next = !isAlwaysOnTop;
    try {
      await getCurrentWindow().setAlwaysOnTop(next);
    } catch {
      // Native call may fail in browser dev mode — still update UI
    }
    setIsAlwaysOnTop(next);
    showToast(next ? 'Always on Top: Bật' : 'Always on Top: Tắt');
  }, [isAlwaysOnTop, showToast]);

  // ── Smart Hit-Testing toggle ────────────────────────────────────────────────
  const handleToggleSmartHitTest = useCallback(async () => {
    const next = !isSmartHitTest;
    invoke('set_smart_hit_test', { enabled: next }).catch(() => {});
    setIsSmartHitTest(next);
    showToast(
      next
        ? 'Smart Hit-Testing: Bật (Tự xuyên vùng trống)'
        : 'Bắt chuột toàn cửa sổ (Tắt xuyên chuột)'
    );
  }, [isSmartHitTest, showToast]);

  // ── Force Click-through ─────────────────────────────────────────────────────
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);
  const shortcutLabel = isMac ? '⌘⌥C' : 'Ctrl+Alt+C';

  const handleToggleForceClickThrough = useCallback(async () => {
    const next = !isForceClickThrough;
    invoke('set_force_click_through', { force: next }).catch(() => {});
    setIsForceClickThrough(next);
    showToast(
      next
        ? `Khóa Click-through 100% (Bấm ${shortcutLabel} để mở lại)`
        : 'Đã khôi phục Smart Hit-Testing'
    );
  }, [isForceClickThrough, showToast, shortcutLabel]);

  // ── Global shortcut: CommandOrControl + Alt + C ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    register('CommandOrControl+Alt+C', (event) => {
      if (event.state === 'Pressed' && !cancelled) {
        handleToggleForceClickThrough();
      }
    }).catch((err) => console.warn('[Shortcut] Registration failed:', err));

    return () => {
      cancelled = true;
      unregister('CommandOrControl+Alt+C').catch(() => {});
    };
  }, [handleToggleForceClickThrough]);

  // ── Tray events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    listen('tray-toggle-click-through', () => handleToggleForceClickThrough()).then((fn) =>
      unlisteners.push(fn)
    );
    listen('tray-toggle-always-on-top', () => handleToggleAlwaysOnTop()).then((fn) =>
      unlisteners.push(fn)
    );

    return () => unlisteners.forEach((fn) => fn());
  }, [handleToggleForceClickThrough, handleToggleAlwaysOnTop]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="app-root"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleStartDrag(e);
      }}
    >
      {/* Titlebar */}
      <div className="app-titlebar-slot interactive-hit-target">
        <Titlebar />
      </div>

      {/* Toast */}
      {toastMessage && <div className="app-toast">{toastMessage}</div>}

      {/* Ghost trigger — visible only when UI is hidden */}
      {isUiHidden && (
        <div className="app-ghost-trigger interactive-hit-target">
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

      {/* Controls column: toolbar + chatbox + status */}
      <div className={`app-controls-column ui-transition-fade ${isUiHidden ? 'ui-hidden' : 'ui-visible'}`}>

        {/* ── Floating Pill Toolbar ─────────────────────────────────────── */}
        <div
          className="glass-pill window-drag-region interactive-hit-target"
          onMouseDown={handleStartDrag}
          style={{ cursor: 'grab' }}
        >
          {/* Drag grip */}
          <div className="drag-handle" title="Kéo thả để di chuyển ứng dụng">
            <GripVertical size={16} />
          </div>

          {/* Mute AI (TTS) */}
          <Tooltip content={isAiMuted ? 'Bật âm thanh AI' : 'Mute âm thanh AI'} position="top">
            <IconButton
              icon={isAiMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              label={isAiMuted ? 'Unmute AI' : 'Mute AI'}
              activeState={isAiMuted ? 'muted' : 'default'}
              onClick={() => setIsAiMuted((p) => !p)}
            />
          </Tooltip>

          {/* Mute Mic */}
          <Tooltip content={isMicMuted ? 'Bật microphone' : 'Mute microphone'} position="top">
            <IconButton
              icon={isMicMuted ? <MicOff size={17} /> : <Mic size={17} />}
              label={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              activeState={isMicMuted ? 'muted' : 'default'}
              onClick={() => setIsMicMuted((p) => !p)}
            />
          </Tooltip>

          {/* Always on Top */}
          <Tooltip
            content={isAlwaysOnTop ? 'Bỏ ghim trên cùng' : 'Ghim cửa sổ trên cùng'}
            position="top"
          >
            <IconButton
              icon={isAlwaysOnTop ? <PinOff size={17} /> : <Pin size={17} />}
              label="Always on top"
              activeState={isAlwaysOnTop ? 'pinned' : 'default'}
              onClick={handleToggleAlwaysOnTop}
            />
          </Tooltip>

          {/* Smart Hit-Testing */}
          <Tooltip
            content={
              isForceClickThrough
                ? `Đang khóa xuyên 100% (${shortcutLabel} để mở lại)`
                : isSmartHitTest
                  ? 'Smart Hit-Testing: BẬT'
                  : 'Bật Smart Hit-Testing'
            }
            position="top"
          >
            <IconButton
              icon={<MousePointerClick size={17} />}
              label="Click-through"
              activeState={isSmartHitTest ? 'active' : 'default'}
              onClick={handleToggleSmartHitTest}
            />
          </Tooltip>

          <div className="toolbar-divider" />

          {/* Character scale slider */}
          <Tooltip content="Thu phóng kích thước nhân vật" position="top">
            <Slider
              value={characterScale}
              min={0.5}
              max={2.0}
              step={0.01}
              onChange={setCharacterScale}
              icon={<ZoomIn size={15} color="var(--text-secondary)" />}
              label="Zoom Scale"
            />
          </Tooltip>

          <div className="toolbar-divider" />

          {/* Open / close chatbox */}
          <Tooltip content={isChatOpen ? 'Đóng khung chat' : 'Mở khung chat'} position="top">
            <IconButton
              icon={<MessageSquare size={17} />}
              label="Chatbox"
              activeState={isChatOpen ? 'active' : 'default'}
              onClick={() => setIsChatOpen((p) => !p)}
            />
          </Tooltip>

          {/* Hide UI */}
          <Tooltip content="Ẩn toàn bộ UI" position="top">
            <IconButton
              icon={<EyeOff size={17} />}
              label="Ẩn UI"
              onClick={() => setIsUiHidden(true)}
            />
          </Tooltip>
        </div>

        {/* ── Floating Chatbox ──────────────────────────────────────────── */}
        {isChatOpen && (
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            onClearMessages={handleClearMessages}
            onClose={() => setIsChatOpen(false)}
            isThinking={isThinking}
          />
        )}

        {/* ── Status Indicator Pill ─────────────────────────────────────── */}
        <div
          className="glass-surface status-pill interactive-hit-target"
          onMouseDown={handleStartDrag}
          title="Nhấp và giữ để di chuyển ứng dụng"
        >
          {/* AI Sound */}
          <span
            className="status-pill-dot"
            style={{ background: isAiMuted ? 'var(--accent-rose)' : 'var(--accent-cyan)' }}
          />
          <span>{isAiMuted ? 'Muted' : 'Voice'}</span>

          <span className="status-pill-sep">•</span>

          {/* Mic */}
          <span
            className="status-pill-dot"
            style={{ background: isMicMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
          />
          <span>{isMicMuted ? 'Mic Off' : 'Mic'}</span>

          <span className="status-pill-sep">•</span>
          <span>{isAlwaysOnTop ? 'Pinned' : 'Normal'}</span>

          <span className="status-pill-sep">•</span>
          <span>{Math.round(characterScale * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default App;
