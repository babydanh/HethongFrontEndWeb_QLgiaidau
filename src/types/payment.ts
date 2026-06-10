export interface Payment {
  id: string;
  userId: string;
  tournamentId: string;
  participantId?: string;
  amount: string;
  platformFeeAmount?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  refundStatus?: string;
  refundedAmount?: string;
  paymentGateway?: string;
  transactionReference?: string;
  gatewayResponse?: Record<string, unknown> | null;
  paidAt?: string;
  createdAt: string;
  tournament?: {
    id: string;
    name: string;
  };
}

export interface PayoutRequest {
  id: string;
  tournamentId: string;
  organizerId: string;
  totalCollected: string;
  amountRequested: string;
  platformFeeRetained: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  transactionProofUrl?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  tournament?: {
    id: string;
    name: string;
  };
}

export interface CreatePaymentDto {
  tournamentId: string;
  participantId?: string;
  amount: number;
  paymentGateway?: string;
}

export interface PayoutRequestDto {
  tournamentId: string;
  amountRequested: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface PaymentHistoryStats {
  totalSpent: number;
  pendingCount: number;
  successCount: number;
}
