export interface ChatMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SendMessageInput {
  teamId: string;
  senderId: string;
  senderName: string;
  text: string;
}
