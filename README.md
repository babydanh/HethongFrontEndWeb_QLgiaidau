# 🏆 VNVAR - Tournament Management Web Application

> **Hệ sinh thái công nghệ VAR thể thao phong trào đầu tiên tại Việt Nam**  
> 🌐 **Production Portal**: [https://giaidau.vnvar.com](https://giaidau.vnvar.com)

---

## 📌 Giới thiệu dự án (About VNVAR)

**VNVAR** (`giaidau.vnvar.com`) là nền tảng Web Application mã nguồn mở cao cấp thuộc hệ sinh thái **VNVAR**, tiên phong ứng dụng công nghệ **VAR (Video Assistant Referee)** và AI vào công tác tổ chức, điều hành các giải đấu thể thao phong trào (Pickleball, Cầu lông, Tennis) tại Việt Nam.

Dự án giúp Ban tổ chức, Trọng tài, Câu lạc bộ và VĐV dễ dàng vận hành giải đấu một cách tự động, minh bạch và chuyên nghiệp.

---

## ✨ Tính năng nổi bật (Key Features)

### 🏆 1. Quản lý Giải đấu & Vận hành Chuyên nghiệp
- **Khởi tạo & Cấu hình Giải đấu**: Hỗ trợ giải Đơn / Đôi, các bộ môn Pickleball, Cầu lông, Tennis...
- **Tự động hóa Xếp lịch & Bảng đấu**: Tự động sinh nhánh đấu loại trực tiếp (**Single Elimination**) và vòng bảng (**Round Robin**) chuẩn quốc tế.
- **Tính toán ELO Realtime**: Hệ thống tính điểm ELO VĐV và xếp hạng Tier (`👑 Tier S`, `🔥 High Tier A`, `⚡ High Tier B`...).
- **Cổng Đăng ký & Thanh toán Lệ phí**: Hỗ trợ đăng ký thi đấu, xác nhận thanh toán trực tuyến & hoàn phí tự động khi rút lui.

### 🎥 2. Hệ thống VAR & Livestream Trực tiếp
- **VAR Video Review**: Tích hợp luồng xem lại video tranh chấp tình huống trên sân cho Trọng tài.
- **Live Score Realtime**: Cập nhật tỉ số trận đấu từng điểm số theo thời gian thực qua WebSocket.
- **Overlay Livestream**: Tự động xuất tỉ số trận đấu chuẩn broadcast cho các kênh Livestream.

### 👥 3. Hồ sơ Câu lạc bộ & Dashboard Năng động
- **Overview Dashboard**: Hiển thị kết quả thi đấu vừa diễn ra ("Ai mới đánh với ai"), giải đấu nổi bật và Top 3 VĐV xuất sắc.
- **Gán Tag & Biệt danh Thành viên**: Hệ thống gán Streak Tag phong độ (`🔥 Win Streak x5`, `🧊 Freeze Streak`) và biệt danh vui CLB.
- **Pop-up Profile Nội bộ (4 Sub-tabs)**: Xem chi tiết chỉ số thi đấu CLB, lịch sử trận đấu, giải đã tham gia và phân quyền BQT.
- **Thách đấu Liên CLB**: Tính năng thách đấu giao hữu tự động khởi tạo giải đấu 2 bên.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Glassmorphism UI
- **State Management**: Zustand
- **Realtime / Socket**: Socket.io-client / WebSockets
- **HTTP Client**: Axios
- **Deployment**: Vercel / Nginx Reverse Proxy (`https://giaidau.vnvar.com`)

---

## 🚀 Hướng dẫn Chạy ứng dụng ở Local (Development Guide)

### Yêu cầu hệ thống (Prerequisites)
- Node.js >= 18.x
- npm / yarn / pnpm

### các bước cài đặt:

1. **Clone repository**:
   ```bash
   git clone https://github.com/babydanh/HethongFrontEndWeb_QLgiaidau.git
   cd HethongFrontEndWeb_QLgiaidau
   ```

2. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

3. **Cấu hình file môi trường (`.env.local`)**:
   ```env
   NEXT_PUBLIC_API_URL=https://giaidau.vnvar.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://giaidau.vnvar.com
   ```

4. **Khởi chạy Development Server**:
   ```bash
   npm run dev
   ```
   Mở trình duyệt truy cập `http://localhost:3000`.

5. **Build cho Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔗 Liên kết & Mạng xã hội (Official Links)

- 🌐 **Official Website**: [https://giaidau.vnvar.com](https://giaidau.vnvar.com)
- 📖 **Open Source Program**: OpenAI Codex for Open Source Participant
- 📧 **Liên hệ**: `macter.970@gmail.com`

---

## 📄 Bản quyền & Giấy phép (License)

Dự án được phát hành dưới bản quyền mở phục vụ cộng đồng thể thao phong trào Việt Nam.  
© 2026 **VNVAR Ecosystem**. All rights reserved.
