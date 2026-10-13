import React from 'react';

export interface TypingIndicatorProps {
  label?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ label = 'AI đang suy nghĩ...' }) => {
  return (
    <div className="chat-typing-container" role="status" aria-live="polite">
      <div className="chat-typing-bubble">
        <span className="chat-dot" />
        <span className="chat-dot" />
        <span className="chat-dot" />
      </div>
      {label && <span className="chat-typing-label">{label}</span>}
    </div>
  );
};
