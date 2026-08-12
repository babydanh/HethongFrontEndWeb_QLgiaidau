export type PaymentPurpose =
  | 'REGISTRATION_FEE'
  | 'TOURNAMENT_PUBLISH_FEE'
  | 'PLATFORM_FEE';

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED';

export type PayoutStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export interface Payment {
  id: string;
  userId: string;
  tournamentId: string;
  participantId?: string | null;
  amount: string;
  platformFeeAmount?: string;
  purpose?: PaymentPurpose;
  status: PaymentStatus;
  refundStatus?: string;
  refundedAmount?: string;
  refundBankName?: string;
  refundAccountNumber?: string;
  refundAccountName?: string;
  paymentGateway?: string;
  transactionReference?: string;
  gatewayResponse?: Record<string, unknown> | null;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
  tournament?: {
    id: string;
    name: string;
  };
}

export interface AdminPayment extends Payment {
  user?: {
    id: string;
    email: string;
    fullName?: string | null;
  };
}

export interface PaymentReceipt {
  id: string;
  paymentId: string;
  receiptNumber: string;
  serviceName: string;
  purpose?: PaymentPurpose;
  tournamentId?: string | null;
  buyerUserId?: string | null;
  subtotal: string;
  platformFeeAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  issuedAt: string;
  snapshot?: Record<string, unknown> | null;
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
  status: PayoutStatus;
  transactionProofUrl?: string;
  note?: string;
  approvedAt?: string;
  disbursedAt?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  tournament?: {
    id: string;
    name: string;
  };
}

export interface AdminPayoutRequest extends PayoutRequest {
  organizer?: {
    id: string;
    email: string;
    fullName?: string | null;
  };
}

export interface CreatePaymentDto {
  purpose: PaymentPurpose;
  tournamentId?: string;
  participantId?: string;
  divisionId?: string;
  paymentGateway?: 'PAYOS';
}

/** @deprecated Chỉ giữ tạm thời cho màn hình công bố giải chưa chuyển sang contract purpose. */
export interface LegacyCreatePaymentDto {
  tournamentId: string;
  participantId?: string;
  divisionId?: string;
  amount: number;
  paymentGateway?: string;
}

export interface CreatePaymentLinkResponse {
  paymentId: string;
  paymentUrl?: string;
  checkoutUrl?: string;
  qrCode?: string;
  amount?: string | number;
  status: PaymentStatus;
  expiresAt?: string;
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

