import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../types/chat';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';

export interface MessageListProps {
  messages: ChatMessage[];
  isThinking?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isThinking = false }) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="chat-message-list">
      {messages.length === 0 && !isThinking && (
        <div className="chat-empty-state">
          <p className="empty-title">Trợ lý ảo sẵn sàng</p>
          <p className="empty-subtitle">Nhập tin nhắn để bắt đầu trò chuyện</p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {isThinking && (
        <div className="chat-message-row is-assistant">
          <TypingIndicator />
        </div>
      )}

      <div ref={scrollEndRef} style={{ height: 1 }} />
    </div>
  );
};
