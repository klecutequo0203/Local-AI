import React from 'react';
import { ChatMessage } from '../../types/chat';

export interface MessageItemProps {
  message: ChatMessage;
}

const EMOTION_BADGES: Record<string, { label: string; emoji: string }> = {
  happy: { label: 'Vui vẻ', emoji: '✨' },
  curious: { label: 'Tò mò', emoji: '💡' },
  sad: { label: 'Buồn', emoji: '💧' },
  surprised: { label: 'Bất ngờ', emoji: '❗' },
  thinking: { label: 'Suy nghĩ', emoji: '💭' },
};

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const emotionInfo = message.emotion ? EMOTION_BADGES[message.emotion] : null;

  return (
    <div className={`chat-message-row ${isUser ? 'is-user' : 'is-assistant'}`}>
      <div className={`chat-message-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        {!isUser && emotionInfo && (
          <div className="chat-emotion-tag" title={emotionInfo.label}>
            <span className="emotion-emoji">{emotionInfo.emoji}</span>
            <span className="emotion-name">{emotionInfo.label}</span>
          </div>
        )}
        <div className="chat-message-text">{message.text}</div>
        {message.isStreaming && (
          <span className="chat-streaming-cursor" aria-hidden="true">▍</span>
        )}
      </div>
    </div>
  );
};
