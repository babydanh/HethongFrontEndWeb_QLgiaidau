/**
 * Centralized Brand Configuration & Assets
 * Tất cả logo, icon, tên ứng dụng và fallback assets được quản lý tập trung tại đây.
 * Khi cần thay đổi thương hiệu hoặc cập nhật logo, chỉ cần cập nhật file này.
 */

export const BRAND = {
  name: 'Sporto',
  tagline: 'Nền tảng Quản lý & Tổ chức Giải đấu Thể thao Toàn diện',
  domain: 'https://sporto.asia',
  
  // Brand Logos & Icons
  assets: {
    /** Logo biểu tượng (Icon only - không chữ) */
    logoIcon: '/sporto_v1.svg',
    /** Logo đầy đủ (Icon + Text) */
    logoFull: '/sporto_v1_with_text.svg',
    /** Ảnh vuông độ phân giải 512x512 */
    logo512: '/sporto_512.png',
    /** Ảnh vuông độ phân giải 1024x1024 */
    logo1024: '/sporto_1024.png',
    /** Favicon */
    favicon: '/favicon.ico',
    /** Touch icon cho thiết bị Apple / Mobile PWA */
    appleTouchIcon: '/apple-touch-icon.png',
    /** Fallback mặc định khi giải đấu / CLB / user không có ảnh */
    defaultFallback: '/sporto_v1_with_text.svg',
    defaultTournamentLogo: '/sporto_v1_with_text.svg',
    defaultCommunityLogo: '/sporto_v1_with_text.svg',
  }
} as const;

export default BRAND;
