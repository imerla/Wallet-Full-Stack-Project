export type UserRole = 'USER' | 'ADMIN';
export type ConversationStatus = 'OPEN' | 'CLOSED';

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  userId: string;
  adminId: string;
  status: ConversationStatus;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface ChatError {
  message: string;
}

export interface ConversationClosedPayload {
  conversationId: string;
  closedAt: string;
}
