# 📋 Kế Hoạch Thiết Kế Chế Độ Tính Điểm Tự Do (Lite/Free Scoring Mode & Custom Overrides)

## 📌 Bối Cảnh & Vấn Đề Thực Tế (Problem Statement)
Trong các giải đấu thể thao phong trào (Pickleball, Cầu lông, Tennis, Bóng bàn) tại Việt Nam:
1. **Rất nhiều giải dùng "Luật Làng / Luật Tự Do"**: Không tuân theo các Preset tiêu chuẩn quốc tế (vd: đánh 1 set 15 điểm, đánh 1 set 8 game Tennis, đấu chạm 4 game Fast4, không áp dụng cách 2 điểm, v.v.).
2. **Preset Tiêu Chuẩn quá cứng nhắc**: Khi cài đặt Preset (Strict Rules), hệ thống tự động khóa trận, tự động báo lỗi *"Chưa đủ cách 2 điểm"*, *"Vượt quá maxPoints"* hoặc tự nhảy set khi chưa muốn kết thúc ➔ Gây lỗi nghẽn cho Trọng tài trên sân.

---

## 🎯 GIẢI PHÁP THIẾT KẾ: 2 CHẾ ĐỘ CHẤM ĐIỂM (DUAL-MODE SCORING)

Hệ thống sẽ được thiết kế lại theo **2 Chế độ Chấm Điểm rõ ràng**:

```text
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                CHẾ ĐỘ CHẤM ĐIỂM                                  │
 ├────────────────────────────────────────┬─────────────────────────────────────────┤
 │ ⚡ CHẾ ĐỘ TỰ DO (Lite / Free Mode)      │ 🛡️ CHẾ ĐỘ TIÊU CHUẨN (Strict Preset)    │
 │ (MẶC ĐỊNH CHO TẤT CẢ GIẢI ĐẤU MỚI)     │ (CHỈ BẬT KHI CẤU HÌNH GIẢI CHUYÊN NGHIỆP)│
 └────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 🛠️ CHI TIẾT TỪNG CHẾ ĐỘ & QUY TẮC VẬN HÀNH

### 1. ⚡ CHẾ ĐỘ TỰ DO (Lite / Free Mode - MẶC ĐỊNH CHÍNH)
- **Thiết lập khi Tạo/Sửa Giải**: 
  - Người tạo giải **không bắt buộc phải cài đặt** bất kỳ tham số phức tạp nào (như `setsToWin`, `pointsPerSet`, `maxPoints`, `mustWinByTwo`).
  - Hệ thống tự động đặt `mode = 'LITE'` làm mặc định.
- **Trải nghiệm Trọng tài khi Chấm điểm (Scoring Panel UI)**:
  - Nút bấm nhảy điểm theo đúng đặc thù môn:
    - **Tennis**: Nhảy điểm Game `0 ➔ 15 ➔ 30 ➔ 40 ➔ Ad` (hoặc Tiebreak số thực 1, 2, 3...).
    - **Pickleball / Cầu lông / Bóng bàn**: Nhảy điểm số thực `0 ➔ 1 ➔ 2 ➔ 3...`.
  - **KHÔNG KHÓA ĐIỂM TỰ ĐỘNG**: Trận đấu không tự động nhảy set hay khóa nút khi chạm mốc điểm. Trọng tài có thể bấm `+` / `-` điểm hoàn toàn tự do.
  - **Quyền quyết định thuộc về Trọng tài**:
    - Nút **`[🎯 Kết thúc Set]`**: Trọng tài bấm khi kết thúc một set bất kỳ.
    - Nút **`[🏆 XÁC NHẬN ĐỘI THẮNG]`**: Trọng tài chọn Đội 1 hoặc Đội 2 thắng trận và lưu kết quả mà **không bao giờ bị hệ thống chặn lỗi validation**.

---

### 2. 🛡️ CHẾ ĐỘ TIÊU CHUẨN (Strict Preset Mode - TÙY CHỌN BẬT)
- **Thiết lập khi Tạo/Sửa Giải**: 
  - Chỉ khi BTC tích chọn **`[☑ Kích hoạt Luật Tiêu Chuẩn (Strict Mode)]`**, hệ thống mới hiển thị danh sách Presets môn học.
- **Hệ thống Preset Tiêu Chuẩn (Có thể Custom Overrides)**:
  - **Badminton**: Best of 3, chạm 21, cách 2, max 30.
  - **Table Tennis**: Best of 5, chạm 11, cách 2.
  - **Pickleball Rally / Side-Out**: Chạm 11 / 15, cách 2.
  - **Tennis**: Best of 3, chạm 6 game, Tiebreak 7.
- **Cơ chế Override (Khi xảy ra sự cố trên sân)**:
  - Trọng tài có thể bấm công tắc **`[⚡ Bật Ngoại Lệ (Override)]`** ➔ Điền lý do ngoại lệ ➔ Bỏ qua mọi validation để chốt kết quả trận đấu lập tức.

---

## 📐 BỐ CỤC UI CHUẨN HÓA TRÊN WEB & FLUTTER APP

### A. Màn hình Cấu hình Giải đấu (Tournament Settings Page)
```text
[ Cấu hình Tính điểm & Thể thức ]
◉ ⚡ Chế độ Tự do (Mặc định - Trọng tài tự bấm điểm & chốt kết quả)
◯ 🛡️ Chế độ Tiêu chuẩn (Áp dụng Preset luật chạm điểm & tự động nhảy set)

  [Nếu chọn Strict Mode mới hiện rộng phần bên dưới]
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
- Mặc định `sportRules` dạng `LITE` khi khởi tạo giải mới nếu không truyền preset.
- Đảm bảo endpoint `/matches/:id/complete` nhận kết quả trực tiếp từ `LITE` mode mà không bắt buộc `isMatchComplete`.

### 2. Frontend Web (`frontend-web_qlgiaidau`)
- Cập nhật form Cấu hình giải đấu (`useManageState.ts`) cho phép chọn `LITE` (mặc định) vs `STRICT`.
- Nâng cấp UI Chấm điểm Tennis trên Web hiển thị điểm `0 ➔ 15 ➔ 30 ➔ 40 ➔ Ad` theo đúng thiết lập môn.

### 3. Mobile Flutter App (`app_quanly_giaidau`)
- Đã có sẵn nền tảng `ScorePanelNotifier` & `isLite`. Tinh chỉnh để khi `isLite = true` thì ẩn các thông báo nhắc nhở preset cứng, cho phép bấm chốt kết quả 1-click.
