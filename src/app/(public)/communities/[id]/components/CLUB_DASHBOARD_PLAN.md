# Kế hoạch Chi tiết Nâng cấp Giao diện & Tính năng Câu lạc bộ (Web & Mobile App)

## 📌 Bối cảnh & Tôn chỉ "Anti-Slop / Anti-Spam"
Chuẩn hóa đồng bộ giao diện và luồng dữ liệu của trang **Chi tiết Câu lạc bộ** giữa **Web Frontend (React/Next.js)** và **Mobile App (Flutter)**.

Tôn chỉ thiết kế hàng đầu:
1. **Chống rác UI & Trùng lặp**: Bỏ hoàn toàn các ô thông tin bị trùng với Header (Địa điểm, Bộ môn, Thành viên đã có ở Header Panel).
2. **Tab "Tổng quan" (Overview Dashboard) siêu tinh gọn**: Tập trung 100% vào hoạt động thi đấu thực tế (**Ai mới đánh với ai, Giải đấu nổi bật, Top VĐV**).
3. **Tính năng Gán Tag Tùy Chỉnh / Danh Hiệu Hài Hước cho Thành Viên** (Streak Thắng/Thua, Biệt danh CLB...).
4. **Pop-up Hồ Sơ Thành Viên Nội Bộ CLB** (Club Member Profile Modal với 4 Sub-tabs) tích hợp `EloTierBadge` + Nút chuyển sang Profile chính.
5. **Kênh Chat Chung Nội Bộ CLB** có hiển thị Tag & Badge bên cạnh tên người gửi.

---

## 📊 1. CHI TIẾT GIAO DIỆN TAB 1: "TỔNG QUAN" (CLEAN DYNAMIC DASHBOARD)

Vì Header trên cùng đã hiển thị sẵn *Tên CLB, Ảnh đại diện, Địa điểm sân tập, Bộ môn, Số lượng thành viên*, nên Tab **Tổng quan** sẽ **KHÔNG lặp lại các thông tin này** nữa. 

Giao diện Tab **Tổng quan** chỉ tập trung vào 3 khối dữ liệu thi đấu thật sự:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚔️ AI MỚI ĐÁNH VỚI AI (Trận đấu mới nhất - Tối đa 3 trận)                              │
│ • Nguyễn Văn A & Trần Văn B   3 - 1   Lê Văn C & Phạm Văn D     [🟢 THẮNG (+14 ELO)]    │
│ • Nguyễn Văn A & Lê Văn E     2 - 0   Trần Văn F & Ngô Văn G     [🟢 THẮNG (+10 ELO)]    │
│ • Nguyễn Văn A & Phạm Văn H   1 - 2   Ngô Văn K & Đỗ Văn L       [🔴 THUA (-8 ELO)]     │
│                                                                        Xem tất cả →   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🏆 GIẢI ĐẤU CLB NỔI BẬT (Chỉ hiện 1 giải mới nhất / đang diễn ra)                     │
│ Summer Cup 2026 · 🟢 Đang diễn ra (32 VĐV tranh tài) · 🥇 Vô địch: Nguyễn Văn A         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 👑 TOP 3 VĐV XUẤT SẮC CLB (Tích hợp EloTierBadge)                                       │
│ 🥇 #1 Nguyễn Văn A (1,682 ELO - 👑 Tier S)   🔥 Win Streak x5                         │
│ 🥈 #2 Trần Văn B (1,542 ELO - ⚡ High Tier B) 🏆 Low Tier B                             │
│ 🥉 #3 Lê Văn C   (1,498 ELO - 🥇 Low Tier B)                                Xem BXH →  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

*Quy tắc ẩn/hiện*: Nếu CLB mới tạo chưa có trận đấu hoặc chưa có giải đấu, khối tương ứng sẽ **tự động ẩn hẳn** thay vì hiện số `0%` hay ô trống gây nghèo giao diện.

---

## 🎭 2. KẾ HOẠCH TÍNH NĂNG: GÁN TAG TÙY CHỈNH & DANH HIỆU (FUNNY & STREAK TAGS)

Hệ thống chia làm 2 loại Tag hiển thị ở Badge bên cạnh tên thành viên trong **Tab Thành viên** và **Kênh Chat**:

1. **Tag Chuỗi Phong Độ (Hệ thống tự động gán dựa trên dữ liệu thật)**:
   - 🔥 `🔥 Win Streak x3` / `🔥 Độc Cô Cầu Bại` (VĐV đang thắng liên tiếp).
   - 🧊 `🧊 Freeze Streak` / `🛑 Tìm Trận Thắng` (VĐV đang thua liên tiếp).
   - 📈 `🚀 Thăng Hạng ELO` (VĐV tăng ELO nhiều nhất tuần).

2. **Tag Biệt Danh Hài Hước / Danh Hiệu CLB (Do BQT gán thủ công)**:
   - 🤡 `[Thánh Gánh Đội]` / `[Thánh Bóp Team]`
   - 💸 `[Thủ Quỹ Quyền Lực]` / `[Thánh Nợ Quỹ]`
   - 🏸 `[Chỉ Thích Đánh Đôi]` / `[Thánh Đập Cầu]` / `[Vua Giao Hữu]`
   - 🍺 `[Thánh Nhậu Sau Trận]` / `[Chuyên Gia Dự Bị]`

---

## 🎴 3. POP-UP HỒ SƠ THÀNH VIÊN TRONG CLB (CLUB MEMBER PROFILE MODAL - 4 SUB-TABS)

Khi bấm vào Avatar hoặc Tên của một thành viên ở bất kỳ đâu trong CLB, Pop-up sẽ hiện ra với Header + **4 Sub-tabs**:

- **Top Header**: Avatar + Tên + Badge Tier ELO (`EloTierBadge`) + Tag phong độ + Danh hiệu CLB.
- **Sub-tab 1: 📊 Tổng quan CLB**: Điểm & Thứ hạng ELO nội bộ (`#3 / 328`), Tỉ lệ thắng/thua (`68% Thắng`), Cặp đôi ăn ý nhất, Thâm niên gia nhập.
- **Sub-tab 2: ⚔️ Trận đấu vừa qua**: Lịch sử 5-10 trận đấu ELO / thách đấu gần đây trong CLB kèm tỉ số.
- **Sub-tab 3: 🏆 Giải đấu tham gia**: Danh sách các giải do CLB tổ chức mà VĐV có tham gia + Thành tích (`🥇 Vô địch`, `🥈 Á quân`...).
- **Sub-tab 4: ⚙️ Cài đặt BQT (Chỉ BQT thấy)**: Modal gán Tag hài hước, Phân quyền Moderator, Kỷ luật/Mời khỏi CLB.
- **Action Footer**: Nút lớn **[👉 Xem Trang Cá Nhân Chính (Full Profile)]** chuyển hướng sang `/players/[id]`.

---

## 💬 4. KẾ HOẠCH TÍNH NĂNG: KÊNH CHAT CHUNG NỘI BỘ CLB (COMMUNITY CHAT)

- **Trên Web**: Tab **"Kênh Chat" 💬** + **Cửa sổ Chat Floating Widget ở góc dưới màn hình** (Messenger Style).
- **Trên App Mobile (Flutter)**: Tab **"Kênh Chat" 💬** + Floating Action Button (FAB).
- **Nội dung tin nhắn**:
```text
[Avatar]  Nguyễn Văn A 👑 [Chủ CLB] [🔥 Win x5] [Thánh Gánh Đội]
          Tối nay 19h sân số 3 giao lưu nhé anh em!
```

---

## 🔍 HIỆN TRẠNG & KẾ HOẠCH BẢNG MA TRẬN (FEATURE MATRIX)

| STT | Component / Feature | Backend API | Web Frontend | Mobile App (Flutter) | Kế hoạch triển khai |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Tab 1: Tổng quan Dashboard** | 🟡 Tinh chỉnh | 🟡 Cần nâng cấp | 🟡 Cần nâng cấp | Tinh gọn: Ai mới đánh với ai, Giải nổi bật, Top 3 VĐV (Không trùng Header). |
| **2** | **Tag Thành Viên & Biệt Danh** | 🟡 Thêm DB `tags` | 🟡 UI gán & hiển thị | 🟡 UI gán & hiển thị | BQT gán Tag hài hước + Hệ thống tự tính Streak Tag. |
| **3** | **Pop-up Hồ Sơ Thành Viên CLB** | ✅ APIs có sẵn | 🟡 Modal 4 Sub-tabs | 🟡 Modal 4 Sub-tabs | Modal 4 Sub-tabs (Tổng quan, Trận vừa qua, Giải đấu, QL BQT) + EloTierBadge. |
| **4** | **Kênh Chat Chung Nội Bộ** | 🟡 Bổ sung Chat API | 🟡 Tab Chat + Widget Chat | 🟡 Tab Chat + FAB Chat | Kênh chat riêng có hiển thị Member Tags cạnh tên. |
| **5** | **Tab Thách Đấu (Giao hữu)** | ✅ Backend 100% | 🟡 Thêm Tab Public | 🔴 Thêm Tab Public | Đưa danh sách thách đấu & nút thách đấu ra giao diện ngoài. |
| **6** | **Tab Giải đấu, BXH, Ảnh** | ✅ Có sẵn | ✅ Có sẵn | ✅ Có sẵn | Giữ nguyên và tối ưu giao diện. |

---

## 🔄 QUY TRÌNH THỰC HIỆN TỔNG THỂ

### Bước 1: Backend Database & REST/Realtime APIs
1. Migration DB: Thêm `tags` vào `community_members`.
2. Viết API gán Tag (`PATCH /communities/:id/members/:memberId/tags`).
3. Viết API Lấy & Gửi tin nhắn Kênh Chat CLB (`/communities/:id/chat/messages`).

### Bước 2: Web Frontend (`frontend-web_qlgiaidau`)
1. Cập nhật `AboutTab.tsx` ➔ Biến thành Dashboard **Tổng quan** siêu tinh gọn (Ai mới đánh với ai, Giải gần nhất, Top 3 ELO).
2. Tạo **Pop-up Hồ sơ Thành viên Nội bộ CLB (4 Sub-tabs)** + Modal gán Tag.
3. Tạo Tab **Kênh Chat** + Khung Chat Floating Widget góc dưới.
4. Thêm Tab **Thách đấu**.

### Bước 3: Mobile App (`app_quanly_giaidau`)
1. Cập nhật `_buildAboutTab` trong `club_detail_screen.dart` thành Dashboard Tổng quan chuẩn 1:1 với Web.
2. Tạo Pop-up Hồ sơ Thành viên Nội bộ (4 Sub-tabs) trên Flutter App + Modal gán Tag cho BQT.
3. Thêm Tab **Kênh Chat** nội bộ trên Flutter App.
