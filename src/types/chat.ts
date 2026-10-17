export interface ChatMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  text: string;
  createdAt: string;
}

export interface SendMessageInput {
  teamId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  text: string;
}

export interface TypingStatus {
  userId: string;
  userName: string;
  isTyping: boolean;
  updatedAt: string;
}
