import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Danh Sách Giải Đấu Thể Thao | Sporto',
  description: 'Tìm kiếm và đăng ký tham gia các giải đấu Pickleball, Cầu lông, Quần vợt, Bóng bàn phong trào và chuyên nghiệp trên Sporto.',
  openGraph: {
    title: 'Danh Sách Giải Đấu Thể Thao | Sporto',
    description: 'Tìm kiếm và đăng ký tham gia các giải đấu Pickleball, Cầu lông, Quần vợt, Bóng bàn phong trào và chuyên nghiệp.',
    url: 'https://giaidau.vnvar.com/tournaments',
    type: 'website',
  },
  alternates: {
    canonical: 'https://giaidau.vnvar.com/tournaments',
  },
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

