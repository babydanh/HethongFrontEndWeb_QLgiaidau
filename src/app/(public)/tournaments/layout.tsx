import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Danh Sách Giải Đấu Thể Thao | SportO',
  description: 'Tìm kiếm và đăng ký tham gia các giải đấu Pickleball, Cầu lông, Quần vợt, Bóng bàn phong trào và chuyên nghiệp trên SportO.',
  openGraph: {
    title: 'Danh Sách Giải Đấu Thể Thao | SportO',
    description: 'Tìm kiếm và đăng ký tham gia các giải đấu Pickleball, Cầu lông, Quần vợt, Bóng bàn phong trào và chuyên nghiệp.',
    url: 'https://sporto.asia/tournaments',
    type: 'website',
  },
  alternates: {
    canonical: 'https://sporto.asia/tournaments',
  },
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

