export interface CheckoutRequest {
  amount: number;
}

export interface CheckoutResponse {
  transactionId: string;
  amount: string;
  status: string;
}

export interface WebhookRequest {
  transaction_id: string;
  status: 'SUCCESS' | 'REJECTED';
}

export interface WebhookResponse {
  transactionId: string;
  amount: string;
  status: string;
  type: string;
  description: string;
  createdAt: Date;
}
