import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entries = {
  loadUsersFailed: ['Unable to load the user list.', 'Không thể tải danh sách người dùng.'],
  invalidStartDate: ['The start date is invalid. Please enter it in dd/mm/yyyy format.', 'Ngày bắt đầu không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy.'],
  invalidEndDate: ['The end date is invalid. Please enter it in dd/mm/yyyy format.', 'Ngày kết thúc không hợp lệ. Vui lòng nhập theo định dạng dd/mm/yyyy.'],
  startAfterEnd: ['The start date cannot be after the end date.', 'Ngày bắt đầu không được sau ngày kết thúc.'],
  banSuccess: ['Account sanction applied successfully.', 'Đã áp dụng chế tài thành công.'],
  banError: ['Unable to sanction the account.', 'Không thể xử phạt tài khoản.'],
  unbanSuccess: ['Account sanction removed.', 'Đã gỡ phạt tài khoản.'],
  unbanError: ['Unable to remove the account sanction.', 'Không thể gỡ phạt tài khoản.'],
  loadMoreUsers: ['Load more users', 'Xem thêm người dùng'],
};

for (const locale of ['en', 'vi']) {
  const filePath = path.join(root, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  messages.AdminModeration ??= {};
  for (const [key, [english, vietnamese]] of Object.entries(entries)) {
    messages.AdminModeration[key] = locale === 'en' ? english : vietnamese;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(messages, null, 2)}\n`, 'utf8');
}

console.log(`Added ${Object.keys(entries).length} AdminModeration keys.`);
