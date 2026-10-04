export const NotificationType = {
  MONEY_RECEIVED: 'MONEY_RECEIVED',
  MONEY_SENT: 'MONEY_SENT',
  MONEY_REQUEST_RECEIVED: 'MONEY_REQUEST_RECEIVED',
  MONEY_REQUEST_ACCEPTED: 'MONEY_REQUEST_ACCEPTED',
  MONEY_REQUEST_REJECTED: 'MONEY_REQUEST_REJECTED',
  MONEY_REQUEST_CANCELLED: 'MONEY_REQUEST_CANCELLED',
  TRANSFER_CANCELLED: 'TRANSFER_CANCELLED',
  SUPPORT_MESSAGE: 'SUPPORT_MESSAGE',
  TOP_UP_PENDING: 'TOP_UP_PENDING',
  TOP_UP_SUCCESS: 'TOP_UP_SUCCESS',
  TOP_UP_REJECTED: 'TOP_UP_REJECTED',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCountResponse {
  count: number;
}
