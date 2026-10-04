export interface MoneyRequest {
  id: string;
  requesterId: string;
  requestedFromId: string;
  amount: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  respondedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMoneyRequestDto {
  requested_from_email: string;
  amount: number;
  description?: string;
}

export interface RespondMoneyRequestDto {
  action: 'ACCEPT' | 'REJECT';
}
