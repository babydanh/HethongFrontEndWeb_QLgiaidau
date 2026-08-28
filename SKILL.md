# Web Frontend — VI / EN Localization (i18n) Guidelines

1. **Từ điển nguồn (Source of Truth)**:
   - `messages/vi.json` (Tiếng Việt)
   - `messages/en.json` (English)

2. **Quy tắc bắt buộc**:
   - Mọi chuỗi giao diện người dùng PHẢI nằm trong `vi.json` và `en.json`.
   - Không được hardcode chuỗi text trực tiếp trong file `.tsx` / `.ts`.
   - Luôn sử dụng `useTranslations('Namespace')` (Client) hoặc `getTranslations('Namespace')` (Server).
   - Khi tạo key mới, phải thêm đồng bộ ở cả 2 tệp `vi.json` và `en.json` để tránh lỗi `MISSING_MESSAGE`.

3. **Formatters**:
   - Sử dụng `formatDate`, `formatCurrency`, hoặc `Intl` API với biến `locale`.
