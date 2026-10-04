export interface TopTransaction {
  transactionId: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  createdAt: string;
}

export interface Analytics {
  month: string;
  totalIncome: string;
  totalSpending: string;
  netBalance: string;
  topTransactions: TopTransaction[];
}
