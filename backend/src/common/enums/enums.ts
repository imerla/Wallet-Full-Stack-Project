export enum TransactionType {
  TRANSFER = 'TRANSFER',
  TOP_UP = 'TOP_UP',
  REFUND = 'REFUND',
  MONEY_REQUEST = 'MONEY_REQUEST',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum TransactionFlowType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum MoneyRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
