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
};
