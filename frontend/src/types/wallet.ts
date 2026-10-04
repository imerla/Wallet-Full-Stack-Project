export interface Wallet {
  id: string;
  balance: string;
  userId: string;
  username: string;
  email: string;
}

export interface TransferRequest {
  receiver_user_id?: string;
  receiver_email?: string;
  receiver_wallet_id?: string;
  amount: number;
  description: string;
}

export interface TransferResponse {
  senderTransactionId: string;
  receiverTransactionId: string;
  amount: string;
  senderBalance: string;
  receiverBalance: string;
}

