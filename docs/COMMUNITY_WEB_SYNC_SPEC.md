# TÀI LIỆU TOÀN DIỆN: SO SÁNH & ĐỒNG BỘ PHÂN HỆ CÂU LẠC BỘ (COMMUNITY) WEB $\rightarrow$ FLUTTER APP

> **Mục tiêu**: Chuẩn hóa toàn bộ giao diện, màu sắc, phân cấp chữ (Typography), logic nghiệp vụ và trải nghiệm người dùng của phân hệ Câu lạc bộ (CLB / Community) giữa Nền tảng Web (`frontend-web_qlgiaidau`) và Ứng dụng Di động Flutter (`app_quanly_giaidau`).

---

## MỤC LỤC
1. [Bảng So Sánh Tổng Quan (Web vs Mobile App)](#1-bảng-so-sánh-tổng-quan-web-vs-mobile-app)
2. [Quy Chuẩn Design System & Bảng Màu (Brand Blue Palette - No Gradient)](#2-quy-chuẩn-design-system--bảng-màu-brand-blue-palette---no-gradient)
3. [So Sánh & Đặc Tả Chi Tiết Từng Module / Màn Hình](#3-so-sánh--đặc-tả-chi-tiết-từng-module--màn-hình)
   - 3.1. [Danh sách Câu lạc bộ (Communities List)](#31-danh-sách-câu-lạc-bộ-communities-list)
   - 3.2. [Chi tiết CLB: Header & Điều hướng (Club Detail Header & Navigation)](#32-chi-tiết-clb-header--điều-hướng-club-detail-header--navigation)
   - 3.3. [Tab Bảng tin & Đăng bài (Social Feed & Post Composer)](#33-tab-bảng-tin--đăng-bài-social-feed--post-composer)
   - 3.4. [Tính năng Thăm dò ý kiến / Bình chọn (Poll / Vote - Facebook Style)](#34-tính-năng-thăm-dò-ý-kiến--bình-chọn-poll--vote---facebook-style)
   - 3.5. [Tab Giải đấu cấp CLB (Lite & Nâng cao & Tự động Feed)](#35-tab-giải-đấu-cấp-clb-lite--nâng-cao--tự-động-feed)
   - 3.6. [Tab Quản lý thành viên & Tag vui vẻ (Members & Tag Presets)](#36-tab-quản-lý-thành-viên--tag-vui-vẻ-members--tag-presets)
   - 3.7. [Tab Bảng xếp hạng ELO nội bộ (Club ELO Rankings & Podium)](#37-tab-bảng-xếp-hạng-elo-nội-bộ-club-elo-rankings--podium)
   - 3.8. [Tab Thư viện ảnh (Gallery & Lightbox)](#38-tab-thư-viện-ảnh-gallery--lightbox)
   - 3.9. [Tab Giới thiệu & Liên hệ (About & Social Links)](#39-tab-giới-thiệu--liên-hệ-about--social-links)
   - 3.10. [Tab Điều phối & Duyệt đơn (Moderation & Requests)](#310-tab-điều-phối--duyệt-đơn-moderation--requests)
   - 3.11. [Tab Cài đặt & Vùng nguy hiểm (Club Settings & Danger Zone)](#311-tab-cài-đặt--vùng-nguy-hiểm-club-settings--danger-zone)
   - 3.12. [Widget Chat CLB & Đa Kênh Thời Gian Thực (Unified Chat Widget)](#312-widget-chat-đồng-bộ-toàn-diện--clb-thời-gian-thực-unified-chat-widget)
   - 3.13. [Thông báo & Gắn thẻ thành viên (@Mention Notifications & Routing)](#313-thông-báo--gắn-thẻ-thành-viên-mention-notifications--routing)
4. [Kế Hoạch & Checklist Triển Khai Cho Flutter App (`app_quanly_giaidau`)](#4-kế-hoạch--checklist-triển-khai-cho-flutter-app-app_quanly_giaidau)

---

## 1. BẢNG SO SÁNH TỔNG QUAN (WEB VS MOBILE APP)

| Hạng mục | Nền tảng Web (`frontend-web`) | Ứng dụng Di động (`app_quanly_giaidau`) | Hiện trạng & Hành động cần làm trên App |
| :--- | :--- | :--- | :--- |
| **Màu thương hiệu chính (Primary)** | `bg-blue-600` (`#2563EB`), Hover: `#1D4ED8`, Tint: `#EFF6FF` | Đang dùng `AppTheme.primary` (`0xFF3AB5F6`), nhiều nút dùng mã xanh lá `0xFF059669` | 🔴 **Cần sửa**: Đổi `AppTheme.primary` thành `Color(0xFF2563EB)`. Thay toàn bộ mã `0xFF059669` ở các nút hành động (Tham gia, Duyệt, Lưu) sang màu xanh dương. |
| **Quy tắc Gradient** | **Flat / Solid Surface**: Đã loại bỏ 100% gradient đa sắc | Vẫn còn `primaryGradient`, `cardGradient` trong `AppThemeContext` | 🟡 **Cần sửa**: Chuyển các bục Podium, Card, Header sang màu phẳng (Solid Surface) có viền tinh gọn. |
| **Typography** | Phân cấp rõ ràng: Header `font-bold`, Action `font-semibold`, Body `font-medium`/`normal` | Dùng `GoogleFonts.interTextTheme`, một số chỗ `FontWeight.w900`/`w800` quá đậm | 🟢 **Tương đối tốt**: Giữ chuẩn `FontWeight.w600` cho CTA nút bấm, `w700` cho tiêu đề. |
| **Cấu trúc Tab chi tiết** | 8 Tab ngang trên màn hình lớn: `Feed`, `Tournaments`, `Members`, `Rankings`, `Gallery`, `About`, `Moderation`, `Settings` | 7 Tab trong `TabBarView`: `Feed`, `About`, `Tournaments`, `Members`, `Gallery`, `Rankings`, `Settings`. Tách `Moderation` sang màn hình `/club/:id/manage` | 🟢 **Rất hợp lý**: Giữ nguyên kiến trúc này vì Mobile màn hình nhỏ, tách trang Quản lý điều phối riêng giúp trải nghiệm tối ưu. |
| **Xóa CLB (Danger Zone)** | Bắt buộc gõ đúng 100% tên CLB mới mở khóa nút xóa | Dialog xác nhận thông thường, chưa có ràng buộc gõ tên | 🔴 **Cần bổ sung**: Thêm ô nhập tên CLB vào Dialog xác nhận xóa trên App để tránh thao tác nhầm. |
| **Xem ảnh phóng to (Lightbox)** | Modal phóng to toàn màn hình, có nút Next/Prev và chỉ số `index / total` | Lưới ảnh GridView cơ bản | 🟡 **Cần bổ sung**: Tích hợp `PhotoViewGallery` vuốt ảnh full màn hình. |

---

## 2. QUY CHUẨN DESIGN SYSTEM & BẢNG MÀU (BRAND BLUE PALETTE - NO GRADIENT)

### 2.1. Bảng mã màu chuẩn hoá (Design Tokens)

```dart
class AppClubColors {
  // Brand Blue Tokens (Đồng bộ tuyệt đối với Web Header & Buttons)
  static const Color primary = Color(0xFF2563EB);        // blue-600: Nút chính, Tab active, Icon active
  static const Color primaryDark = Color(0xFF1D4ED8);    // blue-700: Trạng thái pressed / hover
  static const Color primaryLight = Color(0xFFEFF6FF);   // blue-50:  Nền chip active, My Ranking Card
  static const Color primaryBorder = Color(0xFF93C5FD);  // blue-300: Viền input khi focus, viền tag
  static const Color primaryBadge = Color(0xFFDBEAFE);   // blue-100: Nền avatar fallback chữ cái

  // Accent & State Tokens
  static const Color danger = Color(0xFFE11D48);         // rose-600: Nút Xóa, Cấm thành viên, Từ chối
  static const Color dangerLight = Color(0xFFFFF1F2);    // rose-50:  Nền thẻ thành viên bị cấm
  static const Color dangerBorder = Color(0xFFFFE4E6);   // rose-100: Viền thẻ bị cấm
  static const Color warning = Color(0xFFF59E0B);        // amber-500: Huy hiệu xét duyệt, Vương miện Top 1
  static const Color warningLight = Color(0xFFFEF3C7);   // amber-100/70: Nền bục Podium Hạng 1

  // Neutral Solid Surfaces (Tuyệt đối KHÔNG gradient)
  static const Color coverPlaceholder = Color(0xFF0F172A); // slate-900: Nền ảnh bìa mặc định
  static const Color background = Color(0xFFF8FAFC);       // slate-50:  Nền trang, nền comment
  static const Color card = Color(0xFFFFFFFF);             // white:     Nền thẻ, form
  static const Color border = Color(0xFFE2E8F0);           // slate-200: Viền phân cách
  static const Color textPrimary = Color(0xFF0F172A);     // slate-900: Tiêu đề, tên thành viên
  static const Color textSecondary = Color(0xFF475569);   // slate-600: Phụ đề, mô tả
  static const Color textMuted = Color(0xFF94A3B8);       // slate-400: Thời gian, placeholder
}
```

---

## 3. SO SÁNH & ĐẶC TẢ CHI TIẾT TỪNG MODULE / MÀN HÌNH

### 3.1. Danh sách Câu lạc bộ (`CommunitiesScreen`)

#### 💻 Trên Web (`frontend-web_qlgiaidau/src/app/(public)/communities/page.tsx`):
- **Thanh tìm kiếm & Bộ lọc**:
  - Input tìm kiếm tên CLB (focus ring xanh `#2563EB`).
  - Dropdown Tỉnh/Thành phố.
  - Dropdown Môn thể thao (Pickleball, Tennis, Cầu lông, Bóng bàn...).
- **Card Câu lạc bộ**:
  - Ảnh bìa (hoặc `bg-slate-900` nếu chưa có ảnh).
  - Badge phương thức tham gia (Tự do: xanh dương `#2563EB`, Xét duyệt: vàng `#F59E0B`, Chỉ mời: đỏ `#E11D48`).
  - Badge địa điểm (MapPin xanh + Tên Tỉnh/Thành).
  - Logo tròn viền trắng nổi overlap mép ảnh bìa.
  - Tên CLB (hover đổi màu xanh), số lượng thành viên, số lượng giải đấu.
  - Chips danh sách môn thể thao.
- **Phân trang**: Nút trang hiện tại nền xanh `bg-blue-600 text-white`.

#### 📱 Trên Mobile App (`lib/features/community/` & `lib/features/explore/`):
- **Cần làm trên App**:
  - Kiểm tra các Card CLB trong danh sách: thay placeholder gradient cũ bằng `AppClubColors.coverPlaceholder` (`0xFF0F172A`).
  - Badge địa điểm và phương thức tham gia dùng đúng màu token chuẩn.
  - Filter Modal hỗ trợ chọn Tỉnh/Thành và Bộ môn.

---

### 3.2. Chi tiết CLB: Header & Điều hướng (`ClubDetailScreen`)

#### 💻 Trên Web (`src/app/(public)/communities/[id]/page.tsx`):
- Cover banner hiển thị ảnh bìa sắc nét.
- Nút tương tác chính:
  - Chưa tham gia: Nút "Tham gia CLB" (`bg-blue-600 text-white`).
  - Đã tham gia: Nút "Đã tham gia" / "Rời CLB".
  - Chờ duyệt: Nút "Đang chờ duyệt đơn" (`bg-amber-500 text-white`).
- Nút Bookmark / Yêu thích (`bg-blue-50 border-blue-300 text-blue-600`).
- Thanh Tabs điều hướng 8 mục.

#### 📱 Trên Mobile App (`lib/features/community/screens/club_detail_screen.dart`):
- Đang dùng `NestedScrollView` + `SliverAppBar` + `TabBar` (7 tabs).
- **Cần sửa trên App**:
  - Tại hàm `_getJoinBgColor()` (dòng 466): Đổi màu khi `_isMember` từ `Color(0xFF059669)` sang `AppClubColors.primary` (`Color(0xFF2563EB)`).
  - Nút Bookmark đổi màu icon active sang `Color(0xFF2563EB)`.

---

### 3.3. Tab Bảng tin & Đăng bài (Social Feed & Post Composer)

#### 💻 Trên Web (`CommunityPostComposer.tsx`, `CommunityPostCard.tsx`, `CommunityPostList.tsx`):
- **Composer**:
  - Input nội dung, hỗ trợ gõ `@` để chọn mention thành viên. Đã loại bỏ hàng chip "Chủ đề:" giúp form gọn gàng, tối giản.
  - Tải lên nhiều ảnh, có nút xóa từng ảnh xem trước.
  - Nút "Đăng bài" (`bg-blue-600 hover:bg-blue-700 text-white font-semibold`).
- **Post Card**:
  - Hashtag tự động highlight màu xanh `text-blue-600` trực tiếp trong văn bản bài viết. Đã loại bỏ phần topic badges để giao diện gọn gàng.
  - Lưới ảnh: 1 ảnh (full tỉ lệ), 2 ảnh trở lên (lưới 2 cột đều). Click ảnh mở `ImageLightboxModal` phóng to toàn màn hình.
  - **Quyền Xóa bài viết (`Delete Post`)**:
    - **Tác giả bài viết** (người đăng): Được quyền xóa bài của chính mình.
    - **Ban quản trị CLB** (`OWNER`, `MODERATOR`, hoặc System `ADMIN`): Được quyền xóa bài của bất kỳ ai trong CLB để kiểm duyệt nội dung.
    - Hiển thị nút Thùng rác (`Trash2`) cạnh nút Báo cáo (`Flag`) ở góc trên thẻ bài viết. Bấm vào mở hộp thoại xác nhận trước khi gọi API xóa (`DELETE /communities/:id/posts/:postId`).
  - Tương tác: Bấm Tim (`CHEER` - màu đỏ `text-rose-600`), Nút Bình luận mở danh sách comment và ô nhập comment nhanh.
  - Click vào tên tác giả bài viết hoặc người comment mở **`UserProfilePopover` (Pop-up hồ sơ thành viên)**:
    - Cover Header phẳng (`bg-slate-900`, không dùng gradient).
    - Huy hiệu vai trò tối giản không dùng icon/emoji: **"Chủ CLB"** (`bg-amber-50 text-amber-800`), **"Quản trị viên"** (`bg-blue-50 text-blue-700`), **"Thành viên"** (`bg-slate-100 text-slate-700`).
    - Huy hiệu chuỗi thắng/thua (**Winstreak / Lost streak / ELO tuần**): `Thắng xN` (xanh), `Thua xN` (đỏ), `+N ELO` (vàng).
    - **Tag vui vẻ (Fun tags)**: Hiển thị các tag do BQT gán theo đúng màu sắc preset đã lưu.
    - Điểm ELO & Cấp bậc Tier (`EloTierBadge`).
  - **Khu vực Bình luận & Trả lời phân cấp (`Nested Comments & Replies`)**:
    - **Bỏ khung nền hộp thô cứng**: Bình luận hiển thị theo dạng bubble bo cong mềm mại `rounded-2xl bg-slate-100/90 border border-slate-200/60`.
    - **Avatar & Popover cá nhân**: Hiển thị avatar tròn của người bình luận và người dùng hiện tại ở ô nhập. Click vào avatar/tên người bình luận mở ngay `UserProfilePopover`.
    - **Thích bình luận**: Nút "Thích" đổi trạng thái tim hồng (`text-rose-600 font-bold`) khi click.
    - **Trả lời phân cấp (`Reply & Indent`)**:
      - Bấm "Trả lời" hiện banner chỉ dẫn `Đang trả lời [Tên thành viên]` kèm nút `✕ Hủy`, placeholder đổi thành `Trả lời [Tên]...` và chèn tag `@Tên `.
      - Bình luận trả lời được **thụt lề vào trong** (`pl-8`) với đường viền nhánh chỉ dẫn màu xám (`before:w-0.5 before:bg-slate-200`) và avatar nhỏ gọn ($26\text{px}$).
    - **Xóa bình luận (`Delete Comment`)**:
      - **Tác giả bình luận** và **BQT CLB (`OWNER`/`MODERATOR`)** có icon Thùng rác (`Trash2`) để xóa bình luận vi phạm.
      - Backend tự động giảm `commentCount` của bài viết an toàn (`GREATEST(count - 1, 0)`).

### 3.4. Tính năng Thăm dò ý kiến / Bình chọn (Poll / Vote - Facebook Style)
- **Web**:
  - **Composer**: Nút `📊 Thăm dò ý kiến` mở form tạo Poll trực quan, cho phép thêm tối đa 10 lựa chọn, cấu hình *Đơn chọn / Đa chọn* (`allowMultipleAnswers`) và *Cho phép thành viên tự thêm lựa chọn mới* (`allowAddOptions`).
  - **Poll Card (`CommunityPollCard.tsx`)**:
    - Thanh % tiến độ (progress bar fill) mượt mà đổi màu theo trạng thái đã vote.
    - Cụm avatar người đã vote (Avatar Stack `-space-x-1.5`) ở đuôi mỗi lựa chọn.
    - Bấm vào bất kỳ avatar người vote nào đều mở Popover thông tin người dùng (`GlobalUserProfileModal`).
    - Bấm vào cụm avatar mở danh sách chi tiết những người đã chọn đáp án đó.
    - Nút `+ Thêm lựa chọn` cho phép thành viên bổ sung đáp án nếu được phép.
- **Mobile Flutter Checklist (`lib/features/community/social/`)**:
  - Model `CommunityPoll`, `CommunityPollOption`, `CommunityPollVoter` ánh xạ từ JSON post payload.
  - Widget `CommunityPollWidget` hiển thị thanh % và danh sách voter avatars.
  - Gọi API `POST /communities/:communityId/polls/:pollId/vote` (body: `{ optionId }`) khi chạm vào lựa chọn.
  - Gọi API `POST /communities/:communityId/polls/:pollId/options` (body: `{ optionText }`) khi thêm lựa chọn mới.

#### 📱 Trên Mobile App (`lib/features/community/social/`):
- `community_composer.dart` và `community_post_card.dart` đã có kết nối API Social.
- **Cần chuẩn hóa trên App**:
  - Đổi nút Đăng bài sang màu xanh `AppClubColors.primary`.
  - Không cần trường `topics` khi submit bài viết; bỏ topic badges dưới bài viết.
  - **Nút Xóa bài viết trên App**: Trong `community_post_card.dart`, kiểm tra nếu `currentUserId == post.authorId` hoặc role là `OWNER`/`MODERATOR` thì hiển thị icon Xóa (Thùng rác hoặc tùy chọn trong Popup menu), gọi API `DELETE /communities/:id/posts/:postId` và cập nhật danh sách bài viết.
  - **Bình luận phân cấp trên App**:
    - Hiển thị avatar người bình luận, bấm vào mở `MemberProfileBottomSheet`.
    - Nút "Trả lời" thiết lập `parentId` và thụt dòng câu trả lời thụt vào 16dp kèm đường kẻ nhánh.
    - Nút Thùng rác xóa bình luận cho tác giả và BQT.
  - Xây dựng `MemberProfileBottomSheet` tương tự `UserProfilePopover`: Cover phẳng, huy hiệu "Chủ CLB", chuỗi streak thắng/thua, tag vui vẻ và ELO.
  - Bổ sung `PhotoViewGallery` khi người dùng chạm vào ảnh trong bài viết để có trải nghiệm xem ảnh chất lượng cao.

---

### 3.5. Tab Giải đấu cấp CLB (Club Tournaments & Tự Động Đăng Bài Feed)

#### 💻 Trên Web (`TournamentsTab.tsx`, `TournamentTypeChoiceModal.tsx`, `CommunityPostCard.tsx`):
- **Phân loại 2 hình thức tạo giải trong CLB (`TournamentTypeChoiceModal`)**:
  1. **Giải Nhanh (Lite Tournament)** (`/communities/:id/create-lite`):
     - Tạo nhanh trong 1 màn hình đơn giản, phù hợp giải giao hữu nội bộ nhanh.
     - `tournamentType: 'CLUB'`, `visibility: 'PRIVATE'`, `entryFee: 0đ`.
     - Tự động sinh mã mời `inviteCode` và mở đăng ký `REGISTRATION_OPEN`.
     - **Tự động đăng bài lên Feed CLB** kèm thông báo mở giải mới.
  2. **Giải Nâng Cao / Tiêu Chuẩn (Advanced Tournament)** (`/organizer/tournaments/create?communityId=:id`):
     - Tạo qua Wizard 5 bước đầy đủ (thiết lập vòng tròn / loại trực tiếp, vòng bảng, ELO, địa điểm, thời gian đăng ký & thi đấu).
     - `tournamentType: 'CLUB'`, `visibility: 'PRIVATE'`, `entryFee: 0đ`.
     - **Tự động đăng bài lên Feed CLB** khi tạo thành công.
- **Tự động Xóa Bài Feed Khi Xóa Giải**:
  - Khi BQT xóa giải đấu trong CLB (dù là Lite hay Nâng Cao), Backend sẽ tự động soft-delete bài viết thông báo liên kết với giải đấu đó khỏi Bảng tin CLB.
- **Tournament Preview Card Trên Feed**:
  - Bài viết liên kết giải đấu hiển thị Card đính kèm gồm: Icon Cúp vàng, Badge `GIẢI ĐẤU CLB`, Tên môn thể thao, Tên giải đấu, Thời gian thi đấu, và nút **"Xem chi tiết giải"** dẫn thẳng tới `/tournaments/:id`.
- **Bộ lọc danh sách giải**:
  - 4 Pills trạng thái: `Tất cả`, `Sắp diễn ra`, `Đang diễn ra`, `Đã kết thúc` (Active: `bg-blue-50 text-blue-700 border-blue-300`).
  - Pills hình thức: `Tất cả`, `Nội bộ CLB`, `Giải mở rộng`.

#### 📱 Trên Mobile App (`lib/features/community/`, `community_post_card.dart`):
- **Cần làm trên App**:
  - Hỗ trợ lựa chọn tạo **Giải Nhanh (Lite)** và **Giải Nâng Cao** khi BQT bấm Tạo giải trong CLB.
  - Đồng bộ `CommunityPostModel` nhận các trường `tournamentId`, `tournamentName`, `type`.
  - Trong `community_post_card.dart`: Hiển thị thẻ **Tournament Preview Card** nổi bật khi bài viết có `tournamentId != null`, click vào điều hướng sang màn hình Chi tiết giải đấu `TournamentDetailScreen`.
  - Đảm bảo các filter chip và nút Tạo giải đấu dùng chuẩn màu `AppClubColors.primary`.

---

### 3.6. Tab Quản lý thành viên & Tag vui vẻ (Members & Tag Presets)

#### 💻 Trên Web (`MembersTab.tsx`, `TagAssignModal.tsx`):
- **Phân quyền rõ ràng**:
  - `OWNER` (Chủ nhiệm / Chủ nhóm): Toàn quyền.
  - `MODERATOR` (Quản trị viên): Duyệt bài, duyệt thành viên, gán tag.
  - `MEMBER` (Thành viên): Sinh hoạt, bình luận, tham gia giải.
- **Gán Tag tuỳ chỉnh (`TagAssignModal`)**: BQT có thể gán các tag danh hiệu (VD: "MVP Tuần", "Tay vợt triển vọng") kèm màu sắc riêng.
- **Chuyển quyền Chủ sở hữu (`ConfirmModal`)**: Yêu cầu xác nhận rõ ràng khi Chủ nhiệm chuyển quyền cho người khác.
- **Kick / Ban thành viên**: Xóa hoặc cấm thành viên kèm modal cảnh báo.

#### 📱 Trên Mobile App (`tag_assign_sheet.dart`, `club_management_screen.dart`):
- **Hiện trạng**: Đã có `TagAssignSheet` và quản lý member trong màn hình Quản lý CLB.
- **Cần làm**: Đổi nút Lưu Tag trong `TagAssignSheet` sang màu xanh `AppClubColors.primary`.

---

### 3.7. Tab Bảng xếp hạng ELO nội bộ (Club ELO Rankings & Podium)

#### 💻 Trên Web (`RankingsTab.tsx`):
- **Bục vinh danh Podium Top 3 (Flat Solid Styling - No Gradient)**:
  - **Hạng 1** (Giữa, cao nhất): Avatar viền vàng, icon Vương miện vàng `Crown`, bục `bg-amber-100/70 border-2 border-amber-300`, chữ số `I` màu hổ phách.
  - **Hạng 2** (Trái): Bục `bg-slate-50 border border-slate-300`, chữ số `II`.
  - **Hạng 3** (Phải): Bục `bg-orange-50 border border-orange-300`, chữ số `III`.
- **Thẻ thứ hạng cá nhân (My Ranking Card)**: Nằm ngay trên đầu, nền `bg-blue-50/70 border-blue-200`, avatar, tên và điểm ELO nổi bật.
- **Danh sách Hạng 4 - 20**: Thứ hạng `#`, Avatar, Tên, Huy hiệu Rank Tier (`EloTierBadge`), Tỉ lệ thắng `%`, Tỉ số Thắng-Thua, Điểm ELO màu xanh `text-blue-600`.
- **Bộ lọc**: Lọc theo Môn $\rightarrow$ Thể thức (Đơn, Đôi, Đôi nam nữ) $\rightarrow$ Giới tính (Nam, Nữ).
- **Auto-polling**: Tự động làm mới dữ liệu mỗi 30 giây.

#### 📱 Trên Mobile App (`lib/features/community/widgets/club_ranking_widget.dart`):
- **Hiện trạng**: Đã xây dựng `ClubRankingWidget` rất tốt với cả chế độ rút gọn (compact) và đầy đủ, có Timer 30s polling.
- **Cần tinh chỉnh**:
  - Đổi màu nền của `_buildMyRankingCard()` sang `AppClubColors.primary.withValues(alpha: 0.08)` và viền `AppClubColors.primary.withValues(alpha: 0.25)`.
  - Đổi màu nút "Áp dụng" trong Filter Sheet sang `AppClubColors.primary`.

---

### 3.8. Tab Thư viện ảnh (Gallery & Lightbox)

#### 💻 Trên Web (`GalleryTab.tsx`):
- Tự động tập hợp: Ảnh Logo CLB (kèm nhãn "Logo CLB"), Ảnh Bìa CLB (kèm nhãn "Ảnh bìa CLB") và Toàn bộ ảnh hoạt động do BQT tải lên.
- Nút "Upload ảnh mới" (`bg-blue-600 hover:bg-blue-700 text-white font-semibold`).
- Click ảnh mở `ImageLightboxModal` có nút trượt ảnh Trái/Phải và phím tắt bàn phím.
- Nút Xóa ảnh hoạt động với xác nhận an toàn (`ConfirmModal`).

#### 📱 Trên Mobile App (`_buildGalleryTab` trong `club_detail_screen.dart`):
- **Hiện trạng**: Đang hiển thị lưới ảnh cơ bản.
- **Cần làm**:
  - Bổ sung huy hiệu "Logo CLB" và "Ảnh bìa CLB" trên góc ảnh tương ứng.
  - Nút thêm ảnh dùng màu `AppClubColors.primary`.
  - Mở ảnh toàn màn hình có thể zoom/pinch và vuốt ngang qua lại.

---

### 3.9. Tab Giới thiệu & Liên hệ (About & Social Links)

#### 💻 Trên Web (`AboutTab.tsx`):
- Mô tả hoạt động, lịch sinh hoạt định kỳ, địa điểm.
- Danh sách liên kết mạng xã hội (Facebook, Zalo, SĐT, Website, TikTok...): hiển thị dạng tag kèm icon, link bấm chuyển hướng màu xanh `text-blue-600`.

#### 📱 Trên Mobile App (`_buildAboutTab` trong `club_detail_screen.dart`):
- **Hiện trạng**: Đã có hiển thị thông tin giới thiệu và mạng xã hội.
- **Cần làm**: Mở URL mạng xã hội qua `url_launcher`, màu icon/link đồng bộ xanh thương hiệu.

---

### 3.10. Tab Điều phối & Duyệt đơn (Moderation & Requests)

#### 💻 Trên Web (`ModerationTab.tsx`):
- **Duyệt bài viết thành viên**: Danh sách bài viết chờ duyệt, nút "Duyệt" (`bg-blue-600 text-white`) và "Từ chối" (`border-rose-200 text-rose-600`).
- **Duyệt đơn tham gia**: Xem câu trả lời khảo sát của người xin vào, nút Duyệt / Từ chối.
- **Mời thành viên mới**: Tìm kiếm theo tên/email, chọn vai trò mời (`MEMBER` / `MODERATOR`), nút "Mời".
- **Quản lý Lời mời đã gửi**: Nút thu hồi lời mời.
- **Quản lý Thành viên bị cấm**: Danh sách thành viên bị ban, nút gỡ cấm (`Unban`).

#### 📱 Trên Mobile App (`club_management_screen.dart`, `club_invites_screen.dart`):
- **Hiện trạng**: Quản lý điều phối nằm trong màn hình `ClubManagementScreen`.
- **Cần làm**: Đổi toàn bộ các nút "Duyệt" và "Mời" trong `ClubManagementScreen` sang màu xanh `AppClubColors.primary`.

---

### 3.11. Tab Cài đặt & Vùng nguy hiểm (Club Settings & Danger Zone)

#### 💻 Trên Web (`SettingsTab.tsx`):
- **Cài đặt sinh hoạt (Social Settings)**:
  - Quyền đăng bài (Tất cả thành viên / Chỉ BQT / Tắt).
  - Tùy chọn: Bài viết phải duyệt, Cho phép bình luận, Mở chat CLB, Feed công khai.
  - Quản lý Tag preset: Thêm tag mới, chọn màu HEX, xóa tag.
  - Nút "Lưu social" (`bg-blue-600 text-white`).
- **Cài đặt thông tin chung**:
  - Tên CLB, Mô tả RichText, Nội quy CLB.
  - Thay đổi Logo & Ảnh bìa.
  - Chọn Bộ môn hoạt động (Multi-select).
  - Địa điểm: Chọn Tỉnh/Thành $\rightarrow$ Chọn Quận/Huyện phụ thuộc (Cascade dropdown).
  - Quyền riêng tư (Công khai, Hạn chế, Riêng tư).
  - Chế độ tham gia (Tự do, Duyệt đơn kèm bộ câu hỏi khảo sát động, Chỉ nhận lời mời).
  - Nút "Lưu cài đặt" (`bg-blue-600 text-white`).
- **Vùng nguy hiểm (Danger Zone - Xóa CLB)**:
  - Khung cảnh báo màu đỏ `bg-rose-50 border-slate-200`.
  - Nút "Xóa Câu lạc bộ" (`bg-rose-600 text-white`).
  - **Cơ chế an toàn tuyệt đối**: Mở Dialog yêu cầu **nhập chính xác 100% tên CLB** vào ô input thì nút "Xóa vĩnh viễn" mới được kích hoạt (`confirmDisabled`).

#### 📱 Trên Mobile App (`edit_club_screen.dart`, `community_social_settings_sheet.dart`):
- **Cần làm trên App**:
  - Trong `edit_club_screen.dart`, khi Chủ nhiệm bấm Xóa CLB, hiển thị `AlertDialog` có ô `TextField` bắt buộc nhập đúng tên CLB mới cho phép bấm nút Xóa.
  - Đổi màu các nút Lưu cài đặt sang `AppClubColors.primary`.

---

### 3.12. Widget Chat CLB & Đa Kênh Thời Gian Thực (Unified Chat Widget)

#### 💻 Trên Web (`src/components/shared/UnifiedChatWidget.tsx`):
- **Nút tròn nổi kích hoạt**: Góc phải dưới (`fixed bottom-5 right-5 z-40 bg-linear-to-tr from-blue-700 to-blue-500 text-white rounded-full shadow-xl hover:scale-105 active:scale-95`). Kèm animation badge khi có tin nhắn chưa đọc hoặc thông báo mới.
- **Kiến trúc Đa Kênh (Multi-channel Modes)**:
  - **Trợ lý AI (`AI`)**: Trực tiếp hỗ trợ giải đáp thể thức giải đấu, luật ELO và điều hướng tính năng 24/7 (streaming Markdown + câu hỏi nhanh).
  - **Hỗ trợ BQT (`SUPPORT`)**: Kênh trao đổi 1-1 trực tiếp với Ban Quản Trị hệ thống.
  - **Hội thoại & Phòng Chat CLB (`ROOM`)**: Chat 1-1 riêng tư hoặc phòng chat nội bộ CLB/Cộng đồng.
- **Tính năng nâng cao (Rich Features)**:
  - **Tương tác tin nhắn**: Đính kèm nhiều ảnh (preview & remove), Bình chọn Poll tương tác, Ghim tin nhắn (Pinned Message), Trả lời trích dẫn (Quoted Reply), Thả cảm xúc Emoji Reaction đa dạng, Chia sẻ giải đấu (Tournament Share Card) tương tác mở link.
  - **Công cụ tìm kiếm trong hội thoại (In-Chat Search Engine)**: Tìm kiếm từ khóa tức thời, highlight màu vàng, điều hướng kết quả khớp bằng `<ChevronUp>`/`<ChevronDown>`/`Enter` kèm hiệu ứng viền phát sáng.
  - **Trải nghiệm UX/UI cao cấp**: Tự động đóng khi click ra ngoài (`Click-outside to close`), Nút tròn nổi cuộn nhanh về tin mới nhất (`Floating Scroll-To-Latest Button`) kèm Badge đếm tin chưa đọc khi đang xem tin cũ, Responsive 2-pane switching mượt mà trên cả Desktop lẫn Mobile.

#### 📱 Trên Mobile App (`lib/features/community/social/club_chat_screen.dart`):
- **Hiện trạng**: Đã có màn hình Chat CLB thời gian thực kết nối Socket.IO.
- **Cần làm**: Đảm bảo AppBar, nút gửi tin nhắn dùng màu `AppClubColors.primary`, đồng bộ hiển thị các loại tin nhắn đa phương tiện (ảnh, poll, ghim, reaction, tournament card).

---

### 3.12. Thông báo & Gắn thẻ thành viên (@Mention Notifications & Routing)

#### 💻 Trên Web:
- **Loại thông báo & Payload**:
  - `COMMUNITY_POST_MENTIONED`: Gắn thẻ `@TênThànhViên` trong bài viết $\rightarrow$ Điều hướng tới `/communities/[id]?postId=[postId]`, tự động smooth scroll và highlight viền xanh `target:ring-2 target:ring-blue-500` vào đúng bài viết.
  - `COMMUNITY_POST_COMMENTED`: Có người bình luận vào bài viết của mình $\rightarrow$ Điều hướng tới `/communities/[id]?postId=[postId]`.
  - `COMMUNITY_POST_APPROVED`: Bài viết chờ duyệt đã được quản trị viên duyệt $\rightarrow$ Điều hướng tới `/communities/[id]`.
  - `COMMUNITY_KICKED`: Bị kick khỏi CLB $\rightarrow$ Điều hướng tới `/communities/[id]`, `membership` chuyển về `null`, giao diện ẩn các quyền BQT và hiển thị lại nút "Tham gia".
  - `COMMUNITY_BANNED`: Bị cấm khỏi CLB $\rightarrow$ Điều hướng tới `/communities/[id]`, hiển thị cảnh báo bị cấm và chặn xin vào lại.
- **Quy chuẩn hiển thị UI**:
  - `COMMUNITY_POST_MENTIONED`: Badge màu tím indigo (`bg-indigo-100 text-indigo-800`), label `"Được nhắc tên"`.
  - `COMMUNITY_POST_COMMENTED`: Badge màu sky (`bg-sky-100 text-sky-800`), label `"Bình luận mới"`.
  - `COMMUNITY_POST_APPROVED`: Badge màu emerald (`bg-emerald-100 text-emerald-800`), label `"Bài viết được duyệt"`.
  - `COMMUNITY_KICKED` & `COMMUNITY_BANNED`: Badge màu rose (`bg-rose-100 text-rose-800`), label `"Bị mời khỏi cộng đồng"` / `"Bị cấm khỏi cộng đồng"`.

#### 📱 Trên Mobile App (`app_quanly_giaidau`):
- **Cần đồng bộ trên App**:
  - **Notification Handler / Deeplink**: Khi người dùng nhấn vào thông báo `COMMUNITY_POST_MENTIONED` hoặc `COMMUNITY_POST_COMMENTED`, App cần phân tích `redirectUrl` (`/communities/:id?postId=:postId`) để mở `ClubDetailScreen(clubId)` đồng thời chuyển đến Tab Bảng tin và cuộn đến bài viết tương ứng (hoặc mở màn hình chi tiết bài viết/bình luận).
  - **Trạng thái khi bị Kick/Ban**: Khi vào `ClubDetailScreen`, nếu API trả về trạng thái không còn là thành viên (`null`) hoặc `BANNED`, App cần cập nhật state nút bấm từ "Đã tham gia" sang "Tham gia" hoặc hiển thị banner bị cấm, vô hiệu hóa khung đăng bài/bình luận.
  - **UI Notification Tile**: Thêm nhãn và màu sắc tương ứng cho các loại thông báo: `COMMUNITY_POST_MENTIONED` (Indigo `0xFF4F46E5`), `COMMUNITY_POST_COMMENTED` (Sky `0xFF0284C7`), `COMMUNITY_KICKED` (Rose `0xFFE11D48`).

---

## 4. KẾ HOẠCH & CHECKLIST TRIỂN KHAI CHO FLUTTER APP (`app_quanly_giaidau`)

Dưới đây là danh sách công việc cụ thể theo từng file trong dự án Flutter:

### Bước 1: Cập nhật Theme & Tokens
- [ ] **File**: `lib/core/config/app_theme.dart`
  - Đổi `static const Color primary = Color(0xFF2563EB);` (thay cho `0xFF3AB5F6`).
  - Đổi `static const Color primaryDark = Color(0xFF1D4ED8);`.
  - Đổi `static const Color primaryLight = Color(0xFFEFF6FF);`.

### Bước 2: Chuẩn hóa màu sắc nút trong màn hình Chi tiết CLB
- [ ] **File**: `lib/features/community/screens/club_detail_screen.dart`
  - Thay `Color(0xFF059669)` ở nút Tham gia (`_getJoinBgColor`) sang `AppTheme.primary`.
  - Thay màu icon Bookmark khi active sang `AppTheme.primary`.
  - Gỡ bỏ các gradient không cần thiết ở bục podium và banner placeholder.

### Bước 3: Chuẩn hóa Bảng xếp hạng ELO nội bộ
- [ ] **File**: `lib/features/community/widgets/club_ranking_widget.dart`
  - Cập nhật màu nền My Ranking Card sang màu xanh tint `AppTheme.primary.withValues(alpha: 0.08)`.
  - Đổi màu nút "Áp dụng" trong `_openFilterSheet()` sang `AppTheme.primary`.
  - Đảm bảo bục Podium Top 3 sử dụng màu phẳng (Hạng 1: `Color(0xFFFEF3C7)`, Hạng 2: `Color(0xFFF8FAFC)`, Hạng 3: `Color(0xFFFFF7ED)`).

### Bước 4: Chuẩn hóa Quản lý & Điều phối CLB
- [ ] **File**: `lib/features/community/screens/club_management_screen.dart`
  - Đổi các nút "Duyệt đơn", "Mời thành viên" sang màu xanh `AppTheme.primary`.
  - Giữ màu đỏ `Color(0xFFE11D48)` cho các thao tác Từ chối, Kick, Ban.

### Bước 5: Bổ sung ràng buộc an toàn khi Xóa CLB
- [ ] **File**: `lib/features/community/screens/edit_club_screen.dart`
  - Nâng cấp Dialog xác nhận xóa CLB: Bổ sung `TextField` yêu cầu nhập chính xác tên CLB mới kích hoạt nút Xóa.

### Bước 6: Chuẩn hóa Bảng tin, Thẻ Giải Đấu & Chat CLB
- [ ] **File**: `lib/features/community/social/widgets/community_composer.dart`
  - Đổi nút "Đăng bài" sang `AppTheme.primary`.
- [ ] **File**: `lib/data/models/community_social_models.dart` & `lib/features/community/social/widgets/community_post_card.dart`
  - Đồng bộ `tournamentId`, `tournamentName`, `type`.
  - Hiển thị **Tournament Preview Card** đính kèm bài viết khi giải đấu được tạo trong CLB, bấm vào mở thẳng màn hình chi tiết giải đấu.
- [ ] **File**: `lib/features/community/social/club_chat_screen.dart`
  - Đồng bộ logic chat và đổi màu AppBar, nút Gửi tin nhắn sang `AppTheme.primary`.

### Bước 7: Đồng bộ Thông báo Gắn thẻ (@Mention) & Xử lý Điều hướng trên App
- [ ] **File**: `lib/features/notification/models/notification_model.dart` (hoặc constants tương đương)
  - Đăng ký các type mới: `COMMUNITY_POST_MENTIONED`, `COMMUNITY_POST_COMMENTED`, `COMMUNITY_POST_APPROVED`.
  - Đăng ký màu sắc & label: `Được nhắc tên` (Indigo), `Bình luận mới` (Sky), `Bị mời khỏi cộng đồng` (Rose).
- [ ] **File**: `lib/features/notification/screens/notifications_screen.dart` (hoặc router handler)
  - Xử lý click thông báo: Phân tích `redirectUrl` (`/communities/:id?postId=:postId`) $\rightarrow$ Mở `ClubDetailScreen` đúng ID và chuyển tới Tab Bảng tin/Bài viết tương ứng.
- [ ] **File**: `lib/features/community/screens/club_detail_screen.dart`
  - Xử lý khi bị Kick/Ban: Kiểm tra lại `membership` khi mở CLB từ thông báo, tự động đưa trạng thái về khách chưa tham gia hoặc bị chặn tương ứng.

---

## 3.14. Quy định Kiến trúc Thông báo Đẩy (Firebase FCM vs PostgreSQL DB)

> [!IMPORTANT]
> **QUY ĐỊNH BẮT BUỘC VỀ VAI TRÒ CỦA FIREBASE VÀ CƠ SỞ DỮ LIỆU:**
> 1. **Firebase CHỈ là cổng trung chuyển Push Notification (FCM Device Messaging):**
>    - Nhiệm vụ: Đánh thức thiết bị, nhận `fcmToken`, kích hoạt rung/chuông và hiển thị banner ra màn hình khóa khi app đang tắt (Background/Kill app).
>    - Tuyệt đối **KHÔNG dùng Firebase làm Database (Không dùng Firestore / Realtime DB)**.
> 2. **PostgreSQL + Drizzle ORM + Redis là Cơ sở dữ liệu duy nhất và thẩm quyền:**
>    - 100% dữ liệu (User, CLB, Giải đấu, Phân nhánh, Tin nhắn Chat, Bài viết, Bình luận, Bảng xếp hạng...) bắt buộc lưu trữ trong PostgreSQL và do Backend NestJS quản lý.
> 3. **Xin quyền thông báo & Quản lý vòng đời Token:**
>    - Chỉ yêu cầu quyền thông báo (`requestPermission()`) khi user đăng nhập.
>    - Tự động đăng ký `fcmToken` qua `POST /api/v1/notifications/device-token` khi đăng nhập và hủy qua `DELETE /api/v1/notifications/device-token` khi đăng xuất.
> 4. **Bảo mật tuyệt đối:**
>    - Toàn bộ file cấu hình `google-services.json`, `GoogleService-Info.plist`, `firebase-service-account.json`, `*adminsdk*.json` và thư mục `secrets/` phải được `.gitignore` bảo vệ, không bao giờ được commit lên Git.

