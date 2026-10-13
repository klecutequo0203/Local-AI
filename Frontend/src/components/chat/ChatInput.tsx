import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

export interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onActivity?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Nhập tin nhắn (Enter để gửi)...',
  onActivity,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText('');
    onActivity?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onActivity?.();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className="chat-input-form window-no-drag" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className="chat-input-field"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onActivity?.();
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => onActivity?.()}
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        type="submit"
        className={`chat-send-btn ${text.trim() ? 'has-content' : ''}`}
        disabled={disabled || !text.trim()}
        title="Gửi tin nhắn (Enter)"
        aria-label="Gửi tin nhắn"
      >
        <Send size={15} />
      </button>
    </form>
  );
};
