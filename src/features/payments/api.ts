import { api } from '@/lib/axios';
import {
  AdminPayment,
  AdminPayoutRequest,
  Payment,
  PayoutRequest,
  CreatePaymentDto,
  CreatePaymentLinkResponse,
  LegacyCreatePaymentDto,
  PayoutRequestDto,
  PaymentReceipt,
} from '@/types/payment';
import { ApiResponse } from '@/types/api';

interface NestedPayoutListRow {
  payout: PayoutRequest;
  tournament: PayoutRequest['tournament'];
}

interface NestedAdminPayoutListRow extends NestedPayoutListRow {
  organizer: AdminPayoutRequest['organizer'];
}

interface NestedAdminPaymentListRow {
  payment: Payment;
  tournament: Payment['tournament'];
  user: AdminPayment['user'];
}

type PayoutListRow = PayoutRequest | NestedPayoutListRow;
type AdminPayoutListRow = AdminPayoutRequest | NestedAdminPayoutListRow;
type AdminPaymentListRow = AdminPayment | NestedAdminPaymentListRow;

const isNestedPayout = (row: PayoutListRow): row is NestedPayoutListRow => 'payout' in row;
const isNestedAdminPayment = (row: AdminPaymentListRow): row is NestedAdminPaymentListRow => 'payment' in row;

const flattenPayout = (row: PayoutListRow): PayoutRequest =>
  isNestedPayout(row) ? { ...row.payout, tournament: row.tournament } : row;

const flattenAdminPayout = (row: AdminPayoutListRow): AdminPayoutRequest => {
  if ('payout' in row) {
    return { ...row.payout, tournament: row.tournament, organizer: row.organizer };
  }
  return row;
};

const flattenAdminPayment = (row: AdminPaymentListRow): AdminPayment =>
  isNestedAdminPayment(row)
    ? { ...row.payment, tournament: row.tournament, user: row.user }
    : row;

export const paymentsApi = {
  createPaymentLink: (data: CreatePaymentDto | LegacyCreatePaymentDto) =>
    api.post<ApiResponse<CreatePaymentLinkResponse>>('/payments/create-link', data),
  
  getMyPayments: () => 
    api.get<ApiResponse<Payment[]>>('/payments/me'),
  
  getPaymentById: (id: string) => 
    api.get<ApiResponse<Payment>>(`/payments/${id}`),
  
  requestPayout: (data: PayoutRequestDto) => 
    api.post<ApiResponse<PayoutRequest>>('/payments/payout', data),
  
  getMyPayouts: async () => {
    const response = await api.get<ApiResponse<PayoutListRow[]>>('/payments/payouts');
    return { ...response, data: response.data.map(flattenPayout) };
  },

  getAdminStats: () =>
    api.get<ApiResponse<{
      totalUsers: number;
      totalCommunities: number;
      totalTournaments: number;
      totalAmountProcessed: string;
      totalPlatformFee: string;
      totalPayoutProcessed: string;
    }>>('/payments/admin/stats'),

  getAdminPayouts: async () => {
    const response = await api.get<ApiResponse<AdminPayoutListRow[]>>('/payments/admin/payouts');
    return { ...response, data: response.data.map(flattenAdminPayout) };
  },

  reviewPayout: (id: string, data: { status: 'APPROVED' | 'REJECTED'; note?: string }) =>
    api.patch<ApiResponse<PayoutRequest>>(`/payments/admin/payouts/${id}/review`, data),

  confirmPayoutPaid: (id: string, data: { transactionProofUrl: string; note?: string }) =>
    api.patch<ApiResponse<PayoutRequest>>(`/payments/admin/payouts/${id}/review`, {
      status: 'PAID',
      transactionProofUrl: data.transactionProofUrl,
      note: data.note,
    }),

  getAdminTransactions: async () => {
    const response = await api.get<ApiResponse<AdminPaymentListRow[]>>('/payments/admin/transactions');
    return { ...response, data: response.data.map(flattenAdminPayment) };
  },

  getAdminPaymentReceipt: (id: string) =>
    api.get<ApiResponse<PaymentReceipt>>(`/payments/admin/payments/${id}/receipt`),

  confirmRefund: (id: string, data: { transactionProofUrl: string }) =>
    api.post<ApiResponse<Payment>>(`/payments/admin/payments/${id}/confirm-refund`, data),

  mockVerify: (paymentId: string) =>
    api.post<ApiResponse<{ message: string }>>('/payments/mock-verify', { paymentId }),
};

