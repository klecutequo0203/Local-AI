import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { X, Minus, Square, Copy } from 'lucide-react';

export const Titlebar: React.FC = () => {
  const [isMac, setIsMac] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [osNotification, setOsNotification] = useState<string | null>(null);

  const handleMinimize = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      await win.minimize();
      // Trên macOS khi ở chế độ giả lập Windows (cửa sổ borderless), Cocoa có thể không gửi cửa sổ vào Dock.
      if (isMac) {
        setTimeout(async () => {
          try {
            const isMin = await win.isMinimized();
            if (!isMin) {
              await win.hide();
            }
          } catch {
            await win.hide();
          }
        }, 60);
      }
    } catch (err) {
      console.warn('[Window] Minimize failed, fallback to hide:', err);
      try {
        await getCurrentWindow().hide();
      } catch {}
    }
  }, [isMac]);

  const handleMaximize = useCallback(async () => {
    try {
      const window = getCurrentWindow();
      const current = await window.isMaximized();
      if (current) {
        await window.unmaximize();
        setIsMaximized(false);
      } else {
        await window.maximize();
        setIsMaximized(true);
      }
    } catch (err) {
      console.warn('[Window] Maximize failed:', err);
    }
  }, []);

  // Lắng nghe thay đổi kích thước cửa sổ để cập nhật nút Maximize/Restore
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onResized(async () => {
        try {
          const max = await getCurrentWindow().isMaximized();
          setIsMaximized(max);
        } catch {}
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleClose = useCallback(async () => {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.warn('[Window] Close failed:', err);
    }
  }, []);

  useEffect(() => {
    const checkOS = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlOs = searchParams.get('os');
      const savedOs = localStorage.getItem('DEV_SIMULATE_OS');
      const envOs = (import.meta as any).env?.VITE_OS_OVERRIDE;

      if (urlOs) {
        return urlOs.toLowerCase() === 'mac';
      }
      if (savedOs) {
        return savedOs.toLowerCase() === 'mac';
      }
      if (envOs) {
        return envOs.toLowerCase() === 'mac';
      }
      return navigator.userAgent.toLowerCase().includes('mac');
    };

    const initial = checkOS();
    setIsMac(initial);

    // Helper console: simulateOS('windows') hoặc simulateOS('mac')
    (window as any).simulateOS = (os: 'mac' | 'windows') => {
      const targetIsMac = os.toLowerCase() === 'mac';
      localStorage.setItem('DEV_SIMULATE_OS', targetIsMac ? 'mac' : 'windows');
      setIsMac(targetIsMac);
      setOsNotification(`Chế độ giả lập: ${targetIsMac ? 'macOS (Traffic Lights)' : 'Windows (Controls bên phải)'}`);
      setTimeout(() => setOsNotification(null), 2500);
    };

    // Phím tắt chuyển đổi nhanh giữa macOS và Windows UI: Cmd + Shift + W (hoặc Ctrl + Shift + W)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
        e.preventDefault();
        setIsMac((prev) => {
          const next = !prev;
          localStorage.setItem('DEV_SIMULATE_OS', next ? 'mac' : 'windows');
          setOsNotification(`Chế độ giả lập: ${next ? 'macOS (Traffic Lights)' : 'Windows (Controls bên phải)'}`);
          setTimeout(() => setOsNotification(null), 2500);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lắng nghe các phím chức năng điều khiển cửa sổ (macOS & Windows)
  useEffect(() => {
    const handleWindowShortcuts = (e: KeyboardEvent) => {
      // Bỏ qua nếu người dùng đang nhập văn bản trong input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // 1. ĐÓNG CỬA SỔ (CLOSE):
      // - Windows: Alt + F4, Ctrl + W, Alt + C
      // - macOS: Cmd + W
      const isCloseKey =
        (e.altKey && e.key === 'F4') ||
        (e.ctrlKey && !e.shiftKey && (e.key === 'w' || e.key === 'W')) ||
        (e.metaKey && !e.shiftKey && (e.key === 'w' || e.key === 'W')) ||
        (!isMac && e.altKey && (e.key === 'c' || e.key === 'C'));

      if (isCloseKey) {
        e.preventDefault();
        handleClose();
        return;
      }

      // 2. THU NHỎ CỬA SỔ (MINIMIZE):
      // - Windows: Ctrl + M, Alt + M, Alt + N
      // - macOS: Cmd + M
      const isMinimizeKey =
        (!isMac && (e.ctrlKey || e.altKey) && !e.shiftKey && (e.key === 'm' || e.key === 'M')) ||
        (!isMac && e.altKey && (e.key === 'n' || e.key === 'N')) ||
        (e.metaKey && !e.shiftKey && (e.key === 'm' || e.key === 'M'));

      if (isMinimizeKey) {
        e.preventDefault();
        handleMinimize();
        return;
      }

      // 3. PHÓNG TO / KHÔI PHỤC KÍCH THƯỚC (MAXIMIZE):
      // - Windows: F11, Alt + Enter, Alt + X, Ctrl + Shift + M
      // - macOS: Cmd + Ctrl + F, Cmd + Enter
      const isMaximizeKey =
        e.key === 'F11' ||
        (e.altKey && e.key === 'Enter') ||
        (!isMac && e.altKey && (e.key === 'x' || e.key === 'X')) ||
        (!isMac && e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) ||
        (e.metaKey && e.ctrlKey && (e.key === 'f' || e.key === 'F')) ||
        (e.metaKey && e.key === 'Enter');

      if (isMaximizeKey) {
        e.preventDefault();
        handleMaximize();
        return;
      }
    };

    window.addEventListener('keydown', handleWindowShortcuts);
    return () => window.removeEventListener('keydown', handleWindowShortcuts);
  }, [isMac, handleClose, handleMinimize, handleMaximize]);

  // Đồng bộ với Tauri: Khi chuyển sang Windows thì tắt native decorations, macOS thì bật lại
  useEffect(() => {
    try {
      const win = getCurrentWindow();
      win.setDecorations(isMac).catch(() => {});
    } catch {}
  }, [isMac]);

  // Windows style buttons (hiển thị khi ở chế độ Windows)
  const WindowsButtons = (
    <div
      className="windows-buttons-container window-no-drag"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={handleMinimize}
        className="windows-titlebar-btn window-no-drag"
        title="Thu nhỏ (Ctrl+M / Alt+M / Alt+N)"
        aria-label="Minimize Window"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={handleMaximize}
        className="windows-titlebar-btn window-no-drag"
        title={isMaximized ? "Khôi phục (F11 / Alt+Enter / Alt+X)" : "Phóng to (F11 / Alt+Enter / Alt+X)"}
        aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
      >
        {isMaximized ? <Copy size={12} style={{ transform: 'rotate(180deg)' }} /> : <Square size={13} />}
      </button>
      <button
        onClick={handleClose}
        className="windows-titlebar-btn close window-no-drag"
        title="Đóng (Alt+F4 / Ctrl+W / Alt+C)"
        aria-label="Close Window"
      >
        <X size={16} />
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .windows-buttons-container {
          -webkit-app-region: no-drag;
        }

        .windows-titlebar-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          width: 46px;
          height: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s, color 0.15s;
          -webkit-app-region: no-drag;
        }
        .windows-titlebar-btn:hover {
          background-color: rgba(255, 255, 255, 0.12);
        }
        .windows-titlebar-btn.close:hover {
          background-color: #e81123 !important;
          color: white !important;
        }

        .os-simulation-toast {
          position: fixed;
          top: 48px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.9);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.4);
          padding: 6px 16px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          pointer-events: none;
          animation: fadeInOut 2.5s forwards;
        }
      `}</style>

      {/* Thông báo chế độ OS khi chuyển đổi bằng phím tắt */}
      {osNotification && (
        <div className="os-simulation-toast">
          {osNotification}
        </div>
      )}

      <div
        className="titlebar-wrapper"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 9999,
          background: 'transparent',
          pointerEvents: 'none',
        }}
      >
        {/* Trên macOS: Dành khoảng trống 80px bên trái cho nút native traffic lights */}
        {isMac && <div style={{ width: '80px', height: '100%', pointerEvents: 'none' }} />}

        {/* Vùng kéo cửa sổ (drag region) */}
        <div
          data-tauri-drag-region
          className="window-drag-region"
          title="Kéo thả để di chuyển cửa sổ (Nhấp đúp để Phóng to / Khôi phục)"
          onDoubleClick={handleMaximize}
          onMouseDown={async (e) => {
            if (e.button === 0) {
              try {
                await invoke('set_is_dragging', { dragging: true });
                await getCurrentWindow().startDragging();
              } catch (err) {
                console.warn('[Window] Titlebar drag failed:', err);
              } finally {
                await invoke('set_is_dragging', { dragging: false }).catch(() => {});
              }
            }
          }}
          style={{
            flex: 1,
            height: '100%',
            cursor: 'grab',
            pointerEvents: 'auto',
          }}
        />

        {/* Trên Windows: Hiển thị bộ 3 nút thu nhỏ / phóng to / đóng ở góc trên bên phải */}
        {!isMac && (
          <div style={{ pointerEvents: 'auto', height: '100%' }}>
            {WindowsButtons}
          </div>
        )}
      </div>
    </>
  );
};
