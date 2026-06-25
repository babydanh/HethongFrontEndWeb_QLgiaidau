import { api } from '@/lib/axios';
import { Payment, PayoutRequest, CreatePaymentDto, PayoutRequestDto } from '@/types/payment';
import { ApiResponse } from '@/types/api';

export const paymentsApi = {
  createPaymentLink: (data: CreatePaymentDto) => 
    api.post<ApiResponse<{ paymentId: string; paymentUrl: string; status: string }>>('/payments/create-link', data),
  
  getMyPayments: () => 
    api.get<ApiResponse<Payment[]>>('/payments/me'),
  
  getPaymentById: (id: string) => 
    api.get<ApiResponse<Payment>>(`/payments/${id}`),
  
  requestPayout: (data: PayoutRequestDto) => 
    api.post<ApiResponse<PayoutRequest>>('/payments/payout', data),
  
  getMyPayouts: () => 
    api.get<ApiResponse<PayoutRequest[]>>('/payments/payouts'),

  getAdminStats: () =>
    api.get<ApiResponse<{
      totalUsers: number;
      totalCommunities: number;
      totalTournaments: number;
      totalAmountProcessed: string;
      totalPlatformFee: string;
      totalPayoutProcessed: string;
    }>>('/payments/admin/stats'),

  getAdminPayouts: () =>
    api.get<ApiResponse<PayoutRequest[]>>('/payments/admin/payouts'),

  reviewPayout: (id: string, data: { status: 'APPROVED' | 'REJECTED'; transactionProofUrl?: string; note?: string }) =>
    api.patch<ApiResponse<PayoutRequest>>(`/payments/admin/payouts/${id}/review`, data),

  getAdminTransactions: () =>
    api.get<ApiResponse<Payment[]>>('/payments/admin/transactions'),

  mockVerify: (paymentId: string) =>
    api.post<ApiResponse<{ message: string }>>('/payments/mock-verify', { paymentId }),
};

