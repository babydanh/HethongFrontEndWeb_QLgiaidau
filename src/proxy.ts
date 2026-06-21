import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Các route yêu cầu người dùng phải đăng nhập
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/organizer',
  '/admin',
  '/chat'
];

// Các route chỉ dành cho khách (chưa đăng nhập)
const GUEST_ROUTES = [
  '/login',
  '/register'
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Backend set refreshToken trong cookie, ta dùng nó làm dấu hiệu nhận biết user đã login hay chưa
  // AccessToken có thể hết hạn sớm (15 phút), nên check refreshToken là an toàn nhất cho middleware
  const hasToken = request.cookies.has('refreshToken');

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isGuestRoute = GUEST_ROUTES.some(route => pathname.startsWith(route));

  // Nếu truy cập route cần login nhưng không có token -> đẩy về login
  if (isProtectedRoute && !hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Nếu truy cập route guest (như login) nhưng đã có token -> đẩy về trang chủ hoặc dashboard
  if (isGuestRoute && hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Cấu hình áp dụng middleware
export const config = {
  // Loại trừ các file tĩnh, hình ảnh, api route của Next.js (nếu có)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
