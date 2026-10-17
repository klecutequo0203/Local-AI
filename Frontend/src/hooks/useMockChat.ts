import { useState, useCallback, useRef } from 'react';
import { ChatMessage, AssistantEmotion } from '../types/chat';

// Simple pool of varied mock replies so the UI demo feels alive
const MOCK_REPLIES: Array<{ text: string; emotion: AssistantEmotion }> = [
  {
    text: 'Mình đã nhận được tin nhắn của bạn! Tính năng kết nối backend đang được phát triển — hiện tại mình đang chạy ở chế độ Mock.',
    emotion: 'happy',
  },
  {
    text: 'Rất thú vị! Bạn có thể nói thêm về điều đó không? Mình đang rất tò mò.',
    emotion: 'curious',
  },
  {
    text: 'Mình hiểu rồi. Để mình suy nghĩ thêm một chút về câu hỏi của bạn nhé.',
    emotion: 'thinking',
  },
  {
    text: 'Cảm ơn bạn đã chia sẻ! Đây là một ý tưởng hay đấy.',
    emotion: 'happy',
  },
  {
    text: 'Ồ, điều đó thật bất ngờ! Mình chưa nghĩ tới trường hợp này.',
    emotion: 'surprised',
  },
];

let replyIndex = 0;
function nextMockReply() {
  const reply = MOCK_REPLIES[replyIndex % MOCK_REPLIES.length];
  replyIndex++;
  return reply;
}

export interface UseMockChatReturn {
  messages: ChatMessage[];
  isThinking: boolean;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

export function useMockChat(): UseMockChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      text: 'Chào bạn! Mình là Desktop AI Companion. Bạn cần mình hỗ trợ gì hôm nay?',
      timestamp: new Date().toISOString(),
      emotion: 'happy',
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  // Keep a ref to allow cancellation if the component unmounts mid-reply
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Vary delay slightly so it feels more natural (1.0–1.8s)
    const delay = 1000 + Math.random() * 800;

    thinkingTimerRef.current = setTimeout(() => {
      const { text: replyText, emotion } = nextMockReply();
      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
        emotion,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, delay);
  }, []);

  const clearMessages = useCallback(() => {
    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    setIsThinking(false);
    setMessages([]);
  }, []);

  return { messages, isThinking, sendMessage, clearMessages };
}
