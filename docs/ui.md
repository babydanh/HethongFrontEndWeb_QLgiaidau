# 🎨 UI Prompts cho Stitch — Tournament Management Platform

> **Dự án:** Nền tảng Quản Lý Giải Đấu Thể Thao (Pickleball / Tennis / Cầu lông)
> **Tham khảo:** [Baseline.vn](https://baseline.vn/) · [Pickleheads.com](https://www.pickleheads.com/) · [Challonge.com](https://challonge.com/)
> **Tech:** Next.js 16 (App Router) · React 19 · TailwindCSS 4 · TypeScript

---

## 🎯 Design System

```
CONTEXT — Paste vào đầu mỗi session Stitch:

Dự án: Nền tảng tổ chức giải đấu thể thao (Pickleball, Tennis, Cầu lông) dành cho thị trường Việt Nam.
Tech: Next.js 16 App Router, React 19, TailwindCSS 4, TypeScript.

PHONG CÁCH THIẾT KẾ:
- Light mode, nền trắng sạch sẽ, thoáng đãng, nhiều khoảng trống (white space).
- Giống các trang thể thao community Việt Nam: thân thiện, dễ dùng, không rối mắt.
- KHÔNG dùng dark mode. KHÔNG dùng glassmorphism. KHÔNG gradient rực rỡ.
- Tối giản, gọn gàng, nội dung là trung tâm — giống Facebook Groups / Zalo / Baseline.vn.
- Bố cục rộng rãi, padding lớn, line-height thoải mái, không bị chật.

BẢNG MÀU:
- Nền chính: #ffffff (trắng)
- Nền phụ: #f8fafc (xám rất nhạt, dùng cho background section)
- Nền card: #ffffff, viền #e2e8f0 (xám nhạt), shadow-sm nhẹ nhàng
- Màu chủ đạo (Primary): #2563eb (blue-600) — nút bấm, link, active state
- Màu chủ đạo nhạt: #dbeafe (blue-100) — background badge, hover nhẹ
- Màu phụ (Secondary): #0ea5e9 (sky-500) — live elements, accent
- Text chính: #1e293b (slate-800)
- Text phụ: #64748b (slate-500)
- Text mờ: #94a3b8 (slate-400)
- Đường kẻ / viền: #e2e8f0 (slate-200)
- Success: #16a34a (green-600)
- Warning: #d97706 (amber-600)
- Danger: #dc2626 (red-600)

TYPOGRAPHY:
- Font: "Inter" từ Google Fonts (fallback: system-ui, sans-serif).
- Tiêu đề trang: text-2xl font-bold text-slate-800.
- Tiêu đề section: text-lg font-semibold text-slate-700.
- Body text: text-sm text-slate-600, leading-relaxed.
- Caption / meta: text-xs text-slate-400.

COMPONENTS CHUNG:
- Card: bg-white rounded-xl border border-slate-200 shadow-sm. Hover: shadow-md transition-shadow.
- Button Primary: bg-blue-600 text-white rounded-lg px-4 py-2.5 hover:bg-blue-700. Font-medium.
- Button Secondary: bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50.
- Badge: inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium.
- Input: border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500.
- Avatar: rounded-full object-cover. Viền: ring-2 ring-white.
- Spacing: p-5 hoặc p-6 cho card body. Gap-4 hoặc gap-6 cho grid.
- Border radius: rounded-lg cho input/button, rounded-xl cho card, rounded-2xl cho modal.
- Transition: transition-all duration-200. Không cần animation phức tạp.

ICONS: Lucide React (outline style, strokeWidth 1.5, size 20px).
RESPONSIVE: Mobile-first. Container max-w-7xl mx-auto px-4.
```

---

## 📄 PROMPT 1 — Layout chính

```
Tạo layout chính cho ứng dụng Next.js 16 App Router. Phong cách sáng, sạch, thoáng.

HEADER (top, sticky, bg-white border-b border-slate-200, h-16):
  Bên trái:
  - Logo "TournaHub" text-xl font-bold text-blue-600. Không cần icon emoji.
  - Nav links (desktop): Trang chủ · Giải đấu · Cộng đồng · Xếp hạng — text-sm font-medium text-slate-600, active thì text-blue-600 border-b-2 border-blue-600.

  Giữa:
  - Search bar (w-96): border border-slate-300 rounded-full px-4, icon kính lúp bên trái, placeholder "Tìm giải đấu, người chơi, cộng đồng...".

  Bên phải:
  - Icon thông báo (bell) với dot đỏ nhỏ nếu có unread.
  - Icon tin nhắn (message-circle).
  - Nút "Tạo giải đấu" (bg-blue-600 text-white rounded-lg px-4 py-2 text-sm).
  - Avatar user (32px rounded-full) + dropdown menu nhỏ (Profile, Cài đặt, Đăng xuất).

MOBILE HEADER:
  - Logo + hamburger menu icon.
  - Menu slide-in từ trái: nav links + user info.

CONTENT AREA:
  - max-w-7xl mx-auto px-4 py-6.
  - Background: bg-slate-50 (xám rất nhạt) cho toàn trang, card nổi lên trắng.
  - Không có sidebar cố định. Navigation nằm ở header.

FOOTER (đơn giản):
  - bg-white border-t, py-8.
  - Logo + links: Giới thiệu · Điều khoản · Chính sách · Liên hệ.
  - © 2026 TournaHub.
```

---

## 📄 PROMPT 2 — Trang chủ (Homepage / Feed)

```
Tạo trang chủ cho user đã đăng nhập. Bố cục 2 cột trên desktop, 1 cột mobile.
Phong cách giống News Feed — nội dung cộng đồng là trung tâm, thoáng, dễ đọc.

CỘT TRÁI (w-8/12 trên lg):

  Section 1 — Giải đấu nổi bật:
  - Tiêu đề "Giải đấu sắp diễn ra" text-lg font-semibold, kèm link "Xem tất cả →" text-blue-600 text-sm.
  - Horizontal scroll list (snap-x) các card giải đấu (min-w-[300px]):
    • Ảnh banner giải (rounded-t-xl, aspect-video, nếu không có thì dùng bg gradient nhẹ blue→sky).
    • Body card: Tên giải (font-semibold), badge môn thể thao (bg-blue-100 text-blue-700 rounded-full text-xs).
    • 📅 15/06 - 17/06 · 📍 Sân ABC, Q.7 · 👥 24/32 đội.
    • Phí: "30,000đ / đội" hoặc badge "Miễn phí" (bg-green-100 text-green-700).
    • Nút "Xem chi tiết" nhỏ gọn (text-blue-600 text-sm font-medium hover:underline).

  Section 2 — Cộng đồng của tôi:
  - Tiêu đề "Cộng đồng của tôi" + link "Khám phá thêm →".
  - Grid 2 cột (md) hoặc 1 cột (sm), gap-4.
  - Mỗi card community:
    • Logo tròn (48px) bên trái + tên community (font-medium) + mô tả ngắn 1 dòng bên phải.
    • Dưới: "128 thành viên · 5 giải đấu" text-xs text-slate-400.
    • Badge môn thể thao nhỏ (Pickleball, Tennis...).
    • Border-b nhẹ giữa các items, giống list — không cần card riêng biệt nếu muốn gọn.
    • Click vào → đi đến trang community.

  Section 3 — Hoạt động gần đây (Activity Feed):
  - Tiêu đề "Hoạt động gần đây".
  - List dạng timeline đơn giản (không cần line dọc phức tạp):
    • Avatar nhỏ (32px) + text mô tả + timestamp.
    • Ví dụ: "[Avatar] Nguyễn Văn A đã đăng ký giải Pickleball Mùa Hè 2026 · 2 giờ trước"
    • "[Avatar] Bạn đã thắng trận vs Trần Văn B — ELO +25 · Hôm qua"
    • Nội dung tối giản, dễ scan nhanh.
  - Nút "Xem thêm" ở cuối.

CỘT PHẢI (w-4/12 trên lg, ẩn trên mobile):

  Widget 1 — Thông tin cá nhân nhanh:
  - Card nhỏ: Avatar (64px) + Tên + ELO hiện tại (ví dụ "1,450 ELO") + Tier badge (ví dụ "Tier C").
  - Mini stats dưới: 12 trận · 8 thắng · 67% win.
  - Link "Xem hồ sơ →".

  Widget 2 — Trận đấu sắp tới:
  - "Bạn có 2 trận sắp tới" text-sm.
  - List nhỏ: "vs Đội ABC · 15/06 14:00 · Sân 1".
  - Nếu không có: "Không có trận nào sắp tới".

  Widget 3 — Bảng xếp hạng nhanh:
  - "Top 5 Pickleball" (hoặc môn mà user chơi).
  - List đơn giản: #1 Tên — 2,100 ELO · #2 Tên — 1,980 ELO ...
  - Highlight dòng của user nếu có trong top.
  - Link "Xem đầy đủ →".

  Widget 4 — Quảng cáo (nếu có):
  - Banner nhỏ (aspect-[4/3]) từ advertisements table.
  - Rounded-xl, text "Quảng cáo" nhỏ góc trên.
```

---

## 📄 PROMPT 3 — Danh sách Giải đấu

```
Tạo trang danh sách giải đấu. Gọn gàng, dễ filter, dễ tìm.

HEADER:
- Tiêu đề "Giải đấu" text-2xl font-bold.
- Mô tả nhỏ "Tìm và tham gia các giải đấu thể thao" text-slate-500.

FILTER BAR (bg-white rounded-xl border p-4, mb-6):
- Search input (flex-1).
- Select "Môn": Tất cả / Pickleball / Tennis / Cầu lông.
- Select "Trạng thái": Tất cả / Sắp diễn ra / Đang diễn ra / Đã kết thúc.
- Select "Sắp xếp": Mới nhất / Sắp bắt đầu / Phí thấp nhất.
- Bố cục flex wrap, responsive.

GRID CARDS (3 cột lg, 2 cột md, 1 cột sm, gap-5):
Mỗi card:
- Ảnh banner (aspect-video, rounded-t-xl). Nếu không có ảnh: bg-gradient-to-br from-blue-50 to-sky-50.
- Góc trên phải banner: badge status.
  • "Sắp diễn ra" — bg-blue-600 text-white.
  • "Đang diễn ra" — bg-green-600 text-white.
  • "Đã kết thúc" — bg-slate-400 text-white.
- Body (p-5):
  • Tên giải (text-base font-semibold text-slate-800, line-clamp-1).
  • Row: badge môn (bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5).
  • 📍 Địa điểm (text-sm text-slate-500, icon map-pin).
  • 📅 Ngày (text-sm text-slate-500, icon calendar).
  • Progress: "24/32 đội" + thanh progress bar nhỏ (h-1.5 bg-slate-100, fill bg-blue-500).
  • Divider (border-t my-3).
  • Footer row: 💰 "30,000đ" text-sm font-semibold text-slate-700 · Nút "Xem chi tiết" text-blue-600 text-sm.
- Hover: shadow-md, translateY(-2px) nhẹ.

PAGINATION (mt-8, flex justify-center):
- "← Trước | 1 2 3 ... 15 | Sau →". Active page: bg-blue-600 text-white rounded-lg.
- Text nhỏ: "Hiển thị 1-12 / 150 giải đấu" text-slate-400.

EMPTY:
- Icon trophy (text-slate-300, size 64).
- "Không tìm thấy giải đấu nào" text-slate-500.
- Nút "Tạo giải đấu đầu tiên" nếu user là organizer.
```

---

## 📄 PROMPT 4 — Chi tiết Giải đấu

```
Tạo trang chi tiết một giải đấu. Layout rộng, rõ ràng, tabs gọn.

HERO (bg-white, border-b, py-8):
- Breadcrumb: Giải đấu > Tên giải.
- Layout 2 cột:
  Trái: Ảnh banner giải (rounded-xl, max-h-[300px], object-cover).
  Phải:
  - Tên giải (text-2xl font-bold).
  - Badge môn thể thao + badge status.
  - Thông tin (icon + text, mỗi dòng):
    📅 15/06 - 17/06/2026
    📍 Sân XYZ, Quận 7, TP.HCM
    🏢 Tổ chức bởi: [Logo nhỏ + tên community]
    👥 24/32 đội đăng ký
    💰 Phí: 30,000đ / đội (Hoa hồng nền tảng: 5%)
    🏸 Thể thức: Single Elimination · Best of 3 · 21 điểm/set
  - Nút "Đăng ký tham gia" (bg-blue-600 text-white px-6 py-3 rounded-lg text-base) nếu UPCOMING.
  - Nút phụ: "Chia sẻ" (outline).

TABS (sticky, bg-white border-b, mt-0):
  Tổng quan · Đội tham gia · Bảng đấu · Lịch thi đấu · Bình luận
  Style: text-sm font-medium, active tab có border-b-2 border-blue-600 text-blue-600.

TAB "Tổng quan":
  - Mô tả giải (prose, text-slate-600).
  - Card "Quy tắc thi đấu": grid 2 cột nhỏ — Thể thức, Số set, Điểm/set, Win by 2, ...
  - Card "Sân thi đấu": Tên venue, địa chỉ, ảnh nhỏ, list courts (Court A, Court B...).

TAB "Đội tham gia":
  - Table đơn giản (bg-white rounded-xl border):
    # | Tên đội | Đội trưởng | Thành viên | Thanh toán | Hành động
    Cột thanh toán: ✅ Đã đóng (text-green-600) hoặc ⏳ Chưa đóng (text-amber-600).
    Click tên đội → expand inline xem roster members.
  - Search bar nhỏ trên table.

TAB "Bảng đấu":
  - Nếu Elimination: Bracket tree ngang (horizontal scroll).
    Mỗi match node: bg-white border rounded-lg p-3.
    Đội thắng: font-semibold text-green-700 bg-green-50.
    Trận LIVE: border-blue-500 border-2.
  - Nếu Round Robin: Table xếp hạng nhóm.
    Đội | P | W | L | D | PF | PA | Pts — sorted by points.

TAB "Lịch thi đấu":
  - Grouped by round (Round 1, Round 2... Chung kết).
  - Mỗi match row: Thời gian | Sân | Đội A — score — Đội B | Status.
  - Filter dropdown: chọn Round hoặc Court.

TAB "Bình luận":
  - Comment list: Avatar 36px + Tên (font-medium) + thời gian (text-xs text-slate-400) + nội dung.
  - Reply indented (pl-12).
  - Input box dưới cùng: avatar nhỏ + textarea + nút "Gửi".
```

---

## 📄 PROMPT 5 — Live Score

```
Tạo trang Live Score. Thoáng, tập trung vào tỷ số, dễ đọc nhanh.

HEADER:
- "Trận đấu trực tiếp" text-2xl font-bold + badge đếm "3 trận" (bg-red-100 text-red-600 rounded-full).
- Filter: Dropdown chọn giải đấu hoặc "Tất cả giải".

LIVE MATCHES (grid 2 cột lg, 1 cột mobile, gap-5):
Mỗi match card (bg-white rounded-xl border shadow-sm):
  Header (px-5 pt-4):
  - Tên giải (text-xs text-slate-400 uppercase tracking-wide).
  - Badge "Đang diễn ra" (bg-red-50 text-red-600 text-xs rounded-full, có dot đỏ nhỏ animation pulse trước text).

  Scoreboard (px-5 py-6, text-center):
  - Layout 3 cột: ĐỘI A | TỶ SỐ | ĐỘI B.
  - Đội A: Logo/avatar nhỏ (40px) + tên đội dưới (text-sm font-medium).
  - Tỷ số giữa: Sets score lớn "1 - 1" (text-3xl font-bold text-slate-800).
  - Dưới tỷ số: chi tiết từng set "21-18 · 18-21 · 12-8*" (text-sm text-slate-500). Set đang chơi có (*).
  - Đội B: Tương tự đội A.

  Footer (px-5 pb-4 border-t border-slate-100 pt-3):
  - 📍 Court A · 🧑‍⚖️ Trọng tài: Nguyễn A · ⏱️ Set 3.
  - Text-xs text-slate-400.
  - Bên phải: 👏 45 · 💬 12 (reaction + comment counts, clickable).

SECTION "Vừa kết thúc" (mt-10):
- Tiêu đề "Trận đấu vừa kết thúc" text-lg font-semibold.
- Cards tương tự nhưng không có badge live, tỷ số final, đội thắng highlight (text-green-700).

EMPTY:
- "Không có trận nào đang diễn ra" + icon zap (text-slate-300).
- Link "Xem lịch thi đấu sắp tới →".
```

---

## 📄 PROMPT 6 — Cộng đồng

```
Tạo trang Cộng đồng. Gọn gàng, hiện thực, giống danh sách nhóm trên Facebook/Zalo.

--- TRANG DANH SÁCH ---

HEADER:
- "Cộng đồng" text-2xl font-bold + nút "Tạo cộng đồng" (bg-blue-600 text-white rounded-lg).
- Tabs ngang: Tất cả · Của tôi · Đang chờ duyệt (nếu admin).

FILTER ROW: Search + Select môn + Sort (Nhiều thành viên / Mới nhất).

LIST VIEW (không cần grid card, dùng list cho gọn — giống Facebook Groups):
Mỗi item (bg-white rounded-xl border p-4 mb-3, flex gap-4):
- Logo tròn (56px) bên trái.
- Giữa (flex-1):
  • Tên community (text-base font-semibold text-slate-800).
  • Mô tả (text-sm text-slate-500, line-clamp-1).
  • Tags nhỏ: badges môn thể thao (bg-blue-50 text-blue-700 text-xs).
  • "128 thành viên · 5 giải đã tổ chức" text-xs text-slate-400.
- Bên phải: Nút "Tham gia" (bg-blue-600 text-white text-sm rounded-lg px-4 py-2).
  Nếu đã tham gia: nút "Đã tham gia ✓" (bg-slate-100 text-slate-600).

Pagination cuối list.

--- TRANG CHI TIẾT (communities/:id) ---

COVER (h-48 bg-gradient-to-r from-blue-500 to-sky-400 rounded-b-2xl):
- Logo (80px, rounded-full, ring-4 ring-white) nổi lên từ cover (margin-top negative).
- Tên community (text-2xl font-bold text-slate-800).
- Mô tả ngắn (text-slate-500).
- Stats: 128 thành viên · 5 giải đấu · 3 môn thể thao.
- Actions: "Tham gia" / "Rời khỏi" + "Chia sẻ".

TABS: Giới thiệu · Thành viên · Giải đấu · Bảng xếp hạng

TAB "Giới thiệu": Mô tả đầy đủ, địa chỉ, ngày thành lập, người sáng lập.

TAB "Thành viên" (table):
  Avatar | Tên | Vai trò (badge: Owner=blue, Mod=sky, Member=slate) | Ngày tham gia.
  Search bar. Phân trang.

TAB "Giải đấu": List giải của community này (reuse card từ trang Giải đấu).

TAB "Bảng xếp hạng": Leaderboard nội bộ theo ELO, theo từng môn.
```

---

## 📄 PROMPT 7 — Xếp hạng (Rankings)

```
Tạo trang bảng xếp hạng ELO. Sạch, dễ đọc, tập trung vào data.

HEADER:
- "Bảng xếp hạng" text-2xl font-bold.
- Tabs chọn môn: Pickleball · Tennis · Cầu lông (pill buttons, active: bg-blue-600 text-white).

TOP 3 (flex 3 card, nổi bật nhẹ):
- Card top 1 (giữa, lớn hơn): 🥇 Avatar 72px + Tên + ELO (text-2xl font-bold) + Tier badge + Win%.
  Background: bg-amber-50 border-amber-200.
- Card top 2: 🥈 nhỏ hơn, bg-slate-50.
- Card top 3: 🥉 nhỏ hơn, bg-orange-50.
- Không cần hiệu ứng glow hay animation.

TABLE (từ vị trí 4, bg-white rounded-xl border):
Columns: # | Người chơi (avatar 32px + tên) | Tier | ELO | Trận | Thắng | Win% | Xu hướng
- Tier: text + icon nhỏ (badge bg-blue-50).
- Xu hướng: ↑ (text-green-600) hoặc ↓ (text-red-500) hoặc — (text-slate-400).
- Hàng của user đang đăng nhập: bg-blue-50 font-medium.
- Row hover: bg-slate-50.
- Click → đi tới profile ELO cá nhân.
- Pagination.

SIDEBAR (hoặc card nhỏ trên mobile) — Giải thích Tier:
- Danh sách tiers: High A (2000+) → Low D (0-899), mỗi tier có thanh màu tương ứng.
- Hiện vị trí ELO hiện tại của user trên thang.
```

---

## 📄 PROMPT 8 — Hồ sơ cá nhân

```
Tạo trang hồ sơ cá nhân. Sạch, giống profile LinkedIn/Facebook đơn giản.

PROFILE HEADER (bg-white border-b pb-6):
- Cover nhỏ (h-32, bg-gradient-to-r from-blue-100 to-sky-100, rounded-xl).
- Avatar (96px, rounded-full, ring-4 ring-white, margin-top negative nổi lên từ cover).
- Tên (text-xl font-bold) + Bio dưới (text-sm text-slate-500).
- Stats inline (flex gap-6): 45 bạn bè · 12 giải đấu · 3 cộng đồng (text-sm, số font-semibold).
- Nếu xem profile người khác: Nút "Kết bạn" / "Nhắn tin" (2 nút nhỏ).
- Nếu profile mình: Nút "Chỉnh sửa hồ sơ" (outline).

TABS: Tổng quan · Giải đấu · Trận đấu · ELO · Bạn bè

TAB "Tổng quan":
  - Card thông tin: Email · SĐT · Ngày sinh · Ngày tham gia. (Grid 2 cột, label text-slate-400 + value text-slate-700).
  - Card ELO theo môn (grid 3 cột hoặc 1 cột mobile):
    Mỗi card: Tên môn + ELO lớn (text-xl font-bold) + Tier badge + Trận / Thắng / Win%.
    Nhỏ gọn, thông tin dense nhưng rõ ràng.

TAB "Giải đấu": List giải đã tham gia (tên giải, ngày, kết quả, link xem chi tiết).

TAB "Trận đấu": Table trận gần nhất — Ngày | Đối thủ | Tỷ số | Kết quả (W/L badge) | ELO +/-.

TAB "ELO": Line chart biến động ELO (dùng chart library nhẹ). Tabs chọn môn. Dưới chart: history table.

TAB "Bạn bè": Grid cards nhỏ (avatar + tên + ELO + nút Nhắn tin). Search bar.

--- TRANG CHỈNH SỬA ---
- Form card (bg-white rounded-xl border p-6, max-w-2xl mx-auto):
  • Upload avatar (click để chọn, preview tròn).
  • Input: Họ tên, SĐT, Ngày sinh (date picker), Bio (textarea, max 500 ký tự).
  • Nút "Lưu" (primary) + "Hủy" (outline).
- Section đổi mật khẩu riêng biệt (card riêng dưới).
```

---

## 📄 PROMPT 9 — Đăng nhập & Đăng ký

```
Tạo trang Auth. Sạch, đơn giản, tin cậy — không quá fancy.

LAYOUT: Centered card (max-w-md mx-auto mt-20).

--- ĐĂNG NHẬP ---
Card (bg-white rounded-2xl shadow-lg border p-8):
- Logo "TournaHub" text-center text-2xl font-bold text-blue-600.
- Tiêu đề "Đăng nhập" text-xl font-semibold text-center mt-2.
- Sub: "Chào mừng bạn quay trở lại" text-sm text-slate-500 text-center mb-6.
- Input Email (label "Email", icon mail bên trái input).
- Input Password (label "Mật khẩu", icon lock, nút toggle show/hide bên phải).
- Row: Checkbox "Ghi nhớ" bên trái + link "Quên mật khẩu?" bên phải (text-blue-600 text-sm).
- Nút "Đăng nhập" full-width (bg-blue-600 text-white py-3 rounded-lg text-base font-medium).
- Divider: đường kẻ + text "hoặc" giữa.
- Nút Google login (bg-white border border-slate-300 w-full, icon Google + text "Đăng nhập bằng Google").
- Footer: "Chưa có tài khoản? Đăng ký ngay" (link text-blue-600).

Background page: bg-slate-50. Không cần illustration 2 cột.

--- ĐĂNG KÝ ---
Card tương tự:
- Input: Họ tên · Email · Mật khẩu (có strength bar: Yếu/TB/Mạnh) · Xác nhận mật khẩu.
- Checkbox "Tôi đồng ý Điều khoản sử dụng" (link).
- Nút "Đăng ký".
- Footer: "Đã có tài khoản? Đăng nhập".
```

---

## 📄 PROMPT 10 — Thanh toán

```
Tạo trang quản lý thanh toán. Rõ ràng, minh bạch.

--- CHO PLAYER (Lịch sử thanh toán) ---

Stats cards (grid 3 cột, gap-4):
- 💸 Tổng chi: "1,250,000đ" (text-xl font-bold).
- ⏳ Đang chờ: "1 giao dịch".
- ✅ Thành công: "15 giao dịch".

Table (bg-white rounded-xl border):
Columns: Ngày | Giải đấu | Số tiền | Phương thức | Trạng thái | Chi tiết
- Status badge:
  PENDING: bg-amber-100 text-amber-700.
  COMPLETED: bg-green-100 text-green-700.
  FAILED: bg-red-100 text-red-700.
  REFUNDED: bg-slate-100 text-slate-600.
- Click "Chi tiết" → expand thêm thông tin giao dịch.
- Filter: Status + Date range.

--- CHO ORGANIZER (Doanh thu) ---

Stats cards: Tổng thu | Đã rút | Hoa hồng 5% | Số dư.

Table "Doanh thu theo giải": Giải | Phí/đội | Đội đã đóng | Tổng thu | Hoa hồng | Thực nhận.

Table "Yêu cầu rút tiền":
  Ngày | Giải | Số tiền | Ngân hàng | Trạng thái | Bằng chứng CK.
  Nút "Yêu cầu rút tiền" → Modal form: Chọn giải, Số tiền, Info ngân hàng.

--- CHO ADMIN (Duyệt thanh toán) ---
Stats tổng quan + Table tất cả payout requests + Nút Duyệt/Từ chối.
```

---

## 📄 PROMPT 11 — Tin nhắn

```
Tạo trang Chat. 2 panel (không 3 panel), đơn giản giống Messenger/Zalo web.

LAYOUT (flex, h-screen minus header):

PANEL TRÁI (w-80 border-r, bg-white):
- Header: "Tin nhắn" text-lg font-semibold + icon compose (nút tạo tin nhắn mới).
- Search bar nhỏ.
- List cuộc trò chuyện (scroll):
  • Avatar (44px) + Tên + tin nhắn cuối (text-sm text-slate-400, truncate) + time (text-xs).
  • Chưa đọc: font-semibold + dot xanh.
  • Active conversation: bg-blue-50.

PANEL PHẢI (flex-1, flex flex-col):
- Header: Avatar + Tên + Online/Offline status. Nút gọi (placeholder disabled).
- Message area (flex-1, overflow-y-auto, p-4, bg-slate-50):
  • Tin nhắn người khác: flex items-end gap-2, avatar 28px + bubble bg-white border rounded-2xl rounded-bl-sm px-4 py-2.
  • Tin nhắn mình: bubble bg-blue-600 text-white rounded-2xl rounded-br-sm, align right.
  • Ảnh đính kèm: thumbnail rounded-xl max-w-[240px].
  • Date separator: text-xs text-slate-400 text-center my-4.
- Input bar (border-t bg-white p-3 flex gap-2):
  • Nút 📎 attach (icon).
  • Input text (flex-1, border rounded-full px-4 py-2).
  • Nút gửi (bg-blue-600 text-white rounded-full p-2, icon arrow-up).
```

---

## 📄 PROMPT 12 — Thông báo

```
Tạo dropdown thông báo + trang thông báo đầy đủ.

DROPDOWN (từ bell icon trên header):
- Panel (w-96 bg-white rounded-xl shadow-xl border, max-h-[480px] overflow-y-auto).
- Header: "Thông báo" font-semibold + nút "Đánh dấu tất cả đã đọc" (text-blue-600 text-xs).
- List items:
  • Avatar sender (36px) + nội dung (font-medium nếu unread) + time (text-xs text-slate-400).
  • Unread: bg-blue-50, có dot blue nhỏ bên phải.
  • Click → redirect.
  • Icon theo type: 🏆 giải · ⚔️ trận · 👥 bạn bè · 💰 thanh toán · ⚙️ hệ thống.
- Footer: "Xem tất cả →" text-blue-600 text-sm text-center.

TRANG ĐẦY ĐỦ (/notifications):
- Filter tabs: Tất cả | Chưa đọc | Giải đấu | Bạn bè | Thanh toán.
- List full-width, mỗi item có action contextual (Accept/Reject cho friend request).
- Pagination.
```

---

## 📄 PROMPT 13 — Admin Dashboard

```
Tạo trang Admin. Data-driven, table-focused, không cần quá đẹp — quan trọng là rõ ràng.

STATS ROW (grid 4 cột):
- Users: 12,500 · Communities: 85 (15 pending) · Giải đấu: 230 · Doanh thu tháng: 15.2M đ.
- Card đơn giản: icon + label + số lớn (font-bold text-2xl). Nhỏ hơn: % thay đổi vs tháng trước.

SECTION "Cần xử lý" (grid 2 cột):
- Card "Communities chờ duyệt": List 5 item mới nhất + nút Duyệt/Từ chối.
- Card "Payouts chờ xử lý": List 5 request + nút Xử lý.

TABLE "Audit Logs gần đây":
  Thời gian | User | Hành động | Bảng | Record ID | IP.
  Filter + pagination.

SIDEBAR LINKS (hoặc top nav cho admin):
  /admin/users · /admin/communities · /admin/payments · /admin/ads · /admin/audit.
```

---

## 📄 PROMPT 14 — Form Tạo Giải đấu (Wizard)

```
Tạo form tạo giải đấu mới, multi-step, đơn giản — không quá phức tạp.

PROGRESS BAR (top): 4 bước, circles connected by line, step active = blue, done = green, future = slate.

BƯỚC 1 — Thông tin cơ bản:
- Tên giải (text input, required).
- Mô tả (textarea).
- Chọn cộng đồng (select, chỉ hiện communities mình quản lý).
- Chọn môn (select: Pickleball / Tennis / Cầu lông).
- Upload banner (drag & drop zone, hoặc click chọn file).
- Nút "Tiếp theo →".

BƯỚC 2 — Thiết lập thi đấu:
- Thể thức (radio cards có mô tả ngắn): Round Robin / Single Elimination / Double Elimination.
- Quy tắc: Số set (select 1/3/5), Điểm/set (input, default 21), Win by 2 (toggle).
- Số đội tối đa (input number).
- Nút "← Quay lại" + "Tiếp theo →".

BƯỚC 3 — Lịch & Địa điểm:
- Ngày bắt đầu + kết thúc (date picker).
- Chọn sân (search select từ tournament_venues).
- Chọn courts sử dụng (checkboxes).
- Nút "← Quay lại" + "Tiếp theo →".

BƯỚC 4 — Phí & Xác nhận:
- Phí tham gia (input, 0 = miễn phí).
- Hiện info "Hoa hồng nền tảng: 5%".
- Summary card: recap toàn bộ thông tin.
- Checkbox xác nhận.
- Nút "Tạo giải đấu" (bg-blue-600 text-white px-8 py-3).

Mỗi bước trong card max-w-2xl mx-auto. Chuyển bước: slide nhẹ sang trái/phải.
```

---

## 📄 PROMPT 15 — Component Library

```
Tạo bộ components UI tái sử dụng, light theme, clean:

Button: Primary (bg-blue-600 text-white) | Secondary (border text-slate-700) | Danger (bg-red-600) | Ghost (no bg). Sizes sm/md/lg. Loading spinner state.

Input: Label trên, input border-slate-300 rounded-lg, focus:ring-blue-500. Error state: border-red-500 + text-red-500 dưới. Helper text slate-400.

Select: Tương tự input, dropdown panel bg-white shadow-lg rounded-lg border.

Modal: Centered, backdrop bg-black/30, card bg-white rounded-2xl shadow-2xl. Header + body + footer. Close X button.

Card: bg-white rounded-xl border border-slate-200 shadow-sm. Hover: shadow-md.

Badge: Variants: blue/green/amber/red/slate. rounded-full px-2.5 py-0.5 text-xs font-medium.

Avatar: Sizes 28/32/40/64/96 px. rounded-full. Group overlap variant.

Table: bg-white rounded-xl border. Header bg-slate-50 text-xs uppercase text-slate-500. Row hover bg-slate-50. Responsive horizontal scroll.

Tabs: Underline style: border-b, active border-b-2 border-blue-600 text-blue-600.

Pagination: Flex center, rounded-lg buttons, active bg-blue-600 text-white.

Toast: Top-right stack. Success/Error/Warning/Info. Auto-dismiss 5s. Icon + message + close X.

Skeleton: bg-slate-200 animate-pulse rounded. Variants: text line, avatar circle, card.

Empty State: Icon lớn text-slate-300 + Title text-slate-500 + Description + Action button.

Search Input: rounded-full, icon search bên trái, clear X bên phải khi có text.

Progress Bar: h-2 bg-slate-100 rounded-full, fill bg-blue-500 rounded-full.

Breadcrumb: text-sm, slash separated, items text-slate-400 hover:text-slate-600, current text-slate-800.
```

---

## 🗂️ Thứ tự ưu tiên tạo

| Ưu tiên | Trang | Lý do |
|---------|-------|-------|
| 1 | Component Library | Nền tảng cho mọi trang |
| 2 | Layout + Header | Khung chính |
| 3 | Auth (Login/Register) | Entry point |
| 4 | Trang chủ | First impression |
| 5 | Cộng đồng | Core feature |
| 6 | Danh sách Giải đấu | Core feature |
| 7 | Chi tiết Giải đấu | Core feature |
| 8 | Live Score | Killer feature |
| 9 | Xếp hạng | Engagement |
| 10 | Hồ sơ cá nhân | User management |
| 11 | Tin nhắn | Social |
| 12 | Thông báo | Social |
| 13 | Thanh toán | Business |
| 14 | Form Tạo Giải đấu | Organizer flow |
| 15 | Admin Dashboard | Admin only |
