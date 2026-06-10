# 🎨 Stitch Design Prompts — Frontend Quản Lý Giải Đấu

> **Dành cho Stitch MCP hoặc AI Design Agent.**
> Mỗi prompt dưới đây có thể paste trực tiếp vào Stitch để sinh UI.
> Tuân thủ đúng Design System đã quy định trong `ui.md`.

---

## 🎯 DESIGN SYSTEM (Paste vào đầu mỗi session)

```
CONTEXT:
Dự án: Nền tảng tổ chức giải đấu thể thao (Pickleball, Tennis, Cầu lông) - Việt Nam.
Tech: Next.js 16, React 19, TailwindCSS 4, TypeScript.

STYLE:
- Light mode ONLY. Nền trắng sạch, thoáng, nhiều white space.
- Phong cách: Clean, professional, giống Baseline.vn / Facebook Groups.
- KHÔNG dark mode, KHÔNG glassmorphism, KHÔNG gradient rực rỡ.

COLORS:
- Background: #ffffff (main), #f8fafc (secondary bg)
- Card: #ffffff, border #e2e8f0, shadow-sm
- Primary: #2563eb (blue-600), Light: #dbeafe (blue-100)
- Secondary: #0ea5e9 (sky-500)
- Text: #1e293b (main), #64748b (sub), #94a3b8 (muted)
- Border: #e2e8f0
- Success: #16a34a | Warning: #d97706 | Danger: #dc2626

TYPOGRAPHY:
- Font: "Inter" (Google Fonts)
- Page title: text-2xl font-bold text-slate-800
- Section title: text-lg font-semibold text-slate-700
- Body: text-sm text-slate-600
- Caption: text-xs text-slate-400

COMPONENTS:
- Card: bg-white rounded-xl border border-slate-200 shadow-sm
- Button Primary: bg-blue-600 text-white rounded-lg px-4 py-2.5
- Button Secondary: bg-white border border-slate-300 text-slate-700
- Badge: rounded-full px-2.5 py-0.5 text-xs font-medium
- Input: border-slate-300 rounded-lg px-3 py-2.5 focus:ring-blue-500
- Icons: Lucide React, strokeWidth 1.5, size 20px
- Responsive: Mobile-first, max-w-7xl mx-auto px-4
```

---

## PROMPT 1: Component Library

```
Tạo bộ UI components tái sử dụng cho dự án Next.js 16 + TailwindCSS 4.
Light theme, clean, professional.

Components cần tạo:
1. Button: Primary/Secondary/Danger/Ghost. Sizes sm/md/lg. Loading state.
2. Input: Label + input + error state + helper text.
3. Select: Dropdown panel bg-white shadow-lg.
4. Modal: Centered, backdrop, header/body/footer, close X.
5. Card: White rounded-xl border shadow-sm. Hover shadow-md.
6. Badge: Variants blue/green/amber/red/slate.
7. Avatar: Sizes 28/32/40/64/96. Group overlap.
8. Table: Header bg-slate-50, row hover, responsive scroll.
9. Tabs: Underline style, active border-b-2 blue-600.
10. Pagination: Rounded buttons, active bg-blue-600.
11. Toast: Top-right, auto-dismiss 5s. Success/Error/Warning/Info.
12. Skeleton: bg-slate-200 animate-pulse. Text/avatar/card variants.
13. Empty State: Large icon + title + description + action button.
14. Search Input: Rounded-full, icon search, clear X.
15. Progress Bar: h-2 bg-slate-100, fill bg-blue-500.
16. Breadcrumb: Slash separated, current text-slate-800.

Tất cả dùng hàm cn() (clsx + tailwind-merge) để merge class.
Export từ components/ui/.
```

---

## PROMPT 2: Layout (Header + Footer)

```
Layout chính cho Next.js 16 App Router.

HEADER (sticky top, bg-white border-b h-16):
- Trái: Logo "TournaHub" text-xl font-bold text-blue-600
- Nav: Trang chủ · Giải đấu · Cộng đồng · Xếp hạng
  Active: text-blue-600 border-b-2 border-blue-600
- Giữa: Search bar w-96 rounded-full
- Phải: Bell icon (dot đỏ) · Mail icon · Nút "Tạo giải đấu" · Avatar dropdown

MOBILE: Logo + hamburger. Slide-in menu.
CONTENT: max-w-7xl mx-auto px-4 py-6, bg-slate-50.
FOOTER: bg-white border-t py-8. Logo + links + © 2026.
```

---

## PROMPT 3: Auth (Login + Register)

```
Trang Login + Register. Centered card, sạch, tin cậy.

LOGIN (max-w-md mx-auto mt-20):
- Card bg-white rounded-2xl shadow-lg p-8
- Logo "TournaHub" center
- "Đăng nhập" text-xl + "Chào mừng quay trở lại" text-slate-500
- Input Email (icon mail) + Input Password (icon lock, toggle show/hide)
- "Ghi nhớ" checkbox + "Quên mật khẩu?" link
- Nút "Đăng nhập" full-width bg-blue-600
- Divider "hoặc"
- Nút Google (bg-white border, icon Google)
- "Chưa có tài khoản? Đăng ký ngay"

REGISTER: Tương tự + Họ tên + Strength bar + Confirm password + Terms checkbox.
```

---

## PROMPT 4: Homepage / Feed

```
Trang chủ sau đăng nhập. 2 cột desktop, 1 cột mobile.

CỘT TRÁI (8/12):
- Section "Giải đấu sắp diễn ra": Horizontal scroll cards
  Card: Banner gradient + badge môn + tên giải + ngày/địa điểm/số đội + phí
- Section "Cộng đồng của tôi": Grid 2 cột
  Item: Logo tròn + tên + mô tả + members count
- Section "Hoạt động gần đây": Timeline list
  Avatar + mô tả + timestamp

CỘT PHẢI (4/12):
- Widget cá nhân: Avatar + tên + ELO + tier + stats
- Widget trận sắp tới: List nhỏ
- Widget BXH nhanh: Top 5 ELO
- Widget quảng cáo: Banner 4:3
```

---

## PROMPT 5: Danh sách Giải đấu

```
Trang /tournaments. Filter + Grid cards + Pagination.

FILTER BAR (bg-white rounded-xl border p-4):
Search + Select Môn + Select Status + Select Sort

GRID (3 cột lg, 2 md, 1 sm):
Card: Banner + badge status góc phải + tên giải + badge môn + địa điểm + ngày + progress bar đội + phí + nút "Xem chi tiết"
Hover: shadow-md, translateY(-2px)

PAGINATION: "← Trước | 1 2 3 | Sau →". Text "Hiển thị 1-12 / 150"
EMPTY: Icon trophy + "Không tìm thấy giải đấu nào"
```

---

## PROMPT 6: Chi tiết Giải đấu

```
Trang /tournaments/[id]. Hero + Tabs.

HERO: Banner trái + Info phải (tên, badge, dates, venue, đội, phí, nút "Đăng ký tham gia")
TABS: Tổng quan · Đội tham gia · Bảng đấu · Lịch thi đấu · Bình luận

Tab "Tổng quan": Mô tả + Card quy tắc + Card sân đấu
Tab "Đội": Table # | Tên đội | Đội trưởng | Thành viên | Thanh toán
Tab "Bảng đấu": Bracket tree ngang (Elimination) hoặc Table xếp hạng (Round Robin)
Tab "Lịch": Grouped by round, mỗi match row
Tab "Bình luận": Comment list + reply + input
```

---

## PROMPT 7: Live Score

```
Trang /live/[matchId]. Real-time score, thoáng.

HEADER: "Trận đấu trực tiếp" + badge đếm + filter giải

MATCH CARDS (grid 2 cột):
- Header: Tên giải + badge "Đang diễn ra" (pulse dot)
- Scoreboard: ĐỘI A (logo+tên) | TỶ SỐ (3xl bold) | ĐỘI B
- Chi tiết sets: "21-18 · 18-21 · 12-8*"
- Footer: Court + Trọng tài + Set number + reactions

SECTION "Vừa kết thúc": Cards tương tự, tỷ số final
```

---

## PROMPT 8: Cộng đồng

```
LIST (/communities): Search + List view (không grid)
Item: Logo 56px + tên + mô tả + tags môn + members + nút "Tham gia"

DETAIL (/communities/[id]):
Cover gradient + Logo nổi + tên + stats
Tabs: Giới thiệu · Thành viên · Giải đấu · BXH
```

---

## PROMPT 9: Bảng xếp hạng

```
/leaderboard. Tabs chọn môn (pill buttons).

TOP 3: 3 cards nổi bật (🥇🥈🥉) + avatar + ELO + tier
TABLE (từ #4): # | Avatar+Tên | Tier | ELO | Trận | Thắng | Win% | Xu hướng ↑↓
User highlight: bg-blue-50
SIDEBAR: Giải thích tiers (High A → Low D)
```

---

## PROMPT 10: Profile cá nhân

```
/profile. Cover + Avatar + Info + Tabs.

HEADER: Cover nhỏ + Avatar 96px + Tên + Bio + Stats
TABS: Tổng quan · Giải đấu · Trận đấu · ELO · Bạn bè

Tab Tổng quan: Info card + ELO cards per môn
Tab ELO: Line chart biến động + history table
EDIT: Form card max-w-2xl (upload avatar, inputs, save/cancel)
```

---

## PROMPT 11: Chat

```
/chat. 2 panel layout.

TRÁI (w-80): Search + conversation list (avatar + tên + last msg + time)
PHẢI (flex-1): Header + messages + input bar
- Sent: bg-blue-600 text-white rounded-2xl
- Received: bg-white border rounded-2xl
- Input: attach icon + text input rounded-full + send button
```

---

## PROMPT 12: Admin Dashboard

```
/admin. Stats + Tables.

STATS (grid 4): Users | Communities (pending) | Giải đấu | Doanh thu
SECTION "Cần xử lý": Communities chờ duyệt + Payouts chờ xử lý
TABLE "Audit Logs": Thời gian | User | Action | Table | Record | IP
```

---

## PROMPT 13: Form Tạo Giải đấu (Wizard)

```
Multi-step form, max-w-2xl mx-auto.

PROGRESS: 4 circles connected. Active=blue, Done=green, Future=slate.

Step 1: Tên + Mô tả + Chọn cộng đồng + Chọn môn + Upload banner
Step 2: Thể thức (radio cards) + Quy tắc (sets, points, win by 2) + Max đội
Step 3: Ngày bắt đầu/kết thúc + Chọn sân + Chọn courts
Step 4: Phí + Info hoa hồng + Summary + Checkbox xác nhận + Nút "Tạo giải đấu"
```

---

## 🗂️ Thứ tự ưu tiên sinh UI

| # | Screen | Lý do |
|---|--------|-------|
| 1 | Component Library | Nền tảng |
| 2 | Layout (Header/Footer) | Khung chính |
| 3 | Auth (Login/Register) | Entry point |
| 4 | Homepage | First impression |
| 5 | Danh sách Giải đấu | Core |
| 6 | Chi tiết Giải đấu | Core |
| 7 | Cộng đồng (List + Detail) | Core |
| 8 | Live Score | Killer feature |
| 9 | Bảng xếp hạng | Engagement |
| 10 | Profile | User management |
| 11 | Chat | Social |
| 12 | Admin Dashboard | Admin |
| 13 | Form Tạo Giải đấu | Organizer |
