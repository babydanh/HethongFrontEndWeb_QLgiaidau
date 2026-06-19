# Coder Skills

# 🛠️ 9 Kỹ Năng Cốt Lõi Frontend (Tech Skills Map)

> **🚨 LƯU Ý TỐI QUAN TRỌNG DÀNH CHO AI AGENT:** 
> **Thay vì tự mò mẫm tìm kiếm toàn bộ hệ thống file một cách mù quáng và tốn token, BẮT BUỘC phải tham chiếu thư mục `graphify-out/` (chạy skill `/graphify` hoặc đọc file JSON/Report) để nắm cấu trúc kiến trúc và luồng dữ liệu.**
> 
> Tài liệu này quy định **chính xác** 9 nhóm kỹ năng cần thiết để xây dựng phần Frontend (Web) cho dự án.
> Mỗi kỹ năng được **map trực tiếp** với các Backend DTOs/APIs và quy cách từ `spec.md`, `plan.md`.
> **AI Agent hoặc thành viên mới:** Hãy đọc file này TRƯỚC KHI viết bất kỳ dòng code Frontend nào.

---


## Skill 1: Web Core — Next.js 15 + React 19 + TypeScript 🏗️

> **Nền tảng của toàn bộ giao diện Web.** Mọi trang, component đều chạy trên Next.js App Router.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **Node.js** | >= 20 LTS | Runtime cho Next.js dev server |
| **TypeScript** | >= 5.x (Strict mode) | Ngôn ngữ chính — **TUYỆT ĐỐI KHÔNG dùng `any`** |
| **Next.js** | >= 15.x | Framework (App Router, Server/Client Components) |
| **React** | >= 19.x | UI Library cốt lõi |

### Phải biết gì?
- **App Router (`app/`)**: Hiểu rõ cấu trúc nested layouts, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- **RSC (React Server Components)**: Mặc định mọi component là Server Component. Chỉ dùng `'use client'` khi cần hooks (`useState`, `useEffect`) hoặc event listeners (`onClick`).
- **Data Fetching**: Dùng fetch chuẩn của Next.js cho Server Component hoặc Axios/SWR/React Query cho Client Component.
- **Next Image/Font**: Tối ưu hóa ảnh với `next/image` và font với `next/font`.

### Dùng ở đâu trong dự án?
- Xuyên suốt mọi feature.
- **Relate với Backend:** Khi Server Component gọi API, cần lưu ý việc truyền Token từ cookie sang Backend.

---

## Skill 2: Styling & UI System — TailwindCSS + Headless UI 🎨

> **Hệ thống giao diện.** Yêu cầu tuân thủ đúng bảng màu (sáng trắng xanh dương), thiết kế thoáng (nhiều whitespace), hiện đại, chuyên nghiệp, không màu mè rẻ tiền.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **TailwindCSS** | >= 4.x | Utility-first CSS framework — **KHÔNG viết CSS thuần** |
| **clsx** & **tailwind-merge** | Latest | Gộp (merge) class an toàn qua hàm `cn()` |
| **Lucide React** (hoặc tương tự) | Latest | Hệ thống Icon đồng bộ |

### Phải biết gì?
- **Hàm `cn()`**: Bắt buộc dùng `cn()` để kết hợp các điều kiện CSS thay vì string template `` `${...}` `` lộn xộn.
- **Mobile-first**: Code giao diện luôn làm từ màn hình nhỏ (`sm:`, `md:`, `lg:`).
- **Tránh Hardcode**: Sử dụng các custom color/variables đã định nghĩa trong `tailwind.config.ts`.
- **Thẩm mỹ (Aesthetics)**: Thiết kế phải toát lên sự chuyên nghiệp, sạch sẽ (Clean UI). Tránh các gradient loè loẹt hoặc giao diện quá chật chội.

### Dùng ở đâu trong dự án?
- Xây dựng hệ thống UI Primitives (`components/ui/Button.tsx`, `Input.tsx`...).

---

## Skill 3: State Management — Zustand 🧠

> **Quản lý trạng thái toàn cục.** Nhẹ, nhanh, không boilerplate như Redux.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **Zustand** | Latest | Global state management |
| **zustand/middleware** | Built-in | Persist dữ liệu xuống `localStorage` |

### Phải biết gì?
- **Auth Store**: Cần lưu trữ `accessToken`, `refreshToken`, và thông tin user (`id`, `roles`). Tích hợp `persist` middleware để giữ đăng nhập khi F5.
- **UI State**: Lưu trữ trạng thái bộ lọc (filter tournaments), settings (dark mode).
- **Transient State**: Tránh lưu trữ những thứ chỉ dùng trong 1 màn hình vào Zustand.

### Dùng ở đâu trong dự án?
- Khắp nơi cần check phân quyền.
- **Relate với Backend:** Lưu giữ chính xác chuỗi JWT do Backend (`/auth/login`) sinh ra.

---

## Skill 5: Real-time Communication — Socket.io-client ⚡

> **Dữ liệu tức thời.** Nhận tỷ số Live, Chat, và thông báo Notification.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **Socket.io-client** | Latest | Kết nối với `@nestjs/websockets` của Backend |

### Phải biết gì?
- **Kết nối an toàn**: Gửi kèm JWT Access Token khi khởi tạo kết nối (trong mục `auth: { token }`).
- **Xử lý sự kiện**: Lắng nghe các event từ Backend như `score:update`, `match:status`, `chat:message`.
- **Clean up**: Bắt buộc phải `socket.off()` hoặc ngắt kết nối trong `useEffect` return function để tránh memory leak.

### Dùng ở đâu trong dự án?
- Trang **Live Score Board** (`/live/:matchId`).
- Trang **Chat Room** (`/chat/:roomId`).
- Global Header cho **Notifications**.

---

## Skill 6: Forms & Validation — React Hook Form + Zod 📝

> **Nhập liệu an toàn.** Validate phía client trước khi gửi lên Backend.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **React Hook Form (RHF)** | Latest | Quản lý state của Form (tránh re-render toàn component) |
| **Zod** | Latest | Định nghĩa Schema và validate data |
| **@hookform/resolvers** | Latest | Cầu nối giữa RHF và Zod |

### Phải biết gì?
- **Schema Mapping**: File validation schema của Zod ở Frontend (`tournamentSchema.ts`) **PHẢI HOÀN TOÀN KHỚP** với cấu trúc DTO bên Backend (`CreateTournamentDto`, `class-validator`).
- **Error UI**: Render lỗi rõ ràng ngay dưới các trường Input với class chữ màu đỏ (ví dụ: `text-red-500`).
- **Rich Text Editor (Editor.js)**: Sử dụng Editor.js làm trình soạn thảo văn bản phong phú (Rich Text) cho mô tả giải đấu. Cho phép tải ảnh trực tiếp thông qua Cloudinary Uploader API và hỗ trợ bản dịch tiếng Việt đầy đủ. Yêu cầu tải động qua component `RichTextEditor.tsx` để đảm bảo an toàn SSR trên Next.js 15 và tự động mở rộng chiều cao khi người dùng focus nhập liệu.

### Dùng ở đâu trong dự án?
- Mọi nơi có nhập liệu: Đăng ký/Đăng nhập, Tạo/Sửa Giải đấu (sử dụng RichTextEditor cho phần Mô tả), Cập nhật ELO, Tạo Nhóm (Communities).

---

## Skill 7: Charts & Visualization — Recharts 📈

> **Báo cáo & Thống kê.** Biểu đồ ELO, Bảng Admin.

| Công nghệ | Phiên bản | Vai trò trong dự án |
|---|---|---|
| **Recharts** (hoặc Chart.js) | Latest | Vẽ biểu đồ Line, Bar, Pie... |
| **(Tùy chọn) Canvas/SVG** | - | Vẽ sơ đồ thi đấu (Bracket) |

### Phải biết gì?
- Xử lý dữ liệu từ API (`elo_history_logs` từ Backend) thành mảng Object phù hợp cho trục X (thời gian) và Y (điểm ELO).
- Vẽ Bracket (Nhánh đấu) cho Single/Double Elimination là một thách thức về thuật toán xử lý toạ độ/dữ liệu dạng cây. Phải nhận cấu trúc `matches.next_match_id` từ Backend để render Node đúng luồng.

### Dùng ở đâu trong dự án?
- Trang **Profile cá nhân** (Biểu đồ ELO).
- Trang **Admin Dashboard** (Doanh thu, số user mới).
- Trang **Tournament Detail** (Xem nhánh đấu Bracket).

---

## Skill 9: Codebase Knowledge Graph — Graphify 🕸️

> **Bản đồ mã nguồn.** Quản lý và theo dõi cấu trúc kiến trúc của toàn bộ dự án để AI Agent (hoặc developer mới) có thể tham chiếu nhanh chóng.

| Công nghệ | Vai trò trong dự án |
|---|---|
| **Graphify** | Extract và kết xuất sơ đồ (AST/Semantic) dưới dạng HTML, JSON, Report |

### Phải biết gì?
- **Graphify Out (`graphify-out/`)**: Chứa kết quả report, JSON graph và HTML visualization.
- **Auto Update**: Mỗi khi thêm/sửa đổi kiến trúc file lớn, cần phải cập nhật lại Graph để các Agent đời sau có thể tham chiếu mà không bị nhầm lẫn.

---

## 📊 Ma Trận: Skill → Phase Mapping (Frontend)

| Skill | Phase 1 (Auth/Foundation) | Phase 2 (Tournaments/Live) | Phase 3 (Payments/Org) | Phase 4 (Chat/Social) | Phase 5 (Admin/Polish) |
|---|---|---|---|---|---|
| 1. Web Core (Next.js) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 2. Styling (Tailwind) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 3. State (Zustand) | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ | ⭐ |
| 4. HTTP (Axios) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| 5. Real-time (WS) | — | ⭐⭐⭐ | — | ⭐⭐⭐ | — |
| 6. Forms (RHF+Zod) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐ |
| 7. Charts (Recharts) | — | ⭐ (Bracket) | — | — | ⭐⭐⭐ |
| 8. DevOps/Tooling | ⭐⭐⭐ | ⭐ | ⭐ | ⭐ | ⭐⭐⭐ |

> ⭐⭐⭐ = Kỹ năng chính trong phase | ⭐ = Có sử dụng | — = Không cần

---

## 🚫 Công Nghệ KHÔNG ĐƯỢC Dùng (Cấm)

| ❌ Cấm ở Frontend | ✅ Thay thế bằng | Nguyên nhân |
|---|---|---|
| **JavaScript (`.js`, `.jsx`)** | TypeScript (`.ts`, `.tsx`) | Cần type an toàn giống Backend. |
| **CSS Modules, SASS** | TailwindCSS | Giữ project sạch, không đẻ thêm file styling. |
| **Redux, MobX** | Zustand | Redux quá nặng nề cho dự án này. |
| **Fetch API thuần** | Axios (qua instance chung) | Dễ làm Request/Response Interceptor (xử lý token 401). |
| **`any` type** | Định nghĩa Interface/Type | Dùng `any` làm mất ý nghĩa của việc dùng TS. |
| **Pages Router (`pages/`)** | App Router (`app/`) | Hệ thống mới của Next.js, support RSC. |
| **npm, yarn** | pnpm | Đồng bộ với repo Backend. |

---

## 🛑 QUY TẮC NGHIÊM NGẶT (STRICT RULES)
1. **KHÔNG BAO GIỜ SỬ DỤNG `any`**: TypeScript tồn tại để kiểm soát kiểu dữ liệu. Việc lạm dụng `any` (trong API, Params, hay Error Catching) sẽ làm mất hoàn toàn giá trị của ngôn ngữ. Nếu chưa rõ kiểu dữ liệu, hãy dùng `unknown`, `Record<string, unknown>` hoặc Generics `<T>`. Đặc biệt khi bắt lỗi try/catch, dùng `catch (error: unknown)` và ép kiểu an toàn.
2. **Quy tắc Quản lý Lỗi (Exception Handling) ở Backend**: KHÔNG tạo một file chứa tất cả các lỗi của hệ thống. BẮT BUỘC sử dụng kiến trúc phân tán:
    - **Tầng Base:** Tất cả các lỗi custom phải kế thừa từ `BaseException` (đặt tại `src/common/exceptions/base.exception.ts`).
    - **Tầng Global:** Các lỗi hệ thống/HTTP chung (VD: `UnauthorizedException`) đặt tại `src/common/exceptions/`.
    - **Tầng Domain:** Các lỗi nghiệp vụ (Business logic) PHẢI được định nghĩa riêng rẽ tại từng module (VD: `src/modules/tournaments/exceptions/tournament-full.exception.ts`).
    - **Global Filter:** File `http-exception.filter.ts` hoặc `base-exception.filter.ts` sẽ chịu trách nhiệm bắt tất cả các lỗi kế thừa từ `BaseException` (và các lỗi khác) để format thành chuẩn JSON thống nhất trả về cho Frontend.
3. **Luôn Cập Nhật Đồ Thị (Graphify Update)**: Bất cứ khi nào tạo thêm một chức năng/module mới, đổi cấu trúc thư mục, hoặc có thay đổi lớn về luồng dữ liệu, AI Agent **BẮT BUỘC** phải báo cáo và cập nhật lại bản đồ mã nguồn Graphify bằng cách chạy lệnh update để đảm bảo đồ thị luôn đồng bộ với code thực tế. Đọc và tham chiếu Graph để hiểu architecture thay vì đoán mò.
4. **Đồng Bộ Database Schema (Drizzle Push)**: Bất cứ khi nào có sửa đổi, thêm cột, đổi tên bảng ở phần Backend (Drizzle Schema), **BẮT BUỘC** phải chạy lệnh push/migrate database và **Restart lại Backend Server** (`pnpm start:dev`). Lý do: Drizzle ORM có cache các câu lệnh truy vấn (Prepared Statements), nếu không restart thì Node.js sẽ tiếp tục throw lỗi do cache cũ.
5. **Page Transitions & Animations (Frontend)**: KHÔNG viết animation lẻ tẻ, rườm rà. BẮT BUỘC áp dụng animation chuyển trang đồng nhất thông qua component wrapper `PageTransition` (`framer-motion`) đặt tại `src/app/template.tsx`. Các trang sẽ tự động có hiệu ứng fade-in sạch sẽ.
6. **Validation Constraints & Data Trimming (Frontend)**: Các ràng buộc (constraints) trên Zod schema của Frontend **BẮT BUỘC PHẢI KHỚP HOÀN TOÀN** với các ràng buộc của Pipes (`class-validator`) dưới Backend. Mọi chuỗi (string) do người dùng nhập trước khi gửi lên API phải được xử lý loại bỏ khoảng trắng thừa thông qua các hàm tiện ích chung tại `src/utils/string.ts` (ví dụ: `trimSpaces`, `trimAndNormalizeSpaces`).
7. **DRY (Don't Repeat Yourself) & Thư Mục Dùng Chung (Shared Modules)**: 
    - **TUYỆT ĐỐI KHÔNG** viết lại cùng một logic ở nhiều file. Mọi logic tiện ích dùng chung phải được đưa vào thư mục tương ứng.
    - `src/utils/`: Chứa các hàm hỗ trợ format (ví dụ `format.ts` cho tiền tệ/ngày tháng), parsing lỗi (`error.ts`), xử lý chuỗi (`string.ts`), v.v.
    - `src/hooks/`: Chứa các custom hooks React (ví dụ: `useDebounce.ts`, `useMediaQuery.ts`).
    - `src/constants/`: Chứa các biến cấu hình, hằng số chung (ví dụ: `config.ts`).
    - Trước khi code một logic xử lý chuỗi, thời gian, hay debounce, **PHẢI** kiểm tra xem trong các thư mục này đã có hàm nào tương tự chưa để tái sử dụng.
8. **Quy tắc React 19 & useEffect (Tránh Cascading Renders)**:
    - **TUYỆT ĐỐI KHÔNG** gọi `setState` đồng bộ trực tiếp trong thân của hàm `useEffect` hoặc hàm được gọi đồng bộ bởi `useEffect` (gây ra cảnh báo *"Calling setState synchronously within an effect can trigger cascading renders"*).
    - **Giải pháp khắc phục:**
      - Kiểm tra giá trị trạng thái hiện tại trước khi gọi cập nhật (ví dụ: `if (!isLoading) setIsLoading(true)` hoặc `if (membership !== null) setMembership(null)`).
      - Bao bọc các lời gọi hàm chứa `setState` trong `Promise.resolve().then(() => { ... })` để trì hoãn việc cập nhật sang microtask tiếp theo, thoát khỏi chu kỳ render đồng bộ hiện tại.
9. **Quy chuẩn tỷ lệ và chiều rộng của Banner / Cover Image**:
    - **TUYỆT ĐỐI KHÔNG** để tỷ lệ banner quá hẹp hoặc chiều rộng quá gò bó.
    - Banner giải đấu lớn nên sử dụng chiều rộng tối đa `max-w-screen-2xl` kết hợp chiều cao `h-[320px] md:h-[460px]`.
    - Banner câu lạc bộ / nhóm nên sử dụng chiều rộng tối đa `max-w-7xl` kết hợp chiều cao `h-[280px] md:h-[400px]`.
    - Giao diện này đảm bảo hiển thị tối đa chi tiết của ảnh bìa mà không chiếm dụng toàn bộ màn hình của người dùng.
10. **Quy tắc khai báo hàm và thứ tự gọi trong Component (Hoisting & Temporal Dead Zone)**:
    - **TUYỆT ĐỐI KHÔNG** gọi/truy cập các hàm hoặc biến được định nghĩa bằng `const` hoặc `let` (như `const fetchData = async () => ...`) trước dòng code khai báo của chúng (ví dụ: đặt `useEffect` gọi hàm ở trên dòng định nghĩa hàm).
    - **Nguyên nhân:** Biến khai báo qua `const` và `let` sẽ rơi vào vùng Temporal Dead Zone (TDZ) và không được hoisted (nâng lên đầu phạm vi hoạt động) như các hàm khai báo bằng từ khóa `function` truyền thống.
    - **Giải pháp khắc phục:** Luôn sắp xếp thứ tự code trong Component một cách khoa học:
      1. Khai báo các hook cơ bản (`useState`, `useRef`, `useRouter`,...).
      2. Khai báo các hàm callback helper (ví dụ: `fetchData`, `handleSubmit`, `handleSearch`,...).
      3. Khai báo các hook lifecycle / side effects (`useEffect` gọi các hàm callback trên).
      4. Render JSX (phần return).




---

## 📋 QUY ĐỊNH CODE CHUNG (GENERAL CODING STANDARDS)

1. **Kiến trúc Component (Component Structure)**:
   - Tách biệt UI và Logic. Các logic xử lý API, State phức tạp (ví dụ: form submission, fetch data) **PHẢI** được đưa vào các Custom Hooks đặt ở thư mục `features/*/hooks/`. Component chỉ nên chịu trách nhiệm render UI (JSX).
   - Component phải nhỏ gọn. Nếu một file `*.tsx` dài quá 300 dòng, hãy chia nhỏ thành các sub-components.

2. **Quy tắc Đặt tên (Naming Conventions)**:
   - **Thư mục (Folders)**: `kebab-case` (ví dụ: `tournament-detail`).
   - **Components & Interfaces**: `PascalCase` (ví dụ: `TournamentCard.tsx`, `interface UserProfile`).
   - **Biến, Hàm, Hooks**: `camelCase` (ví dụ: `fetchData`, `useDebounce`).
   - **Hằng số (Constants)**: `UPPER_SNAKE_CASE` (ví dụ: `MAX_PAGE_SIZE`, `DATE_FORMATS`).

3. **Giao tiếp API (API Integration)**:
   - **KHÔNG BAO GIỜ** hardcode chuỗi URL API trực tiếp bên trong Component hoặc Custom Hook (ví dụ: `axios.get('/api/v1/tournaments')`).
   - Phải tập trung khai báo endpoint và logic fetch data vào các file riêng biệt trong thư mục `features/*/api/` (ví dụ: `getTournaments.ts`) hoặc `services/endpoints.ts`.

4. **Khai báo Kiểu dữ liệu (Types/Interfaces)**:
   - **KHÔNG** định nghĩa interface đồ sộ trực tiếp bên trong file Component.
   - Các type dùng chung hoặc mapping với Backend DTOs **PHẢI** được định nghĩa ở thư mục `src/types/` (như đã quy định ở `data-types.md`).
   - Import types vào component bằng từ khóa `import type { ... }` để tối ưu bundle size.

5. **Xử lý hiển thị Lỗi (Error Handling UI)**:
   - Luôn sử dụng hàm `getErrorMessage()` từ `src/utils/error.ts` để trích xuất text lỗi từ backend.
   - Sử dụng thư viện Toast (như `react-hot-toast`) để thông báo lỗi cho người dùng một cách chuyên nghiệp. Không dùng `alert()` thuần của trình duyệt.
