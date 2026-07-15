/**
 * Tạo link chia sẻ tĩnh của Facebook
 */
export function getFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/**
 * Tạo link chia sẻ tĩnh của Zalo
 */
export function getZaloShareUrl(url: string): string {
  return `https://sp.zalo.me/share?utm_source=zaloshare&url=${encodeURIComponent(url)}`;
}

/**
 * Tạo link gửi tin nhắn qua Messenger
 */
export function getMessengerShareUrl(url: string, appId?: string): string {
  const isMobile = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // URL Scheme mở trực tiếp App Messenger trên điện thoại để hiện bảng chọn bạn bè nằm ngang
    return `fb-messenger://share?link=${encodeURIComponent(url)}`;
  }

  // Trên Máy tính: Sử dụng Web Send Dialog qua trình duyệt
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://giaidau.vnvar.com';
  const targetAppId = appId || '1217981644879628';
  return `https://www.facebook.com/dialog/send?app_id=${targetAppId}&link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(currentDomain)}`;
}

interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

/**
 * Điều phối hành vi chia sẻ
 * Trả về true nếu thiết bị đã xử lý chia sẻ qua Web Share API (di động).
 * Trả về false nếu thiết bị không hỗ trợ (máy tính), cần hiển thị Modal/UI chia sẻ thủ công.
 */
export async function triggerShare(options: ShareOptions): Promise<boolean> {
  const { title, text = '', url } = options;

  // Chỉ dùng Web Share API trên thiết bị di động (Mobile/Tablet) để tránh hiện khay share thô của Windows/macOS trên Desktop
  const isMobile = typeof window !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true; // Chia sẻ thành công qua khay hệ thống
    } catch (error) {
      console.warn('[Share] Web Share API bị hủy hoặc gặp lỗi:', error);
      // Nếu người dùng hủy khay chia sẻ, ta không cần hiện thêm Modal
      return true; 
    }
  }

  return false; // Thiết bị Desktop hoặc không hỗ trợ, cần mở Modal thủ công
}
