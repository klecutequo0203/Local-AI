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
import { ChatMessage } from '../types/chat';

export const App: React.FC = () => {
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isSmartHitTest, setIsSmartHitTest] = useState(true);
  const [isForceClickThrough, setIsForceClickThrough] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [characterScale, setCharacterScale] = useState(1.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Chatbox State
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      text: 'Chào bạn! Mình là Desktop AI Companion. Bạn cần mình hỗ trợ gì hôm nay?',
      timestamp: new Date().toISOString(),
      emotion: 'happy',
    },
  ]);

  const handleSendMessage = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Giả lập câu trả lời nhanh từ AI (trước khi nối Mock/WebSocket Gateway đầy đủ)
    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: `Mình đã nhận được tin nhắn: "${text}". Khung chat đang hoạt động mượt mà!`,
        timestamp: new Date().toISOString(),
        emotion: 'curious',
      };
      setMessages((prev) => [...prev, aiReply]);
      setIsThinking(false);
    }, 1200);
  }, []);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const handleClearMessages = useCallback(() => {
    setMessages([]);
    showToast('🧹 Đã xoá lịch sử trò chuyện');
  }, [showToast]);

  // Xử lý kéo thả tự do cửa sổ trên màn hình
  const handleStartDrag = useCallback(async (e: React.MouseEvent) => {
    // Chỉ kích hoạt khi nhấn chuột trái
    if (e.button !== 0) return;
    // Bỏ qua nếu nhấn vào các nút bấm hoặc slider
    if ((e.target as HTMLElement).closest('.window-no-drag')) return;

    try {
      await invoke('set_is_dragging', { dragging: true });
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.warn('[Window] startDragging failed:', err);
    } finally {
      await invoke('set_is_dragging', { dragging: false }).catch(() => {});
    }
  }, []);

  // 1. Quét và đồng bộ các vùng tương tác (Titlebar, Toolbar, Controls) xuống luồng Native Rust
  const syncHitRects = useCallback(() => {
    try {
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
    } catch {}
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

  useEffect(() => {
    const timer = setTimeout(syncHitRects, 80);
    return () => clearTimeout(timer);
  }, [isUiHidden, syncHitRects]);

  // 2. Đồng bộ trạng thái ban đầu của AlwaysOnTop
  useEffect(() => {
    try {
      getCurrentWindow()
        .isAlwaysOnTop()
        .then((val) => setIsAlwaysOnTop(val))
        .catch(() => {});
    } catch {}
  }, []);

  // 3. Chức năng Always on Top
  const handleToggleAlwaysOnTop = useCallback(async () => {
    try {
      const next = !isAlwaysOnTop;
      await getCurrentWindow().setAlwaysOnTop(next);
      setIsAlwaysOnTop(next);
      showToast(next ? '📌 Always on Top: ĐÃ BẬT' : '📌 Always on Top: ĐÃ TẮT');
    } catch (err) {
      console.warn('[Window] setAlwaysOnTop failed:', err);
      setIsAlwaysOnTop((prev) => !prev);
    }
  }, [isAlwaysOnTop, showToast]);

  // 4. Chức năng Smart Hit-Testing (Tự xuyên vùng trống, tự bắt chuột ở thanh công cụ)
  const handleToggleSmartHitTest = useCallback(async () => {
    try {
      const next = !isSmartHitTest;
      await invoke('set_smart_hit_test', { enabled: next });
      setIsSmartHitTest(next);
      showToast(
        next
          ? '🎯 Smart Hit-Testing: BẬT (Tự click xuyên vùng trống)'
          : '🛡️ Bắt chuột toàn cửa sổ: BẬT (Tắt xuyên chuột)'
      );
    } catch (err) {
      console.warn('[HitTest] set_smart_hit_test failed:', err);
      setIsSmartHitTest((prev) => !prev);
    }
  }, [isSmartHitTest, showToast]);

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac');
  const shortcutLabel = isMac ? '⌘⌥C' : 'Ctrl+Alt+C';

  // 5. Chức năng Force Click-through (Khóa xuyên chuột 100% bằng phím tắt toàn cục)
  const handleToggleForceClickThrough = useCallback(async () => {
    try {
      const next = !isForceClickThrough;
      await invoke('set_force_click_through', { force: next });
      setIsForceClickThrough(next);
      showToast(
        next
          ? `⚡ Khóa Click-through: 100% XUYÊN CHUỘT (Bấm ${shortcutLabel} để mở lại)`
          : '🎯 Đã mở lại Smart Hit-Testing bình thường'
      );
    } catch (err) {
      console.warn('[HitTest] set_force_click_through failed:', err);
      setIsForceClickThrough((prev) => !prev);
    }
  }, [isForceClickThrough, showToast, shortcutLabel]);

  // 6. Lắng nghe phím tắt toàn cục: CommandOrControl + Alt + C
  useEffect(() => {
    let active = true;
    const registerShortcut = async () => {
      try {
        await register('CommandOrControl+Alt+C', (event) => {
          if (event.state === 'Pressed' && active) {
            handleToggleForceClickThrough();
          }
        });
      } catch (err) {
        console.warn('[Shortcut] Failed to register CommandOrControl+Alt+C:', err);
      }
    };
    registerShortcut();

    return () => {
      active = false;
      try {
        unregister('CommandOrControl+Alt+C').catch(() => {});
      } catch {}
    };
  }, [handleToggleForceClickThrough]);

  // 7. Lắng nghe sự kiện từ System Tray / Menu Bar
  useEffect(() => {
    let unlistenTrayClickThrough: (() => void) | undefined;
    let unlistenTrayAlwaysOnTop: (() => void) | undefined;

    listen('tray-toggle-click-through', () => {
      handleToggleForceClickThrough();
    }).then((fn) => {
      unlistenTrayClickThrough = fn;
    });

    listen('tray-toggle-always-on-top', () => {
      handleToggleAlwaysOnTop();
    }).then((fn) => {
      unlistenTrayAlwaysOnTop = fn;
    });

    return () => {
      if (unlistenTrayClickThrough) unlistenTrayClickThrough();
      if (unlistenTrayAlwaysOnTop) unlistenTrayAlwaysOnTop();
    };
  }, [handleToggleForceClickThrough, handleToggleAlwaysOnTop]);

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && e.button === 0) {
          handleStartDrag(e);
        }
      }}
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
      {/* Titlebar nhận chuột */}
      <div className="interactive-hit-target" style={{ width: '100%', height: '36px' }}>
        <Titlebar />
      </div>

      {/* Thông báo Toast khi thao tác */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            padding: '8px 20px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 10000,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Ghost Trigger Button - Luôn hiển thị khi UI bị ẩn */}
      {isUiHidden && (
        <div
          className="interactive-hit-target"
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
        <div
          className="glass-pill window-drag-region interactive-hit-target"
          onMouseDown={handleStartDrag}
          style={{ cursor: 'grab' }}
        >
          {/* Drag Grip Handle */}
          <div
            className="drag-handle"
            title="Kéo thả tự do để di chuyển ứng dụng trên màn hình"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
              cursor: 'grab',
              color: 'var(--text-muted)',
              userSelect: 'none',
            }}
          >
            <GripVertical size={16} />
          </div>
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
              onClick={handleToggleAlwaysOnTop}
            />
          </Tooltip>

          {/* 4. Smart Hit-Testing / Click-through toggle */}
          <Tooltip
            content={
              isForceClickThrough
                ? `Đang Khóa xuyên 100% (Bấm ${shortcutLabel} để mở lại)`
                : isSmartHitTest
                  ? 'Smart Hit-Testing: BẬT (Tự click xuyên vùng trống)'
                  : 'Bật Smart Hit-Testing (Tự click xuyên vùng trống)'
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

          {/* Divider */}
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'var(--glass-border-base)',
              margin: '0 2px',
            }}
          />

          {/* 5. Slider scale nhân vật */}
          <Tooltip content="Thu phóng kích thước nhân vật Live2D" position="top">
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

          {/* Divider */}
          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'var(--glass-border-base)',
              margin: '0 2px',
            }}
          />

          {/* 6. Bật/Tắt Chatbox */}
          <Tooltip content={isChatOpen ? 'Đóng khung chat' : 'Mở khung chat'} position="top">
            <IconButton
              icon={<MessageSquare size={17} />}
              label="Chatbox"
              activeState={isChatOpen ? 'active' : 'default'}
              onClick={() => setIsChatOpen((prev) => !prev)}
            />
          </Tooltip>

          {/* 7. Nút ẩn UI */}
          <Tooltip content="Ẩn toàn bộ UI" position="top">
            <IconButton
              icon={<EyeOff size={17} />}
              label="Ẩn UI"
              onClick={() => setIsUiHidden(true)}
            />
          </Tooltip>
        </div>

        {/* Floating Frameless Chatbox */}
        {isChatOpen && (
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearMessages={handleClearMessages}
            onClose={() => setIsChatOpen(false)}
            isThinking={isThinking}
          />
        )}

        {/* Status Preview Card */}
        <div
          className="glass-surface interactive-hit-target"
          onMouseDown={handleStartDrag}
          title="Nhấp và giữ để di chuyển ứng dụng"
          style={{
            padding: '12px 18px',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'grab',
            userSelect: 'none',
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
            Click-thru:{' '}
            <strong
              style={{
                color: isForceClickThrough
                  ? 'var(--accent-rose)'
                  : isSmartHitTest
                    ? 'var(--accent-cyan)'
                    : 'var(--text-muted)',
              }}
            >
              {isForceClickThrough ? 'FORCE 100%' : isSmartHitTest ? 'SMART (AUTO)' : 'OFF'}
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
