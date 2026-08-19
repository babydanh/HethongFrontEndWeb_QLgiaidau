import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const values = {
  en: {
    defaultTournamentName: 'Sports tournament',
    successToast: 'Entry-fee payment successful!',
    failedToast: 'Payment failed.',
    expiredToast: 'The payment transaction timed out.',
    missingTransaction: 'Transaction information was not found.',
    loading: 'Checking transaction result…',
    successTitle: 'Successful',
    participantSuccess: 'Your registration and payment are complete. You officially have a place in the tournament.',
    publishFeeSuccess: 'The tournament publication fee has been paid. The tournament status has been updated.',
    failedTitle: 'Failed',
    failedDescription: 'The entry-fee payment failed or was cancelled by the payment gateway.',
    pendingTitle: 'Processing',
    pendingDescription: 'The invoice is being verified. The status may update after a few minutes.',
    autoChecking: 'Checking status automatically…',
    errorTitle: 'Transaction error',
    errorDescription: 'Payment information could not be loaded. Please contact support or try again later.',
    transactionId: 'Transaction ID:',
    platformFee: 'Platform fee:',
    publicationFee: 'Publication fee:',
    registrationFee: 'Entry fee:',
    paymentGateway: 'Payment gateway:',
    paidAt: 'Time:',
    backToTournament: 'Back to tournament',
    backToManage: 'Back to tournament management',
    viewOtherTournaments: 'View other tournaments',
  },
  vi: {
    defaultTournamentName: 'Giải đấu thể thao',
    successToast: 'Thanh toán lệ phí thành công!',
    failedToast: 'Thanh toán thất bại.',
    expiredToast: 'Giao dịch đã quá thời gian chờ thanh toán.',
    missingTransaction: 'Không tìm thấy thông tin giao dịch.',
    loading: 'Đang kiểm tra kết quả giao dịch…',
    successTitle: 'Thành công',
    participantSuccess: 'Đăng ký và thanh toán của bạn đã hoàn tất. Bạn đã chính thức có suất tham gia giải đấu.',
    publishFeeSuccess: 'Phí công bố giải đấu đã được thanh toán. Trạng thái giải đấu đã được cập nhật.',
    failedTitle: 'Thất bại',
    failedDescription: 'Giao dịch thanh toán lệ phí không thành công hoặc đã bị hủy từ phía cổng thanh toán.',
    pendingTitle: 'Đang chờ xử lý',
    pendingDescription: 'Hóa đơn đang được kiểm tra. Trạng thái có thể cập nhật sau vài phút.',
    autoChecking: 'Đang tự động kiểm tra trạng thái…',
    errorTitle: 'Lỗi giao dịch',
    errorDescription: 'Không thể tải thông tin thanh toán. Vui lòng liên hệ hỗ trợ hoặc thử lại sau.',
    transactionId: 'Mã giao dịch:',
    platformFee: 'Phí nền tảng:',
    publicationFee: 'Phí công bố:',
    registrationFee: 'Lệ phí tham gia:',
    paymentGateway: 'Cổng thanh toán:',
    paidAt: 'Thời gian:',
    backToTournament: 'Về trang giải đấu',
    backToManage: 'Về trang quản lý giải',
    viewOtherTournaments: 'Xem các giải khác',
  },
};

for (const locale of ['en', 'vi']) {
  const filePath = path.join(root, 'messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  catalog.PaymentResult = { ...(catalog.PaymentResult || {}), ...values[locale] };
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
