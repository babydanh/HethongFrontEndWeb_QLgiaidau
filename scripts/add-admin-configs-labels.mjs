import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entries = {
  loadError: ['Failed to load the configuration list', 'Lỗi khi tải danh sách cấu hình'],
  emptyValue: ['Configuration value cannot be empty', 'Giá trị cấu hình không được để trống'],
  updateSuccess: ['System configuration updated successfully!', 'Cập nhật cấu hình hệ thống thành công!'],
  updateError: ['Failed to update configuration', 'Lỗi khi cập nhật cấu hình'],
  entryFeesEnabled: ['Tournament organizers can set entry fees', 'Đã cho phép ban tổ chức đặt lệ phí đăng ký'],
  entryFeesDisabled: ['New entry fees are disabled', 'Đã khóa việc đặt lệ phí đăng ký mới'],
  entryFeesUpdateError: ['Unable to update the entry-fee policy', 'Không thể cập nhật chính sách lệ phí'],
  title: ['Global System Configuration', 'Cấu Hình Hệ Thống Toàn Cục'],
  description: ['Configure system variables related to ELO, platform service fees, and more.', 'Thiết lập các biến hệ thống liên quan tới ELO, phí dịch vụ nền tảng, v.v.'],
  entryFeePolicyTitle: ['Entry Fee Policy', 'Chính sách lệ phí đăng ký'],
  entryFeePolicyHeading: ['Allow organizers to add entry fees to tournaments', 'Cho phép ban tổ chức gắn lệ phí vào giải đấu'],
  entryFeePolicyDescription: ['When disabled, new tournaments and new competition content can only use 0 fees. Existing tournaments with fees continue to collect and reconcile normally.', 'Khi tắt, giải mới và nội dung thi đấu mới chỉ được để 0đ. Các giải đã có lệ phí vẫn tiếp tục thu và đối soát bình thường.'],
  enabled: ['Enabled', 'Đang bật'],
  disabled: ['Disabled', 'Đang tắt'],
  emptyTitle: ['No system configurations yet', 'Chưa có cấu hình hệ thống nào'],
  emptyDescription: ['Admins can add configurations through the API or DDL scripts.', 'Admin có thể thêm mới cấu hình bằng API hoặc các DDL script.'],
  tableKey: ['Configuration name (Key)', 'Tên cấu hình (Key)'],
  tableValue: ['Value', 'Giá trị'],
  tableDescription: ['Description', 'Mô tả'],
  tableActions: ['Actions', 'Thao tác'],
  noDescription: ['No description', 'Chưa có mô tả'],
  modalTitle: ['Update System Variable', 'Cập Nhật Biến Hệ Thống'],
  modalKeyLabel: ['Variable name (Key)', 'Tên biến (Key)'],
  newValueLabel: ['New value (Value)', 'Giá trị mới (Value)'],
  valuePlaceholder: ['Enter configuration value...', 'Nhập giá trị cấu hình...'],
  descriptionLabel: ['Configuration description', 'Mô tả cấu hình'],
  descriptionPlaceholder: ['Enter a description for this variable...', 'Nhập mô tả cho biến này...'],
  cancel: ['Cancel', 'Hủy'],
  save: ['Save configuration', 'Lưu cấu hình'],
  refresh: ['Refresh configurations', 'Làm mới cấu hình'],
};

for (const locale of ['en', 'vi']) {
  const filePath = path.join(root, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  messages.AdminConfigs ??= {};
  for (const [key, [english, vietnamese]] of Object.entries(entries)) {
    messages.AdminConfigs[key] = locale === 'en' ? english : vietnamese;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(messages, null, 2)}\n`, 'utf8');
}

console.log(`Added ${Object.keys(entries).length} AdminConfigs keys.`);
