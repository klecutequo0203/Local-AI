import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Trash2 } from 'lucide-react';
import { ChatMessage } from '../../types/chat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import '../../styles/chat.css';

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearMessages?: () => void;
  onClose?: () => void;
  isThinking?: boolean;
  autoHideDelayMs?: number; // Mặc định 8000ms (8s)
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onClearMessages,
  onClose,
  isThinking = false,
  autoHideDelayMs = 8000,
}) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset idle timer khi có hoạt động (gõ phím, di chuột, có tin nhắn mới)
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    // Không tự ẩn nếu AI đang suy nghĩ
    if (isThinking) return;

    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, autoHideDelayMs);
  }, [autoHideDelayMs, isThinking]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [messages, isThinking, resetIdleTimer]);

  return (
    <div
      className={`chat-panel-container interactive-hit-target ${isIdle ? 'is-idle-hidden' : ''}`}
      onMouseEnter={resetIdleTimer}
      onMouseMove={resetIdleTimer}
    >
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-header-title">
          <span className="chat-online-dot" />
          <MessageSquare size={14} />
          <span>Trợ lý AI</span>
        </div>
        <div className="chat-header-actions window-no-drag">
          {onClearMessages && messages.length > 0 && (
            <button
              className="chat-header-btn"
              onClick={onClearMessages}
              title="Xóa đoạn hội thoại"
              aria-label="Xóa đoạn hội thoại"
            >
              <Trash2 size={13} />
            </button>
          )}
          {onClose && (
            <button
              className="chat-header-btn"
              onClick={onClose}
              title="Đóng khung chat"
              aria-label="Đóng khung chat"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <MessageList messages={messages} isThinking={isThinking} />

      {/* Input */}
      <ChatInput
        onSend={(text) => {
          onSendMessage(text);
          resetIdleTimer();
        }}
        disabled={isThinking}
        onActivity={resetIdleTimer}
      />
    </div>
  );
};
