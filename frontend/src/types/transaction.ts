export interface Transaction {
  transactionId: string;
  userId: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REJECTED';
  description: string;
  createdAt: string;
  updatedAt: string;
  sender?: {
    username?: string;
    email?: string;
  };
  receiver?: {
    username?: string;
    email?: string;
  };
  cancellableUntil?: string;
  cancelledAt?: string;
  relatedTransactionId?: string;
  rejectionReason?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
