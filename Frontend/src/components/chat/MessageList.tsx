import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessage } from '../../types/chat';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';

export interface MessageListProps {
  messages: ChatMessage[];
  isThinking?: boolean;
}

// How many px from the bottom counts as "at the bottom"
const SCROLL_THRESHOLD = 48;

export const MessageList: React.FC<MessageListProps> = ({ messages, isThinking = false }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Whether the user has scrolled up away from the bottom
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  // How many new messages arrived while the user was scrolled up
  const [unreadCount, setUnreadCount] = useState(0);

  // Track the previous message count so we can detect new arrivals
  const prevMessageCountRef = useRef(messages.length);

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const isAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  // ── Scroll position tracking ──────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();
    setIsScrolledUp(!atBottom);

    // Clear badge once the user manually scrolls back to the bottom
    if (atBottom) setUnreadCount(0);
  }, [isAtBottom]);

  // ── React to new messages or thinking state changes ───────────────────────
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    const hasNewMessages = newCount > prevCount;
    prevMessageCountRef.current = newCount;

    if (!hasNewMessages && !isThinking) return;

    if (isAtBottom()) {
      // User is at bottom: auto-scroll to reveal new content
      scrollToBottom('smooth');
      setUnreadCount(0);
    } else if (hasNewMessages) {
      // User has scrolled up: increment badge counter
      const diff = newCount - prevCount;
      setUnreadCount((prev) => prev + diff);
    }
  }, [messages, isThinking, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom on mount (instant, no animation)
  useEffect(() => {
    scrollToBottom('instant' as ScrollBehavior);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle jump-to-bottom button ─────────────────────────────────────────
  const handleJumpToBottom = useCallback(() => {
    scrollToBottom('smooth');
    setUnreadCount(0);
    setIsScrolledUp(false);
  }, [scrollToBottom]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-message-list-wrapper">
      <div
        ref={scrollContainerRef}
        className="chat-message-list"
        onScroll={handleScroll}
      >
        {/* Empty state */}
        {messages.length === 0 && !isThinking && (
          <div className="chat-empty-state">
            <p className="empty-title">Trợ lý ảo sẵn sàng</p>
            <p className="empty-subtitle">Nhập tin nhắn để bắt đầu trò chuyện</p>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {isThinking && (
          <div className="chat-message-row is-assistant">
            <TypingIndicator />
          </div>
        )}

        {/* Scroll anchor — invisible 1px element at the very bottom */}
        <div ref={scrollEndRef} style={{ height: 1, flexShrink: 0 }} />
      </div>

      {/* Scroll-to-bottom button — only shown when the user has scrolled up */}
      {isScrolledUp && (
        <button
          className="chat-scroll-to-bottom window-no-drag"
          onClick={handleJumpToBottom}
          aria-label="Cuộn xuống tin nhắn mới nhất"
          title="Cuộn xuống tin nhắn mới nhất"
        >
          <ArrowDown size={13} />
          <span>Tin nhắn mới nhất</span>
          {unreadCount > 0 && (
            <span className="chat-scroll-badge">{unreadCount}</span>
          )}
        </button>
      )}
    </div>
  );
};
