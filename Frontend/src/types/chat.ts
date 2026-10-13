export type MessageRole = 'user' | 'assistant' | 'system';

export type AssistantEmotion = 'happy' | 'curious' | 'sad' | 'surprised' | 'thinking';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  emotion?: AssistantEmotion;
  isStreaming?: boolean;
}
