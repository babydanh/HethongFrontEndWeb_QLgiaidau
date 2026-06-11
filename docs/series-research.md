# 🔬 Nghiên Cứu Hệ Thống Chuỗi Giải Đấu (Tournament Series)

> **Nguồn nghiên cứu:** [baseline.vn](https://baseline.vn) — Nền tảng quản lý giải đấu Pickleball/Tennis hàng đầu Đông Nam Á.
>
> **Ngày nghiên cứu:** 11/06/2026
>
> **Mục đích:** Phân tích chi tiết mô hình "Chuỗi giải đấu vòng loại tích điểm" của Baseline để thiết kế tính năng tương đương cho hệ thống Quản Lý Giải Đấu.

---

## 1. Bối Cảnh Thực Tế — "Đường Đến Superstars Cup"

### 1.1 Tổng Quan Chuỗi Giải

Hệ thống giải đấu "Đường đến Superstars Cup" được vận hành bởi CLB **Pickleball Superstar** (trụ sở tại TP.HCM) phối hợp với nền tảng **Baseline**. Đây là mô hình **Chuỗi giải đấu vòng loại tích điểm** (League/Tour) — giống như ATP Tour trong tennis chuyên nghiệp — nhưng áp dụng cho cộng đồng Pickleball phong trào tại Việt Nam.

Thay vì chỉ tổ chức 1 giải đấu đơn lẻ, BTC tạo ra một **hệ thống giải chạy qua nhiều tỉnh thành** khác nhau.

### 1.2 Dữ Liệu Thực Tế Từ Baseline.vn

Qua việc crawl trang CLB Pickleball Superstar trên baseline.vn, tôi thu thập được danh sách các giải trong chuỗi **Chặng 1 (Tháng 5-6-7/2026)**:

| # | Tên giải | Khu vực | Tỉnh/TP | Ngày | Trạng thái |
|---|----------|---------|---------|------|-----------|
| 1 | ĐÀ LẠT - ĐƯỜNG ĐẾN SUPERSTARS CUP - VÒNG TÌM KIẾM TÀI NĂNG – KHU VỰC TÂY NGUYÊN | Tây Nguyên | Lâm Đồng | 30-31/05/2026 | ✅ Finished |
| 2 | ĐÀ NẴNG - ĐƯỜNG ĐẾN SUPERSTARS CUP - VÒNG TÌM KIẾM TÀI NĂNG - KHU VỰC MIỀN TRUNG | Miền Trung | Đà Nẵng | 30-31/05/2026 | ✅ Finished |
| 3 | THANH HÓA - ĐƯỜNG ĐẾN SUPERSTARS CUP - VÒNG TÌM KIẾM TÀI NĂNG – KHU VỰC MIỀN BẮC | Miền Bắc | Thanh Hóa | 30-31/05/2026 | ✅ Finished |
| 4 | ĐÀ NẴNG - ĐƯỜNG ĐẾN SUPERSTARS CUP - VÒNG TÌM KIẾM TÀI NĂNG – KHU VỰC MIỀN TRUNG | Miền Trung | Đà Nẵng | 06-07/06/2026 | ✅ Finished |
| 5 | BẢO LỘC - ĐƯỜNG ĐẾN SUPERSTARS CUP - VÒNG TÌM KIẾM TÀI NĂNG - KHU VỰC TÂY NGUYÊN | Tây Nguyên | Lâm Đồng | 13-14/06/2026 | 🟡 Upcoming |
| 6 | ĐỨC TRỌNG - ĐƯỜNG ĐẾN SUPERSTARS CUP - VÒNG TÌM KIẾM TÀI NĂNG - KHU VỰC TÂY NGUYÊN | Tây Nguyên | Lâm Đồng | 27-28/06/2026 | 🟡 Upcoming |

**Nhận xét quan trọng:**
- Tất cả thuộc cùng 1 chuỗi "Superstars Cup" nhưng baseline.vn **KHÔNG có trang tổng hợp series** — mỗi giải là 1 tournament riêng lẻ
- Chỉ "nhóm" lại bằng tên CLB "Pickleball Superstar" trên trang CLB
- Không có bảng xếp hạng PSR tích lũy trên web (có thể chỉ có trên app mobile)
- Mỗi giải phân theo **khu vực địa lý**: Tây Nguyên, Miền Trung, Miền Bắc
- Cùng 1 khu vực có thể tổ chức nhiều giải tại nhiều địa điểm khác nhau (Đà Lạt vs Bảo Lộc vs Đức Trọng — cùng Tây Nguyên)

### 1.3 Cấu Trúc Nội Dung Chi Tiết Một Giải

Phân tích chi tiết giải "BẢO LỘC - ĐƯỜNG ĐẾN SUPERSTARS CUP":

**Thông tin chung:**
- Khuôn khổ: Nằm trong chuỗi giải đấu "The League" của Pickleball Superstar
- BTC: Pickleball Superstar
- Truyền thông & Chuyên môn: Baseline
- Đối tượng: Mở cho toàn bộ VĐV (không áp dụng cho VĐV chuyên nghiệp)
- Đăng ký qua App Baseline — điểm trình do BTC xét duyệt

**Nội dung thi đấu (5 hạng mục):**

| Hạng mục | Điểm trình tối đa | Ghi chú |
|----------|-------------------|---------|
| Đôi Nam | 5.5 | Tổng điểm 2 VĐV ≤ 5.5 |
| Đôi Hỗn Hợp | 4.8 | 1 nam + 1 nữ |
| Đôi Nữ | 4.3 | |
| Đơn Nam | 2.9 | |
| Team Event (Format PCL) | 10.0 | 4 VĐV (2 Nam, 2 Nữ), Nam max 3.0 |

**Thể thức:**
- Vòng bảng: Đánh vòng tròn tính điểm (Round Robin)
- Top 2 mỗi bảng → Vòng loại trực tiếp (Elimination)
- Tiêu chí khi hòa điểm: Hiệu số → Đối đầu trực tiếp → Bốc thăm
- Điểm số: Vòng bảng chạm 11, Chung kết chạm 15

**Lệ phí & Giải thưởng:**
- Lệ phí: 600.000 VNĐ/VĐV
- Có combo VIP 1.350.000 VNĐ (kèm quà tặng trị giá 7.500.000 VNĐ)
- Giải thưởng Đôi: Nhất 10tr, Nhì 6tr, Ba 4tr
- Giải thưởng Đơn: Nhất 8tr, Nhì 6tr, Ba 4tr
- Giải thưởng Team PCL: Nhất 12tr, Nhì 8tr, Ba 5tr

**Team Event Format PCL (đặc biệt):**
- Mỗi đội 4 VĐV (2 Nam, 2 Nữ)
- 1 trận gồm 4 hiệp: Đôi Nam → Đôi Nữ → Đôi Nam Nữ 1 → Đôi Nam Nữ 2
- Nếu hòa 2-2 → DreamBreaker (đánh đơn luân phiên)

---

## 2. Mô Hình Baseline.vn Hiện Tại

### 2.1 Cấu Trúc Baseline.vn

Baseline hiện có 4 section chính:

| Section | URL | Chức năng |
|---------|-----|----------|
| Tournaments | `/tournaments` | Danh sách giải đấu (phân trang, tìm kiếm) |
| Player Ratings | `/players` | Bảng xếp hạng DUPR (tích hợp DUPR.com) |
| Clubs | `/clubs` | Danh sách CLB (25 trang, ~500 CLB) |
| Download App | `/download` | Tải app iOS/Android |

### 2.2 Phân Tích Player Ratings

Baseline **KHÔNG tự tính rating** — họ tích hợp hệ thống **DUPR (Dynamic Universal Pickleball Rating)** từ dupr.com. Điều này có nghĩa:
- Rating là chuẩn quốc tế, được công nhận bởi các giải ATP-style
- Phân loại theo: Men Doubles, Women Doubles, Men Singles, Women Singles
- Filter theo quốc gia

**Đối với dự án của chúng ta:** Chúng ta dùng hệ thống ELO nội bộ (đã thiết kế sẵn trong Backend).

### 2.3 Phân Tích Clubs

- 25 trang, mỗi trang ~20 CLB → khoảng **500 CLB** trên nền tảng
- Top CLB: Tennis Vinh Infinity (25 giải), Diễn đàn Tennis Bắc Trung Nam (20 giải)
- Mỗi CLB hiển thị: Tên, số giải đấu đã tổ chức, vị trí
- Trang chi tiết CLB có: About, Recent Tournaments, Rankings (DUPR)
- **Pickleball Superstar** có 16 giải, trong đó 6 giải thuộc chuỗi Superstars Cup

### 2.4 Điểm Yếu Cần Baseline Chưa Giải Quyết Mà Dự Án Ta Có Thể Làm Tốt Hơn

1. **Không có trang tổng hợp Series:** Các giải trong cùng 1 chuỗi nằm rải rác, người dùng phải tự ghép nối qua tên giải
2. **Không có bảng xếp hạng PSR tích lũy trên web:** Chỉ có DUPR rating, không thấy PSR cho chuỗi giải
3. **Không có timeline/map view cho chuỗi sự kiện:** Không thể xem lộ trình tổng thể của chuỗi giải
4. **Không có cơ chế vé thẳng/vé vớt trên UI:** Logic có thể nằm ở backend/app nhưng web không thể hiện
5. **Không có Exclusion Rule visible:** Người chơi không biết mình đã bị khóa đăng ký giải tiếp hay chưa

---

## 3. Cơ Chế Vận Hành Chuỗi Giải (Từ Mô Tả Người Dùng)

Dựa trên thông tin user cung cấp, cơ chế vận hành chi tiết:

### 3.1 Phân Chia Chặng

```
CHUỖI: "Đường đến Superstars Cup 2026"
│
├── Chặng 1: "Vòng Tìm Kiếm Tài Năng" (Tháng 5-6-7/2026)
│   ├── Giải tại Đà Lạt (Tây Nguyên) — 30-31/05
│   ├── Giải tại Đà Nẵng (Miền Trung) — 30-31/05
│   ├── Giải tại Thanh Hóa (Miền Bắc) — 30-31/05
│   ├── Giải tại Đà Nẵng lần 2 (Miền Trung) — 06-07/06
│   ├── Giải tại Bảo Lộc (Tây Nguyên) — 13-14/06
│   ├── Giải tại Đức Trọng (Tây Nguyên) — 27-28/06
│   ├── [Có thể thêm: Đắk Lắk, Bình Dương, TP.HCM...]
│   │
│   └── KẾT THÚC CHẶNG 1 → Tổng kết:
│       ├── Top 2 mỗi giải → VÉ THẲNG vào Vòng Chung Kết
│       └── Top 16 điểm tích lũy (chưa có vé thẳng) → VÉ VỚT
│
├── Chặng 2: (Tháng 8-9-10/2026) — tương tự
│
└── VÒNG CHUNG KẾT: "Superstars Cup Finals"
    └── Tập hợp tất cả VĐV đã có vé
```

### 3.2 Cơ Chế Tích Điểm PSR

```
VĐV tham gia 1 giải trong chuỗi
        ↓
Thi đấu → Xếp hạng tại giải đó
        ↓
Tính điểm PSR theo hạng:
  ┌──────────────────────────────────┐
  │  Hạng  │  Điểm PSR  │  Vé      │
  ├────────┼────────────┼──────────┤
  │  🥇 1  │  100 pts   │  THẲNG   │
  │  🥈 2  │  75 pts    │  THẲNG   │
  │  🥉 3-4│  50 pts    │  -       │
  │  5-8   │  30 pts    │  -       │
  │  9-16  │  15 pts    │  -       │
  │  17+   │  5 pts     │  -       │
  └──────────────────────────────────┘
        ↓
Cộng dồn vào bảng xếp hạng chặng
        ↓
Cuối chặng → Top 16 điểm (chưa có vé thẳng) → VÉ VỚT
```

### 3.3 Exclusion Rule (Ràng Buộc Đặc Biệt)

Đây là quy tắc quan trọng nhất khiến chuỗi giải khác biệt:

- **Khi VĐV đạt Top 2 ở một giải → nhận VÉ THẲNG**
- **VĐV đã có vé thẳng → BỊ KHÓA, KHÔNG ĐƯỢC đăng ký các giải tiếp trong chặng đó**
- Mục đích: Tạo cơ hội cho nhiều VĐV khác nhau, tránh "cá mập" thâu tóm hết suất
- Tương tự quy tắc "đã lên hạng thì không đánh hạng thấp" trong thể thao chuyên nghiệp

### 3.4 Chiến Lược Của VĐV

VĐV có 2 con đường vào Vòng Chung Kết:

**Con đường 1: Vé Thẳng (Direct Entry)**
- Tham gia 1 giải → Vô địch hoặc Á quân → Có vé ngay → Nghỉ chờ Chung kết
- Rủi ro thấp nếu VĐV mạnh
- Chỉ cần 1 giải thành công

**Con đường 2: Vé Vớt (Wildcard via PSR)**
- Tham gia nhiều giải → Tích lũy điểm PSR
- Cuối chặng, top 16 điểm PSR (chưa có vé thẳng) → Vé vớt
- Chiến lược "cày giải" — phù hợp VĐV trung bình-khá
- Phải tính toán: đi giải nào, ở khu vực nào, để tối đa hóa điểm

---

## 4. Phân Tích DUPR — Hệ Thống Rating Mà Baseline Tích Hợp

### 4.1 DUPR Là Gì?

DUPR (Dynamic Universal Pickleball Rating) là hệ thống xếp hạng chính thức cho Pickleball:
- Rating từ 2.0 (người mới) đến 8.0 (chuyên nghiệp)
- Tính theo kết quả trận đấu thực tế
- Được PPA Tour, MLP, APP sử dụng làm tiêu chuẩn

### 4.2 Tương Đương Trong Dự Án Của Chúng Ta

| DUPR (Baseline) | Hệ thống của ta | Ghi chú |
|-----------------|-----------------|---------|
| DUPR Rating (2.0-8.0) | ELO Points (800-2400) | Thang đo khác nhưng cùng logic |
| Đăng ký qua App | Đăng ký qua Web | |
| Tích hợp bên thứ 3 | Tự tính nội bộ | Ta tự chủ hơn |
| Men/Women Doubles/Singles | Category (Pickleball, Tennis, Cầu lông...) | Ta rộng hơn |

### 4.3 Điểm Trình Trong Superstars Cup

Baseline dùng "điểm trình" (DUPR rating) để ràng buộc đăng ký:
- Đôi Nam: tổng điểm 2 VĐV ≤ 5.5
- Đôi Hỗn Hợp: tổng ≤ 4.8
- Đôi Nữ: tổng ≤ 4.3
- Đơn Nam: ≤ 2.9

**Trong dự án của ta:** Có thể implement bằng cách kiểm tra ELO của VĐV khi đăng ký.

---

## 5. So Sánh Với Các Mô Hình Tham Khảo Khác

### 5.1 ATP Tour (Tennis)

| Đặc điểm | ATP Tour | Superstars Cup | Dự án của ta |
|-----------|----------|----------------|-------------|
| Số giải/năm | ~70 | ~15-20 | Tùy BTC |
| Phân loại giải | Grand Slam/Masters/250/500 | Đều nhau (Chặng) | Có pointMultiplier |
| Hệ thống điểm | ATP Points | PSR Points | PSR Points |
| Bảng XH | ATP Rankings | Bảng XH Chặng | SeriesStandings |
| Vé thẳng | Top 8 auto-qualify | Top 2 mỗi giải | Cấu hình được |
| Vé vớt | Wildcard entries | Top 16 PSR | Cấu hình được |
| Exclusion | Không có | Có (đã Top 2 bị khóa) | Tùy chọn |

### 5.2 V-League (Bóng Đá Việt Nam)

| Đặc điểm | V-League | Superstars Cup |
|-----------|----------|----------------|
| Format | Round Robin toàn mùa | Nhiều giải rời rạc |
| Tích điểm | 3-1-0 per match | PSR theo hạng cuối cùng |
| Thăng/giáng hạng | Có | Không (chỉ có vé vào CK) |

---

## 6. Hiểu Cấu Trúc Dữ Liệu Cần Thiết

### 6.1 Phân Tích Quan Hệ Thực Tế

```
Pickleball Superstar (CLB/Organizer)
    │
    ├── "Đường đến Superstars Cup 2026" (TournamentSeries)
    │       │
    │       ├── Chặng 1: Tháng 5-6-7 (SeriesLeg)
    │       │       │
    │       │       ├── Event: Đà Lạt 30/05 ──→ Tournament (riêng, có thể thức riêng)
    │       │       ├── Event: Đà Nẵng 30/05 ──→ Tournament
    │       │       ├── Event: Thanh Hóa 30/05 ──→ Tournament
    │       │       ├── Event: Đà Nẵng 06/06 ──→ Tournament
    │       │       ├── Event: Bảo Lộc 13/06 ──→ Tournament
    │       │       └── Event: Đức Trọng 27/06 ──→ Tournament
    │       │       │
    │       │       └── SeriesStandings (Bảng XH tích lũy chặng 1)
    │       │               ├── VĐV A: 175 PSR (3 giải, vé thẳng từ Đà Lạt)
    │       │               ├── VĐV B: 130 PSR (4 giải, vé vớt)
    │       │               ├── VĐV C: 95 PSR  (2 giải, đang chờ)
    │       │               └── ...
    │       │
    │       ├── Chặng 2: Tháng 8-9-10 (SeriesLeg)
    │       │       └── [tương tự]
    │       │
    │       └── Vòng Chung Kết (có thể là SeriesLeg đặc biệt hoặc Tournament riêng)
    │
    └── [Các giải đơn lẻ khác]
```

### 6.2 Quan Hệ Giữa Series → Tournament

Mấu chốt thiết kế: **Một Tournament hiện tại hoàn toàn độc lập**. Tính năng Series chỉ "bọc ngoài" — nó **link** các Tournament lại với nhau chứ không thay đổi cách Tournament hoạt động.

```
TournamentSeries ←1:N→ SeriesLeg ←1:N→ SeriesEvent ←1:1→ Tournament
                                                ↑
                                        (Đây chỉ là link, Tournament vẫn hoạt động độc lập)
```

### 6.3 Khi Nào PSR Được Tính?

```
Tournament kết thúc (status = COMPLETED)
        ↓
Hệ thống kiểm tra: Tournament này có thuộc SeriesEvent nào không?
        ↓ Có
Lấy kết quả xếp hạng cuối cùng từ Tournament
        ↓
Tính PSR cho từng VĐV theo bảng điểm của SeriesLeg
        ↓
Cập nhật SeriesStandings (cộng dồn)
        ↓
Kiểm tra: VĐV có đạt ngưỡng vé thẳng không? (Top 2?)
        ↓ Có
Đánh dấu directEntry = true
        ↓
Nếu Exclusion Rule bật → KHÓA VĐV khỏi các giải tiếp trong chặng
```

---

## 7. Các Câu Hỏi Mở Từ Nghiên Cứu

### 7.1 Câu Hỏi Về Sản Phẩm

1. **Đơn vị tích điểm:** PSR tính theo cá nhân hay theo đội (participant)?
   - Pickleball Đôi: Cả 2 VĐV trong đội cùng nhận điểm hay khác?
   - Team PCL (4 người): Đội trưởng nhận hay cả 4?

2. **Exclusion Rule phạm vi:** Nếu VĐV A và B đạt Top 2 ở giải Đôi tại Đà Lạt:
   - A bị khóa đăng ký nội dung Đôi ở giải Bảo Lộc?
   - A có bị khóa đăng ký nội dung Đơn ở giải Bảo Lộc không?
   - A có bị khóa khi đăng ký Team PCL không?
   → **Khả năng cao:** Exclusion theo từng nội dung (category), không chặn cross-category

3. **Multi-category standings:** Một chuỗi giải có nhiều nội dung (Đơn Nam, Đôi Nữ, Đôi Hỗn Hợp...) — mỗi nội dung có bảng XH riêng.

4. **Grand Finals format:** Vòng chung kết là 1 Tournament riêng (tạo bình thường) hay tự động sinh từ Series?

### 7.2 Câu Hỏi Về Kỹ Thuật

1. **Luồng tạo:** BTC tạo Tournament bình thường rồi "link" vào Series, hay tạo từ wizard Series?
   → **Đề xuất:** Cho phép cả 2: tạo riêng rồi link, hoặc tạo từ trong wizard

2. **Slug hay ID:** URL Series dùng slug (`/series/superstars-cup-2026`) hay UUID?
   → **Đề xuất:** Slug cho SEO-friendly

3. **Realtime standings:** Cần WebSocket cho bảng XH hay chỉ cần ISR revalidate?
   → **Đề xuất:** ISR revalidate 60s là đủ (PSR chỉ thay đổi khi tournament kết thúc)

4. **Mobile app:** Baseline chủ yếu là mobile app, web chỉ là phụ. Dự án ta web-first hay mobile-first?

---

## 8. Bảng Tham Chiếu: Thuật Ngữ

| Thuật ngữ tiếng Việt | English | Giải thích |
|----------------------|---------|-----------|
| Chuỗi giải đấu | Tournament Series | Tập hợp nhiều giải liên kết |
| Chặng | Leg / Phase | Giai đoạn trong chuỗi (VD: Tháng 5-7) |
| Vòng Tìm Kiếm Tài Năng | Talent Scouting Round | Tên gọi cho các giải vòng loại |
| Điểm tích lũy PSR | Player Series Rating | Điểm riêng cho chuỗi giải (khác ELO) |
| Vé thẳng | Direct Entry | Top 2 mỗi giải → vào CK trực tiếp |
| Vé vớt | Wildcard | Top 16 PSR cuối chặng → vào CK |
| Exclusion Rule | Lock-out Rule | VĐV đã có vé thẳng bị khóa giải tiếp |
| Điểm trình | Skill Rating (DUPR) | Rating sẵn có của VĐV |
| Format PCL | PCL Team Format | Đánh đồng đội 4 người (2N+2N) |
| DreamBreaker | DreamBreaker | Tie-break format khi hòa 2-2 trong PCL |
| Vòng Chung Kết | Grand Finals | Giải cuối cùng của chuỗi |
| BTC | Ban Tổ Chức / Organizer | Người/nhóm tổ chức giải |

---

## 9. Tóm Tắt Phát Hiện Chính

### Baseline.vn LÀM được:
- ✅ Quản lý giải đấu đơn lẻ rất tốt (brackets, registration, scoring)
- ✅ Tích hợp DUPR rating quốc tế
- ✅ Hệ thống CLB với danh sách giải đấu
- ✅ Đăng ký giải qua app (QR code)
- ✅ Live score, reactions, sharing

### Baseline.vn CHƯA LÀM (cơ hội cho dự án ta):
- ❌ **Trang tổng hợp Series** — Hiện không có `/series` hay trang nào nhóm các giải trong cùng 1 chuỗi
- ❌ **Bảng xếp hạng PSR trên web** — Chỉ có DUPR, không thấy PSR tích lũy cho chuỗi giải
- ❌ **Map view / Timeline** — Không thể xem lộ trình địa lý của chuỗi giải
- ❌ **Exclusion Rule transparency** — Người chơi không biết mình bị khóa hay chưa
- ❌ **Cross-event analytics** — Không thể so sánh performance giữa các giải trong chuỗi
- ❌ **Countdown/Progress** — Không thể biết chuỗi giải đang ở giai đoạn nào

### Kết luận:
Nếu dự án của chúng ta implement đầy đủ tính năng Series, sẽ **vượt trội hơn** Baseline.vn về mặt trải nghiệm quản lý và theo dõi chuỗi giải đấu. Đây là "blue ocean" mà Baseline chưa cover tốt trên web.
