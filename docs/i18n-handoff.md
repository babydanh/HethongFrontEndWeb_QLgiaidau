# Nền đa ngôn ngữ Web VNSport

## Trạng thái hiện tại

Nền `vi/en` đã được thiết lập bằng `next-intl`. Tiếng Việt là ngôn ngữ mặc định.

Thiết kế hiện tại dùng cookie `NEXT_LOCALE` và **không thêm locale vào URL**. Vì vậy các route, deep link, liên kết chia sẻ, callback đăng nhập, metadata động và URL API hiện có không bị thay đổi.

Đây mới là nền kỹ thuật. Các chuỗi điều hướng chung đã được chuyển sang từ điển để chứng minh luồng hoạt động. Phần lớn chuỗi trong từng màn hình vẫn đang là tiếng Việt và phải được chuyển dần theo từng feature.

## Những gì đã thêm

- `next-intl` trong `package.json`.
- Plugin trong `next.config.ts`.
- Cấu hình locale và cookie tại `src/i18n/config.ts`.
- Cấu hình nạp message theo request tại `src/i18n/request.ts`.
- Provider toàn ứng dụng và thuộc tính `<html lang>` động trong `src/app/layout.tsx`.
- Nút chuyển `VI/EN` dùng chung tại `src/components/i18n/LanguageSwitcher.tsx`.
- Nút chuyển ngôn ngữ trên header desktop và mobile.
- Từ điển khởi đầu:
  - `messages/vi.json`
  - `messages/en.json`
- Script kiểm tra hai ngôn ngữ có cùng key:
  - `pnpm i18n:check`
  - `scripts/check-i18n-messages.mjs`

## Cách dùng

### Client Component

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function Example() {
  const t = useTranslations('TournamentDetail');

  return <h1>{t('title')}</h1>;
}
```

### Server Component

```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('TournamentDetail');

  return <h1>{t('title')}</h1>;
}
```

### Biến động và số nhiều

Không nối câu bằng chuỗi rời. Dùng placeholder và ICU plural:

```json
{
  "TournamentDetail": {
    "teamCount": "{count, plural, =0 {Chưa có đội} one {# đội} other {# đội}}"
  }
}
```

```tsx
t('teamCount', { count: tournament.teamCount })
```

## Quy ước key

- Chia namespace theo feature hoặc màn hình: `TournamentDetail`, `CommunityRanking`, `PaymentCheckout`.
- Key mô tả ý nghĩa, không dùng nguyên câu tiếng Việt làm key.
- Ví dụ tốt: `TournamentDetail.tabs.schedule`.
- Ví dụ không dùng: `lichThiDau`, `text1`, `Lịch thi đấu`.
- Một thay đổi giao diện phải thêm key vào cả `vi.json` và `en.json` trong cùng lần sửa.
- Chuỗi dùng chung đặt trong `Common`, `Navigation` hoặc `Errors`; không sao chép cùng một câu vào nhiều namespace.

## Không được dịch

- Tên người dùng, tên giải, tên CLB, nội dung chat và nội dung do người dùng nhập.
- ID, mã thanh toán, mã QR, enum gửi lên API, query parameter và route.
- Giá trị kỹ thuật như `LIVE`, `COMPLETED`, `ROUND_ROBIN` khi gửi/nhận API.

Với enum, giữ nguyên giá trị API và chỉ ánh xạ nhãn hiển thị:

```tsx
const statusLabel = t(`status.${tournament.status}`);
```

## Lỗi API

Không so sánh hoặc điều khiển nghiệp vụ bằng nội dung lỗi tiếng Việt từ backend. Backend nên trả `errorCode` ổn định; frontend ánh xạ `errorCode` sang key trong `Errors`.

Trong giai đoạn chuyển đổi, `getErrorMessage` hiện tại vẫn có thể dùng message backend làm fallback, nhưng không đưa message backend trực tiếp vào từ điển.

## Quy trình cho AI dịch tiếp

1. Đọc `docs/skills.md` và `graphify-out/GRAPH_REPORT.md` trước khi sửa.
2. Chọn **một feature** mỗi lần, ví dụ auth, tournament detail hoặc payment.
3. Dùng Graphify và tìm kiếm trong phạm vi feature; không thay chuỗi tiếng Việt trên toàn repo một cách mù quáng.
4. Tạo namespace và thêm đủ key `vi/en`.
5. Thay chuỗi giao diện bằng `useTranslations` hoặc `getTranslations`.
6. Không dịch dữ liệu người dùng, enum API, route hay payload.
7. Chạy:

```bash
pnpm i18n:check
pnpm tsc --noEmit
pnpm build
```

8. Kiểm tra trực quan cả desktop/mobile ở `VI` và `EN`, đặc biệt text dài, modal, bảng và toast.
9. Cập nhật Graphify sau thay đổi kiến trúc lớn.

## Giai đoạn sau nếu cần URL theo ngôn ngữ

Có thể nâng cấp sang `/vi/...` và `/en/...` để SEO theo locale, nhưng phải lập migration riêng cho:

- Dynamic routes.
- Share links và Open Graph.
- OAuth callback.
- Notification redirect URL.
- Canonical URL, sitemap và alternate language.

Không tự ý di chuyển toàn bộ `app/` vào `[locale]` trong lúc dịch nội dung.

## Kết quả kiểm tra khi tạo nền

- `pnpm i18n:check`: đạt, 32 key khớp giữa `vi/en`.
- `pnpm tsc --noEmit`: đạt, không có lỗi TypeScript.
- `git diff --check`: đạt.
- `graphify update .`: đã cập nhật code graph.
- `pnpm build`: chưa xác nhận được vì một tiến trình Node trên máy đang khóa file trong `.next` (`EPERM unlink`). Đây là khóa thư mục build, không phải lỗi biên dịch TypeScript.
- ESLint cho riêng các file i18n đã sửa: đạt.
- ESLint đã được cấu hình bỏ qua thư mục build lưu tạm `.next-old`. Lint toàn repo hiện vẫn còn 35 lỗi và 359 cảnh báo cũ ở các feature khác, không thuộc phần i18n.
