import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entries = {
  loadError: ['Unable to load verification requests.', 'Không thể lấy danh sách đơn xác minh'],
  approveSuccess: ['Account verified successfully!', 'Đã phê duyệt tài khoản thành công!'],
  approveError: ['Error approving the request.', 'Lỗi khi phê duyệt yêu cầu'],
  revokeConfirm: ['Revoke this user’s trust badge?', 'Thu hồi sao uy tín của người dùng này?'],
  revokeSuccess: ['Trust badge revoked.', 'Đã thu hồi sao uy tín'],
  revokeError: ['Error revoking the badge.', 'Lỗi khi thu hồi'],
  rejectReasonRequired: ['Please enter a rejection reason.', 'Vui lòng nhập lý do từ chối'],
  rejectSuccess: ['Verification request rejected.', 'Đã từ chối yêu cầu xác minh'],
  rejectError: ['Error rejecting the request.', 'Lỗi khi từ chối yêu cầu'],
  title: ['Trust Badge Management', 'Quản lý "Sao Uy Tín"'],
  moderatorDescription: ['Review, grant, and revoke trusted-account certifications.', 'Xem xét, cấp và thu hồi chứng nhận tài khoản uy tín.'],
  adminDescription: ['Grant and revoke trust badges for users.', 'Cấp và thu hồi chứng nhận sao uy tín cho người dùng.'],
  fromDate: ['From date (dd/mm/yyyy)', 'Từ ngày (dd/mm/yyyy)'],
  toDate: ['To date (dd/mm/yyyy)', 'Đến ngày (dd/mm/yyyy)'],
  statusLabel: ['Status:', 'Trạng thái:'],
  statusPending: ['Pending', 'Chờ duyệt'],
  statusApproved: ['Approved', 'Đã cấp'],
  statusRejected: ['Rejected', 'Đã từ chối'],
  emptyTitle: ['No verification requests', 'Không có đơn xác minh nào'],
  emptyHint: ['Try changing the status or date filters.', 'Thử thay đổi bộ lọc trạng thái hoặc ngày.'],
  sender: ['Sender', 'Người gửi'],
  phone: ['Phone number', 'Số điện thoại'],
  submittedDate: ['Submitted', 'Ngày gửi'],
  status: ['Status', 'Trạng thái'],
  documents: ['Documents', 'Tài liệu'],
  actions: ['Actions', 'Thao tác'],
  statusShortApproved: ['Approved', 'Đã cấp'],
  statusShortPending: ['Pending', 'Chờ'],
  statusShortRejected: ['Rejected', 'Từ chối'],
  approve: ['Approve', 'Duyệt'],
  reject: ['Reject', 'Từ chối'],
  revoke: ['Revoke', 'Thu hồi'],
  rejectModalTitle: ['Reject verification request', 'Từ Chối Yêu Cầu Xác Minh'],
  senderLabel: ['Sender', 'Người gửi'],
  rejectReasonLabel: ['Rejection reason', 'Lý do từ chối'],
  rejectReasonPlaceholder: ['Enter a detailed reason...', 'Nhập lý do chi tiết...'],
  cancel: ['Cancel', 'Hủy'],
  submitRejection: ['Submit rejection', 'Gửi từ chối'],
};
for (const locale of ['en', 'vi']) {
  const file = path.join(root, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8'));
  const namespace = messages.AdminVerification ??= {};
  for (const [key, [en, vi]] of Object.entries(entries)) namespace[key] = locale === 'en' ? en : vi;
  fs.writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
}
console.log(`Added ${Object.keys(entries).length} AdminVerification keys to EN and VI.`);
