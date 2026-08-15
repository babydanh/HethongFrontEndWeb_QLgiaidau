# Community Social Hub — Kế hoạch thực thi Web & Flutter App

> Phiên bản: 1.0 — 2026-08-12  
> Phạm vi: Backend NestJS + Web Next.js + Flutter App  
> Nguồn kế thừa: `CLUB_DASHBOARD_PLAN.md`, `WEB_APP_UI_STANDARDIZATION_PLAN.md`, audit code thật và Graphify của ba repository.  
> Tài liệu này là nguồn ưu tiên cho giai đoạn biến trang CLB thành một nơi sinh hoạt, đăng bài, trò chuyện và theo dõi hoạt động thi đấu.

---

## 1. Mục tiêu sản phẩm

Trang CLB không chỉ là trang thông tin. Nó phải trở thành một “nhóm thể thao” có nhịp sống riêng:

- Thành viên đăng bài, ảnh, bình luận, nhắc tên nhau và dùng chủ đề bài viết.
- BQT chọn chế độ đăng tự do, chỉ BQT đăng hoặc thành viên đăng nhưng phải duyệt.
- Thành viên trò chuyện realtime trong kênh chung như Messenger.
- BQT gán danh hiệu vui; hệ thống tự sinh tag phong độ từ dữ liệu trận đấu thật.
- Trận gần đây, khoảnh khắc vui, giải CLB và bảng ELO tạo nội dung tự nhiên cho nhóm.
- Web tối ưu cho màn hình rộng; App giữ cùng nghiệp vụ nhưng ít chữ, ít icon và thao tác một tay.

### Nguyên tắc sản phẩm

1. Dữ liệu thi đấu chính thức không được sửa thành dữ liệu giả. BQT chỉ được thêm tiêu đề, lời bình hoặc ảnh cho “khoảnh khắc trận đấu”.
2. Feed và chat là hai hệ thống khác nhau: feed lưu nội dung dài và thảo luận; chat phục vụ hội thoại nhanh.
3. Không hiển thị số `0`, card trống hoặc placeholder giả. Khối không có dữ liệu sẽ ẩn hoặc dùng một empty state ngắn.
4. Tag vui phải có công cụ quản trị, báo cáo và gỡ bỏ để hạn chế xúc phạm/bắt nạt.
5. Mọi danh sách tăng trưởng liên tục phải dùng cursor, không dùng offset/page ở API.
6. Tái sử dụng hệ thống ELO, tier, avatar ring, standings và màu phong độ đã có; không tạo hệ màu xếp hạng thứ hai.

---

## 2. Hiện trạng đã xác minh trong code

| Năng lực | Backend | Web | Flutter App | Kết luận |
|---|---|---|---|---|
| Dashboard CLB | Có `GET dashboard`, recent matches, featured tournament, top ranked, activity, upcoming | Có `OverviewTab` nhưng vẫn dùng mock | Có các section CLB nhưng chưa đồng bộ hoàn toàn | Nối dữ liệu thật, bỏ mock |
| Tag thành viên | Có `community_members.tags`, API PATCH, streak động | Có `TagAssignModal`, hiển thị tag | Có `TagAssignSheet`, `MemberTagChip` | Giữ và mở rộng thành thư viện tag có thiết kế |
| Chế độ tham gia | Có `OPEN`, `APPROVAL`, `INVITE_ONLY` | Có setting | Có create/edit setting | Giữ nguyên, không nhầm với duyệt bài |
| Chat CLB | Có room `CLUB`, membership guard, REST send, Socket.IO event | Chưa có UI chat CLB hoàn chỉnh | Màn chat hiện tại chủ yếu là hỗ trợ admin | Xây UI riêng; nâng API lịch sử sang cursor |
| Đăng bài/feed | Chưa có module riêng | Chưa có feed thật | Chưa có feed thật | Xây mới |
| Ảnh CLB | Có gallery | Có gallery | Có gallery | Gallery độc lập; post attachment dùng chung uploader nhưng không dùng gallery làm feed |
| Thách đấu CLB | Đã loại khỏi phạm vi sản phẩm | Không hiển thị | Không hiển thị | Giữ dữ liệu/schema cũ chỉ để tương thích lịch sử |
| Bảng ELO CLB | Có community ranking/rankings scope | Có ranking components | Có `ClubRankingWidget`, tier/rank avatar | Tái sử dụng, bổ sung “đang lên phong độ” |

### Nợ kỹ thuật cần xử lý trước khi mở social rộng

- `OverviewTab.tsx` còn mock trận, giải và top player.
- Chat history hiện lấy tối đa một batch và sắp xếp tăng dần; chưa có cursor tải tin cũ.
- Web đang xác định membership bằng cách quét member list; phải dùng endpoint `my-membership`.
- Gateway có event gửi trực tiếp chỉ broadcast; luồng chat CLB phải đi qua service lưu DB rồi mới broadcast.
- App chưa có repository/notifier riêng cho club chat và community posts.
- Một số file CLB Flutter đang lớn; feature mới phải tách widget/repository/notifier, không nhồi tiếp vào `club_detail_screen.dart`.

---

## 3. Kiến trúc thông tin của trang CLB

### 3.1 Web — bố cục trang chính

Sau header CLB và thanh tab, tab mặc định là `Bảng tin`.

```text
┌──────────────────── Header CLB + membership actions ────────────────────┐
├──────────────────────── Tabs gọn, sticky ───────────────────────────────┤
│ Bảng tin | Thành viên | Giải đấu | BXH | Ảnh | Quản lý                │
├───────────────────────────┬──────────────────────────────────────────────┤
│ LEFT 320px, sticky        │ MAIN FEED, minmax 0/1fr                     │
│                           │                                              │
│ Khoảnh khắc gần đây       │ Composer: “Chia sẻ với CLB…”                │
│ - ảnh hoặc 2 avatar       │ - text, ảnh, mention, chủ đề                 │
│ - ai đấu với ai, tỉ số    │ - trạng thái duyệt rõ trước khi gửi         │
│ - lời bình vui của BQT    │                                              │
│                           │ Pinned post (nếu có)                         │
│ Trận sắp tới              │ Post list cursor                            │
│ Mini BXH / phong độ       │ Comments rút gọn + tải thêm cursor           │
└───────────────────────────┴──────────────────────────────────────────────┘
                                      [Chat CLB launcher]
```

Quy tắc:

- Desktop từ `lg`: 2 cột, trái 300–320px; feed tối đa khoảng 720px để đọc dễ.
- Tablet: cột trái chuyển thành carousel/card ngang phía trên feed.
- Mobile web: cùng thứ tự với App, không cố giữ hai cột.
- Chat launcher nằm cùng cụm launcher nổi hiện có nhưng tách biểu tượng và trạng thái khỏi trợ lý AI; không để hai nút đè nhau.

### 3.2 Flutter App — cùng nghiệp vụ, bố cục gọn

App không sao chép layout desktop. Tab mặc định vẫn là `Bảng tin`, nhưng thứ tự là:

1. Composer một dòng: avatar + “Chia sẻ…”; bấm mở full-screen composer/bottom sheet.
2. “Đang diễn ra” dạng horizontal cards: khoảnh khắc trận, trận sắp tới, top phong độ.
3. Pinned post nếu có.
4. Feed vô hạn dùng cursor.
5. FAB/chat bubble mở `ClubChatScreen`; unread badge chỉ hiện khi có tin chưa đọc.

Nguyên tắc Flutter UI:

- Một card chỉ có tối đa một hành động chính và menu overflow.
- Không lặp tên CLB, số thành viên, địa chỉ trong feed.
- Ưu tiên avatar/ảnh/tỉ số; mô tả phụ tối đa 2 dòng.
- Reaction bar chỉ hiện nhãn khi đã chọn; mặc định dùng icon đơn sắc nhỏ.
- Composer dùng bottom sheet/full-screen, tránh form dài chen trong feed.
- Sử dụng `AsyncNotifier`, repository interface và Dio client chung; không gọi Dio trực tiếp từ screen mới.

---

## 4. Mô hình nội dung

### 4.1 Bài viết

Một post gồm:

- Nội dung text: tối đa 5.000 ký tự; phase đầu không cần rich text phức tạp.
- 0–10 ảnh; phase đầu chưa hỗ trợ video để giảm rủi ro upload/transcode.
- Chủ đề: tối đa 3 topic do CLB định nghĩa hoặc topic hệ thống.
- Mention: người dùng phải là member JOINED tại thời điểm đăng.
- Audience: `MEMBERS` mặc định; `PUBLIC` chỉ cho CLB public và khi setting cho phép.
- Trạng thái: `PENDING`, `PUBLISHED`, `REJECTED`, `HIDDEN`, `DELETED`.
- Có thể liên kết `matchId` hoặc `tournamentId` để tạo post hoạt động chính thức.
- BQT có thể ghim tối đa 3 bài.

### 4.2 Bình luận

- Hai cấp: comment và reply; không tạo cây vô hạn.
- Mỗi post tải trước 2–3 comment mới/được tương tác; “Xem thêm” dùng cursor.
- Thành viên sửa/xóa comment của mình; BQT ẩn comment và ghi moderation reason.
- Mention trong comment dùng cùng cơ chế với post.

### 4.3 Reaction vui nhưng an toàn

Reaction đề xuất phase đầu:

- `LIKE` — Thích
- `CHEER` — Cố lên
- `RESPECT` — Nể
- `LAUGH` — Cười
- `CLUTCH` — Gánh đội

Không dùng reaction mang nghĩa sỉ nhục trực tiếp. Nội dung chê vui nằm ở tag BQT hoặc lời bình và vẫn có thể báo cáo/gỡ bỏ.

### 4.4 Bốn loại “tag” phải tách rõ

| Loại | Ví dụ | Ai tạo | Lưu ở đâu |
|---|---|---|---|
| Member title | `Thánh gánh đội`, `Vua giao hữu` | BQT | assignment member ↔ tag definition |
| System streak | `Thắng x5`, `ELO tăng tuần` | Backend tính | Không lưu assignment cố định |
| Post topic | `Kèo tối nay`, `Ảnh giải`, `Thông báo` | BQT định nghĩa; member chọn | post topic mapping |
| Mention | `@Minh Anh` | Người viết | mention mapping + notification |

Không tái sử dụng một cột text array cho cả bốn loại.

### 4.5 Thiết kế tag thành viên

BQT tạo một thư viện tag cho từng CLB:

- `name`: 2–24 ký tự.
- `tone`: một trong `SLATE`, `BLUE`, `EMERALD`, `AMBER`, `ROSE`, `VIOLET`.
- `style`: `SOFT`, `OUTLINE`, `DASHED`.
- `iconKey`: tùy chọn, lấy từ whitelist; mặc định không icon.
- `description`: chỉ hiện trong màn quản trị.
- `isAssignable`: cho phép tạm khóa tag mà không xóa assignment lịch sử.
- Một member tối đa 5 tag, UI chỉ hiện 2 tag + `+n`.

Web dùng color token/Tailwind đã có. App map `tone/style` sang `AppTheme`; không lưu mã màu tùy ý để tránh UI loạn và tương phản kém.

### 4.6 Khoảnh khắc trận đấu ở cột trái

Nguồn dữ liệu ưu tiên:

1. Trận COMPLETED thuộc tournament/community.
2. Challenge đã hoàn thành giữa hai CLB.
3. Bài post có liên kết match và được BQT đánh dấu `FEATURED_MOMENT`.

Card gồm ảnh trận hoặc avatar các bên, tên ngắn, tỉ số, thời gian và một “lời bình” tối đa 80 ký tự. Lời bình không sửa tỉ số/kết quả. Ví dụ:

- “Lội ngược dòng sau set đầu.”
- “Kèo này căng hơn lời hẹn.”
- “Chuỗi thắng đã bị chặn.”

BQT có thể viết lời bình; nếu không có, backend sinh câu trung tính từ kết quả thật.

---

## 5. Cài đặt và quyền

### 5.1 Setting tham gia hiện có

Giữ nguyên:

- `OPEN`: vào ngay.
- `APPROVAL`: xin vào và BQT duyệt.
- `INVITE_ONLY`: chỉ lời mời.

### 5.2 Setting social mới

Tách khỏi `joinMode`:

```text
postingPolicy: ALL_MEMBERS | MODERATORS_ONLY
postApprovalPolicy: NONE | ALL_MEMBER_POSTS
commentPolicy: MEMBERS | MODERATORS_ONLY | DISABLED
chatPolicy: MEMBERS | MODERATORS_ONLY | DISABLED
publicFeedEnabled: boolean
mediaPostingEnabled: boolean
memberTaggingEnabled: boolean
```

Quy tắc:

- Owner/Moderator luôn có thể đăng nếu CLB hoạt động.
- `ALL_MEMBER_POSTS`: member tạo post `PENDING`; BQT nhận queue và notification.
- Khi đổi policy, bài đang pending không tự publish.
- Member BANNED/REJECTED không đọc nội dung members-only, không chat, không comment.
- Guest chỉ thấy public feed nếu CLB public và `publicFeedEnabled=true`.

### 5.3 Ma trận quyền chính

| Hành động | Guest | Member | Moderator | Owner |
|---|---:|---:|---:|---:|
| Xem public post | Có | Có | Có | Có |
| Xem members-only | Không | Có | Có | Có |
| Đăng bài | Không | Theo policy | Có | Có |
| Duyệt/ẩn/ghim bài | Không | Không | Có | Có |
| Bình luận/chat | Không | Theo policy | Có | Có |
| Tạo/thiết kế/gán tag | Không | Không | Có | Có |
| Đổi policy | Không | Không | Không | Có |
| Xem audit moderation | Không | Không | Có | Có |

---

## 6. Backend và database

### 6.1 Bảng mới

1. `community_settings`
   - `community_id` unique FK
   - các policy ở mục 5.2
   - `updated_by`, `updated_at`

2. `community_posts`
   - `id`, `community_id`, `author_id`
   - `content`, `audience`, `status`, `post_type`
   - `match_id`, `tournament_id` nullable
   - `moderated_by`, `moderation_reason`, `published_at`
   - `pinned_at`, `pinned_by`
   - `created_at`, `updated_at`, `deleted_at`

3. `community_post_media`
   - `post_id`, `media_type=IMAGE`, `url`, `width`, `height`, `sort_order`

4. `community_post_topics` và `community_post_topic_links`
   - topic thuộc từng CLB; slug unique trong community

5. `community_post_mentions`
   - `post_id`, `user_id`, unique pair

6. `community_comments`
   - `post_id`, `author_id`, `parent_id` nullable (chỉ một cấp)
   - `content`, `status`, timestamps, soft delete

7. `community_comment_mentions`

8. `community_reactions`
   - `target_type=POST|COMMENT`, `target_id`, `user_id`, `reaction_type`
   - unique target + user; đổi reaction là update, không insert thêm

9. `community_tag_definitions`
   - thiết kế tag theo mục 4.5

10. `community_member_tag_assignments`
    - `community_member_id`, `tag_id`, `assigned_by`, `assigned_at`

11. `community_moderation_logs`
    - actor, action, target type/id, before/after JSON có giới hạn, reason, timestamp

12. `community_content_reports`
    - reporter, target type/id, reason code, note, status, resolved by/at
    - unique một báo cáo đang mở cho mỗi reporter/target để tránh spam

13. `community_member_preferences`
    - notification level `ALL|MENTIONS|IMPORTANT|MUTE`
    - mute chat/feed riêng, `muted_until`, timestamps

14. `chat_read_states`
    - `room_id`, `user_id`, `last_read_message_id`, `last_read_at`
    - unique room/user; dùng tính unread mà không quét toàn bộ lịch sử

### 6.2 Tương thích tag hiện tại

- Không xóa ngay `community_members.tags`.
- Migration chuyển tag text hiện có thành `community_tag_definitions` + assignments.
- Trong một release chuyển tiếp, response có thể trả cả `tags` legacy và `memberTags` mới.
- Khi Web và App đã đọc `memberTags`, mới đánh dấu legacy deprecated; xóa ở migration riêng sau đó.

### 6.3 Index bắt buộc

- Feed: `(community_id, status, published_at DESC, id DESC)`.
- Pending queue: `(community_id, status, created_at DESC, id DESC)`.
- Comments: `(post_id, created_at DESC, id DESC)`.
- Chat messages: `(room_id, created_at DESC, id DESC)`.
- Mentions: `(user_id, created_at DESC)` hoặc index theo notification pipeline.
- Reaction unique theo target/user.
- Assignment unique theo member/tag.
- Report queue: `(community_id, status, created_at DESC, id DESC)`.
- Chat read state unique `(room_id, user_id)` và lookup theo `last_read_at`.

### 6.4 Cursor contract thống nhất

Mọi endpoint danh sách trả:

```json
{
  "data": [],
  "meta": {
    "limit": 20,
    "nextCursor": "opaque-token-or-null",
    "hasMore": false
  }
}
```

Cursor là token opaque encode cặp khóa sort, tối thiểu `{ timestamp, id }`. Client không tự giải mã. Khi filter/topic/sort thay đổi, client xóa cursor chain và tải lại trang đầu.

Không gửi `page`, `offset`, `totalPages` cho feed/chat/comment. Có thể trả `approximateCount` riêng nếu UI thực sự cần.

### 6.5 REST API đề xuất

#### Feed

- `GET /communities/:id/posts?cursor=&limit=&topic=&authorId=&sort=LATEST`
- `POST /communities/:id/posts`
- `GET /communities/:id/posts/:postId`
- `PATCH /communities/:id/posts/:postId`
- `DELETE /communities/:id/posts/:postId`
- `POST /communities/:id/posts/:postId/submit`
- `POST /communities/:id/posts/:postId/moderate` — approve/reject/hide
- `POST /communities/:id/posts/:postId/pin`
- `DELETE /communities/:id/posts/:postId/pin`

#### Comments/reactions

- `GET /communities/:id/posts/:postId/comments?cursor=&limit=`
- `POST /communities/:id/posts/:postId/comments`
- `PATCH/DELETE /communities/:id/comments/:commentId`
- `PUT /communities/:id/reactions` — idempotent upsert
- `DELETE /communities/:id/reactions?targetType=&targetId=`
- `POST /communities/:id/reports` — báo cáo post/comment, idempotent theo reporter/target đang mở

#### Tag/settings/moderation

- `GET/PUT /communities/:id/social-settings`
- `GET/POST /communities/:id/member-tags`
- `PATCH/DELETE /communities/:id/member-tags/:tagId`
- `PUT /communities/:id/members/:userId/member-tags`
- `GET /communities/:id/moderation/posts?cursor=&status=PENDING`
- `GET /communities/:id/moderation/logs?cursor=&limit=`
- `GET /communities/:id/moderation/reports?cursor=&status=OPEN`
- `POST /communities/:id/moderation/reports/:reportId/resolve`
- `GET/PUT /communities/:id/my-preferences`

#### Dashboard/moments/ranking

- Giữ `GET /communities/:id/dashboard`, mở rộng có version hoặc field additive.
- `GET /communities/:id/moments?cursor=&limit=` nếu cần xem toàn bộ.
- Bảng xếp hạng tiếp tục dùng ranking endpoint hiện có và `EloTierBadge`/tier mapping hiện hành.

#### Chat

- Giữ lazy-create: `GET /chat/rooms?type=CLUB&communityId=:id`.
- Nâng `GET /chat/rooms/:id/messages?cursor=&limit=30`.
- Giữ `POST /chat/messages`, bắt buộc trim, có text hoặc ảnh hợp lệ.
- `PUT /chat/rooms/:id/read` cập nhật message cuối đã đọc; `GET room` trả `unreadCount`.
- Response và socket payload dùng chung một `ChatMessageDto` gồm sender snapshot, member tags, attachments, createdAt.

`POPULAR` không đưa vào MVP vì điểm phổ biến thay đổi liên tục sẽ làm cursor nhảy/trùng. Chỉ mở ở phase sau khi có `rank_snapshot_at` hoặc thuật toán cursor ổn định đã được test.

### 6.6 Realtime events

Namespace `/chat` cho chat; namespace `/communities` hoặc gateway riêng cho feed:

- `chat:club:message`
- `chat:message:deleted`
- `chat:typing` (throttle; không lưu DB)
- `chat:read` (chỉ phát trong room, không phát toàn CLB)
- `community:post:published`
- `community:post:updated`
- `community:comment:created`
- `community:reaction:updated`

Client phải dedupe theo `id`; REST là nguồn sự thật, socket chỉ cập nhật nhanh. Reconnect phải refetch delta/trang đầu, không tin rằng socket đã nhận đủ.

### 6.7 Upload và bảo mật

- Dùng uploader hiện có; backend chỉ nhận URL đã xác thực/allowlist.
- Giới hạn ảnh, dung lượng, MIME, kích thước; xóa metadata nhạy cảm nếu pipeline hỗ trợ.
- Sanitize text/output; phase đầu plain text nên không render HTML từ user.
- Rate limit riêng: post, comment, reaction, chat, mention.
- Client gửi `Idempotency-Key` khi tạo post/comment/chat; backend lưu hoặc dedupe trong cửa sổ thời gian phù hợp để chống double-tap/retry tạo bản sao.
- Notification mention chỉ tạo sau khi post được publish, không tạo lúc còn pending.
- Soft delete cho post/comment; file media cleanup bằng job bất đồng bộ.
- Audit mọi hành động duyệt, ẩn, ghim, đổi policy và gán tag.

---

## 7. Web implementation

### 7.1 Cấu trúc feature

```text
src/features/community-social/
  api.ts
  types.ts
  schemas.ts
  hooks/
  components/
    CommunityFeed.tsx
    PostComposer.tsx
    PostCard.tsx
    CommentThread.tsx
    MatchMomentCard.tsx
    CommunitySidebar.tsx
    ClubChatDrawer.tsx
    MemberTagDesigner.tsx
    ModerationQueue.tsx
```

- Axios instance chung; không dùng fetch thuần.
- TypeScript strict, không `any`; parse unknown response an toàn.
- RHF + Zod cho composer, comment, tag designer và settings; constraint khớp DTO backend.
- Zustand chỉ giữ UI global thực sự cần như drawer chat/unread; feed data không đưa vào global store.
- Cursor state nằm trong hook/controller của feed; merge theo ID và giữ scroll position.

### 7.2 Feed UX

- First load: 3 skeleton cards có chiều cao gần nội dung thật.
- Load thêm bằng IntersectionObserver; luôn có nút “Tải thêm” fallback.
- Optimistic reaction; rollback nếu API lỗi.
- Post/comment tạo mới chỉ optimistic khi policy là publish ngay. Nếu cần duyệt, hiển thị riêng “Đang chờ duyệt”, không chèn như đã public.
- Ảnh dùng `next/image`, aspect ratio từ metadata để tránh layout shift.
- Deep link `/communities/:id/posts/:postId` mở post detail hoặc modal có URL thật.

### 7.3 Chat launcher

- Launcher có avatar/logo CLB nhỏ, unread count và tooltip `Chat CLB`.
- Click mở drawer 360–400px; desktop giữ tại góc phải, mobile web mở full screen.
- Nếu hệ thống đã có launcher LLM/assistant, dùng `FloatingLauncherStack` xếp dọc theo cùng token khoảng cách; không chồng nút.
- Chat tải 30 tin mới nhất; kéo lên đầu tải cursor cũ và bù scroll offset để màn hình không giật.
- Tin của mình căn phải, người khác căn trái; tên/tag chỉ hiện khi sender thay đổi hoặc cách nhau đủ thời gian.

---

## 8. Flutter implementation

### 8.1 Cấu trúc feature

```text
lib/features/community_social/
  domain/
    entities/
    repositories/
  data/
    models/
    repositories/
  providers/
  screens/
  widgets/
```

- `CommunityFeedNotifier extends FamilyAsyncNotifier` hoặc pattern Riverpod 3 tương đương.
- `ClubChatNotifier` quản lý messages, cursor, socket lifecycle và unread.
- Screen chỉ render và gửi intent; parsing/API ở repository.
- Không thêm logic social lớn vào `club_detail_screen.dart`; file đó chỉ gắn tab/shell.

### 8.2 Feed mobile

- `CustomScrollView`/slivers; composer và moments là sliver đầu.
- Pagination trigger trước cuối danh sách 3–5 item, có khóa chống request trùng.
- Cache ảnh với component hiện có; giữ aspect ratio.
- Khi refresh: giữ feed cũ trong lúc tải nếu có thể, tránh trắng màn hình.
- Post composer là route/full sheet; chọn ảnh, topic, mention theo từng bước ngắn.
- Bấm avatar/tag mở member profile sheet hiện có, không tạo popup thứ hai.

### 8.3 Chat mobile

- Full-screen `ClubChatScreen`, mở từ FAB hoặc tab.
- Reverse list hoặc anchor logic đúng để tải tin cũ mà không nhảy vị trí.
- Socket reconnect có backoff; lifecycle pause/resume đúng khi app background.
- Gửi REST để lưu và nhận socket echo; dedupe bằng ID/idempotency key.
- Draft text lưu local theo `communityId`; không lưu attachment nhạy cảm sau khi gửi.

---

## 9. Bảng xếp hạng và tính năng vui bổ sung

Giữ standings/ELO hiện có làm nguồn sự thật. Bổ sung các lát cắt, không tạo thuật toán điểm mới:

- `Top phong độ tuần`: ELO delta 7 ngày.
- `Chuỗi đang chạy`: thắng/thua liên tiếp từ match history.
- `Cặp ăn ý`: cặp doubles có số trận và win rate tốt, yêu cầu ngưỡng tối thiểu để tránh 1 trận đã đứng đầu.
- `Đối thủ duyên nợ`: hai người/cặp gặp nhau nhiều nhất.
- `Khoảnh khắc lội ngược dòng`: chỉ khi score detail chứng minh được.
- `Gương mặt tích cực`: dựa vào activity/reaction có kiểm soát, không cộng vào ELO.

Các chỉ số vui cần tooltip “Chỉ số hoạt động CLB, không ảnh hưởng ELO”. Không tạo leaderboard tiêu cực như “thua nhiều nhất” mặc định; nếu BQT dùng tag vui thì phải có quyền gỡ và member có thể báo cáo.

---

## 10. Kế hoạch theo phase

### Phase 0 — Chốt contract và dọn nền

1. Chốt DTO/schema/settings/tag taxonomy trong tài liệu API.
2. Nối `OverviewTab` với dashboard thật và xóa toàn bộ mock.
3. Web dùng `my-membership`, không quét member list để xác định quyền.
4. Chuẩn hóa chat message DTO giữa REST và socket.
5. Chuyển chat history sang cursor, test không trùng/không hụt khi hai message cùng timestamp.

**DoD:** không còn mock trên trang CLB; dashboard/chat contract có test; build cả backend và web qua.

### Phase 1 — Backend social foundation

1. Tạo schema/migration settings, posts, media, topics, mentions, comments, reactions, tag definitions và moderation logs.
2. Generate migration bằng Drizzle, review SQL, chạy migrate ở môi trường kiểm thử và restart backend.
3. Implement permission policy tập trung trong service/guard dùng chung.
4. Implement feed/comments/reactions cursor API.
5. Implement notification outbox cho mention, comment, post approved.
6. Viết unit/integration test cho policy và cursor.

**DoD:** API contract Swagger đầy đủ; migration rollback strategy rõ; không N+1 ở feed; test quyền Guest/Member/Moderator/Owner qua.

### Phase 2 — Web feed MVP

1. Xây layout hai cột và responsive collapse.
2. Composer text + ảnh + topic + mention.
3. Post card, reaction, comment hai cấp và cursor.
4. Pending state và moderation queue.
5. Sidebar moments/recent matches/mini ranking từ dữ liệu thật.
6. Pinned posts và deep link.

**DoD:** flow member đăng tự do và flow cần duyệt đều chạy; reload không mất trạng thái; Playwright happy/negative path qua.

### Phase 3 — Chat CLB kiểu Messenger

1. Backend cursor history, persistence-before-broadcast, typing throttle, delete moderation.
2. Web launcher stack + drawer/full-screen responsive.
3. Member tags, avatar, unread, reconnect/dedupe.
4. App repository/notifier/chat screen dùng cùng contract.

**DoD:** hai tài khoản gửi/nhận realtime; restart/reconnect không mất hoặc nhân đôi tin; non-member bị chặn cả REST và WS.

### Phase 4 — Flutter feed parity

1. Tạo feature `community_social`, repository interface và AsyncNotifier.
2. Composer mobile, moments carousel, post feed cursor.
3. Comment/reaction/mention/topic.
4. Moderation queue và social settings cho BQT.
5. Gắn member profile sheet/tag designer đã có.

**DoD:** app có đủ nghiệp vụ Web nhưng UI mobile gọn; widget/golden test các trạng thái chính; analyze không có lỗi mới.

### Phase 5 — Tags, fun insights và polish

1. Migrate tag text legacy sang tag definition/assignment.
2. Tag designer Web/App với token màu cố định.
3. Weekly movers, pair chemistry, rivalry và match moments.
4. Activity-to-post: BQT có thể chia sẻ giải/trận thành post bằng một thao tác.
5. Accessibility, empty/error/loading, image performance và analytics sự kiện sản phẩm.

**DoD:** tag đồng nhất Web/App/chat/member profile; chỉ số vui có nguồn dữ liệu và tooltip; không ảnh hưởng ELO.

### Phase 6 — Hardening và rollout

1. Load test feed/chat; kiểm tra query plan/index.
2. Rate limit, upload abuse, mention spam, XSS, IDOR, member removed while socket connected.
3. Feature flags: `communityFeed`, `communityChat`, `communityTagDesigner`.
4. Rollout nội bộ → vài CLB thử nghiệm → toàn bộ.
5. Dashboard theo dõi error rate, latency, rejected upload, WS reconnect và moderation backlog.

**DoD:** có rollback bằng feature flag; p95 feed/chat đạt ngưỡng đã chốt; không có P0/P1 security finding.

---

## 11. Kiểm thử bắt buộc

### Backend

- Cursor ổn định khi cùng timestamp, item mới chèn giữa hai lần load và item bị xóa.
- Policy matrix đầy đủ.
- Mention chỉ member, notification chỉ sau publish.
- Moderator của CLB A không thao tác được CLB B.
- Member bị kick/ban mất quyền REST và WS ngay.
- Reaction idempotent và unique.

### Web Playwright

- Member đăng tự do; post xuất hiện đúng một lần.
- Member gửi bài cần duyệt; chỉ BQT thấy queue; approve mới hiện feed.
- Upload ảnh lỗi có retry, không tạo post rỗng.
- Infinite scroll không trùng item, đổi topic reset cursor.
- Chat mở từ launcher, tải tin cũ không giật, reconnect không nhân đôi.
- Responsive 375px, 768px, 1280px.

### Flutter

- Provider/repository parsing contract.
- Pull-to-refresh giữ last good data khi mạng chập chờn.
- Pagination chống double request.
- Composer, post card, moderation sheet, tag designer và chat golden/widget tests.
- Background/resume socket và unread badge.

### Visual QA

- So sánh Web/App cùng dữ liệu thật: avatar, tag, ELO tier, post state, reaction count.
- Kiểm tra tiếng Việt dài, ảnh dọc/ngang, user không avatar, tag đủ 5 và tên dài.
- Không có text trắng trên nền sáng, overflow, card mock hay icon thừa.

---

## 12. Performance budget

- Feed first response: limit 15–20; không load toàn bộ post/comment/member.
- Chat first response: 30 tin mới nhất; kéo lên mới tải tiếp.
- Comments preview: tối đa 3/post; tải thêm độc lập.
- Ảnh tạo thumbnail/size phù hợp; không tải ảnh gốc cho card feed.
- REST query feed không N+1; reaction/comment summary aggregate theo batch.
- Socket payload nhỏ, không gửi toàn bộ post list sau mỗi thay đổi.
- App giữ tối đa số page hợp lý trong RAM và giải phóng media ngoài viewport.

---

## 13. Quy tắc thực thi theo skills.md

- Đọc Graphify trước mỗi phase; chạy `graphify update .` sau thay đổi kiến trúc.
- Backend: NestJS module/service/repository rõ trách nhiệm; DTO class-validator; Drizzle migration chính thức; restart sau schema migration.
- Web: Next.js App Router, TypeScript strict không `any`, Axios chung, Tailwind + `cn()`, RHF/Zod, Socket cleanup đầy đủ.
- Flutter: Clean Architecture feature-first, Riverpod `Notifier/AsyncNotifier`, repository abstraction, UI tiếng Việt và lỗi thân thiện.
- Không chỉnh sửa phá vỡ thay đổi chưa commit của user; commit theo từng repository và từng phase.
- Mỗi phase phải chạy lint/typecheck/build/test tương ứng trước khi push CI/CD.

---

## 14. Những việc chưa làm ở MVP

- Video post/livestream trong feed.
- Marketplace/quỹ CLB trong post.
- Thuật toán đề xuất feed bằng AI.
- Story 24 giờ.
- Thread comment nhiều tầng.
- Mã màu tag hoàn toàn tùy ý.
- Chấm điểm ELO từ reaction/activity social.

Các mục này chỉ xem xét sau khi feed, moderation, chat và cursor ổn định ở production.
