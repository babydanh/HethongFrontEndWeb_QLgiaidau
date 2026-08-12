# 📋 Kế Hoạch Tối Ưu Chế Độ Tính Điểm Tự Do (Lite Mode) & Đồng Bộ Setting (Web & Mobile App)

## 📌 Tôn Chỉ Kỹ Thuật: TẬN DỤNG CODEBASE CÓ SẴN (LEVERAGE EXISTING BASE)
Hệ thống **ĐÃ CÓ SẴN 100% NỀN TẢNG CƠ SỞ**:
- **Backend/DB**: Lưu `sportRules` và `scoreDetails`, hỗ trợ `revision` và kết thúc trận trực tiếp.
- **Flutter Mobile App**: Đã có `ScorePanelNotifier`, `isLite = true`, `overrideEnabled = true`, `canCompleteAs()` và bộ chuyển đổi điểm Tennis `formatTennisPoint`.
- **Frontend Web**: Đã có `resolveSportRuleView()` và `buildDefaultSportRules()`.

👉 **Kế hoạch này KHÔNG VIẾT NÓI HAY THÊM CODE TÙY BIẾN PHỨC TẠP**, mà tập trung **RÚT GỌN MÀN HÌNH SETTING (CẤU HÌNH)** và **MẶC ĐỊNH CHẾ ĐỘ TỰ DO (LITE MODE)** để giải phóng Trọng tài & Ban tổ chức!

---

## 🎯 GIẢI PHÁP 2 CHẾ ĐỘ CHẤM ĐIỂM (SETTING CẤU HÌNH)

```text
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                CẤU HÌNH CHẤM ĐIỂM                                │
 ├────────────────────────────────────────┬─────────────────────────────────────────┤
 │ ⚡ CHẾ ĐỘ TỰ DO (Lite / Free Mode)      │ 🛡️ CHẾ ĐỘ TIÊU CHUẨN (Strict Preset)    │
 │ (MẶC ĐỊNH CHO TẤT CẢ GIẢI ĐẤU MỚI)     │ (CHỈ BẬT KHI CẤU HÌNH GIẢI CHUYÊN NGHIỆP)│
 └────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 🛠️ CHI TIẾT VẬN HÀNH & ĐỒNG BỘ NỀN TẢNG

### 1. ⚡ CHẾ ĐỘ TỰ DO (Lite / Free Mode - MẶC ĐỊNH HỆ THỐNG)
- **Tại Form Cấu hình Giải (Web & App)**:
  - **Mặc định**: Ẩn/Xóa hết toàn bộ các ô nhập Preset rườm rà (`setsToWin`, `pointsPerSet`, `maxPoints`, `mustWinByTwo`).
  - Người tạo giải chỉ cần chọn **Bộ môn (Cầu lông, Pickleball, Tennis...)** là xong! Hệ thống tự động thiết lập `mode = 'LITE'`.
- **Tương tác Trọng tài khi Chấm điểm (Web & App)**:
  - **Hiển thị nấc điểm chuẩn theo Môn**:
    - **Tennis**: Điểm nấc chuẩn `0 ➔ 15 ➔ 30 ➔ 40 ➔ Ad` (hoặc Tiebreak số thực 1, 2, 3...).
    - **Pickleball / Cầu lông / Bóng bàn**: Điểm nấc số thực `0 ➔ 1 ➔ 2 ➔ 3...`.
  - **KHÔNG KHÓA ĐIỂM & BỎ HẲN VALIDATION CỨNG**: Trọng tài bấm `+` / `-` điểm hoàn toàn tự do. Trận đấu không tự động nhảy set hay chặn điểm.
  - **Quyền quyết định tuyệt đối**:
    - Nút **`[🎯 Kết thúc Set này]`**: Trọng tài bấm chốt set bất kỳ lúc nào.
    - Nút **`[🏆 XÁC NHẬN ĐỘI THẮNG]`**: Trọng tài bấm chọn Đội 1 hoặc Đội 2 thắng và lưu kết quả 1-click mà không bị hệ thống chặn lỗi validation.

---

### 2. 🛡️ CHẾ ĐỘ TIÊU CHUẨN (Strict Preset Mode - TÙY CHỌN BẬT)
- **Tại Form Cấu hình Giải**:
  - Chỉ khi BTC tích chọn **`[☑ Kích hoạt Luật Tiêu Chuẩn (Strict Mode)]`**, hệ thống mới hiển thị các ô Presets môn học.
- **Tận dụng Cơ chế Override có sẵn**:
  - Khi có sự cố trên sân (vd: VĐV bỏ cuộc hay BTC rút ngắn thời gian) ➔ Trọng tài gạt công tắc **`[⚡ Bật Ngoại Lệ (Override)]`** ➔ Nhập lý do ➔ Xóa mọi validation để chốt kết quả lập tức.

---

## 📐 BỐ CỤC UI CHUẨN HÓA CẤU HÌNH (WEB & FLUTTER APP)

### A. Màn hình Cấu hình Giải đấu (Tournament Settings UI)
```text
[ Cấu hình Tính điểm & Thể thức ]
◉ ⚡ Chế độ Tự do (Mặc định - Trọng tài tự bấm điểm & chốt kết quả)
◯ 🛡️ Chế độ Tiêu chuẩn (Áp dụng Preset luật chạm điểm & tự động nhảy set)

  [Chỉ khi chọn Strict Mode mới hiện phần bên dưới]
  ┌─────────────────────────────────────────────────────────────┐
  │ Bộ môn: Tennis                                              │
  │ • Số set thắng: [ 2 ]    • Số game/set: [ 6 ]                │
  │ • Cách 2 điểm: [x]       • Tiebreak tại: [ 6-6 ]            │
  └─────────────────────────────────────────────────────────────┘
```

### B. Màn hình Chấm điểm của Trọng tài (Score Panel UI)
```text
┌─────────────────────────────────────────────────────────────┐
│ ⚡ ĐANG CHẤM ĐIỂM TỰ DO (LITE MODE)                          │
│                                                             │
│  [ ĐỘI A ]                   vs            [ ĐỘI B ]        │
│  Game: 30                                   Game: 15        │
│  [ - ]  [ +15 ]                             [ - ]  [ +15 ]  │
│                                                             │
│  Set 1: 6 - 4  |  Set 2: Đang đánh                          │
│                                                             │
│  [ 🎯 Kết thúc Set này ]        [ 🏆 XÁC NHẬN ĐỘI THẮNG ]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 LỘ TRÌNH THỰC HIỆN DỰ ÁN (EXECUTION PLAN)

### 1. Database & Backend API (`backend-api_qlgiaidau`)
- Đảm bảo endpoint `/tournaments` mặc định `sportRules.mode = 'LITE'` nếu không truyền preset.
- Đảm bảo endpoint `/matches/:id/complete` cho phép hoàn thành trận đấu ở `LITE` mode mà không bắt buộc `isMatchComplete`.

### 2. Frontend Web (`frontend-web_qlgiaidau`)
- Tinh chỉnh form Cấu hình giải (`useManageState.ts` & Cấu hình Luật): Ẩn toàn bộ ô preset khi chọn `LITE` (mặc định).
- Cập nhật UI Chấm điểm Tennis trên Web hiển thị nấc điểm `0 ➔ 15 ➔ 30 ➔ 40 ➔ Ad` theo đúng môn Tennis.

### 3. Mobile Flutter App (`app_quanly_giaidau`)
- Tận dụng `ScorePanelNotifier` & `isLite` có sẵn: Khi `isLite = true`, ẩn hoàn toàn các thông báo nhắc nhở preset cứng, mở nút chốt kết quả 1-click.
