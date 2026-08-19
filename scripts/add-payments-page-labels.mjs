import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const values = {
  en: {
    statusPending: 'Pending payment',
    statusCompleted: 'Successful',
    statusFailed: 'Failed',
    statusCancelled: 'Cancelled',
    statusExpired: 'Expired',
    statusRefunded: 'Refunded',
    loadingHistory: 'Loading transaction history…',
    title: 'Payment history',
    description: 'Manage your tournament entry-fee invoices',
    totalSpent: 'Total spent',
    successfulTransactions: 'Successful transactions',
    pendingTransactions: 'Pending transactions',
    invoiceDetails: 'Invoice details',
    invoiceCount: '{count, plural, =1 {# invoice} other {# invoices}}',
    noPayments: 'You have not made any payments yet',
    exploreTournaments: 'Explore tournaments',
    date: 'Date',
    tournament: 'Tournament',
    amount: 'Amount',
    method: 'Method',
    status: 'Status',
    details: 'Details',
    deletedTournament: 'Tournament deleted',
    viewInvoice: 'View invoice',
  },
  vi: {
    statusPending: 'Chờ thanh toán',
    statusCompleted: 'Thành công',
    statusFailed: 'Thất bại',
    statusCancelled: 'Đã hủy',
    statusExpired: 'Hết hạn',
    statusRefunded: 'Đã hoàn tiền',
    loadingHistory: 'Đang tải lịch sử giao dịch…',
    title: 'Lịch sử thanh toán',
    description: 'Quản lý hóa đơn lệ phí giải đấu của bạn',
    totalSpent: 'Tổng tiền đã chi',
    successfulTransactions: 'Giao dịch thành công',
    pendingTransactions: 'Giao dịch chờ xử lý',
    invoiceDetails: 'Chi tiết các hóa đơn',
    invoiceCount: '{count, plural, =1 {# hóa đơn} other {# hóa đơn}}',
    noPayments: 'Bạn chưa thực hiện giao dịch thanh toán nào',
    exploreTournaments: 'Khám phá các giải đấu',
    date: 'Thời gian',
    tournament: 'Giải đấu',
    amount: 'Số tiền',
    method: 'Phương thức',
    status: 'Trạng thái',
    details: 'Chi tiết',
    deletedTournament: 'Giải đấu đã bị xóa',
    viewInvoice: 'Xem hóa đơn',
  },
};

for (const locale of ['en', 'vi']) {
  const filePath = path.join(root, 'messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  catalog.Payments = { ...(catalog.Payments || {}), ...values[locale] };
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
