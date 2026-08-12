import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Danh Sách Câu Lạc Bộ Thể Thao | Sporto',
  description: 'Khám phá và gia nhập các câu lạc bộ Pickleball, Cầu lông, Quần vợt, Bóng bàn uy tín trên toàn quốc cùng Sporto.',
  openGraph: {
    title: 'Danh Sách Câu Lạc Bộ Thể Thao | Sporto',
    description: 'Khám phá và gia nhập các câu lạc bộ Pickleball, Cầu lông, Quần vợt, Bóng bàn uy tín trên toàn quốc.',
    url: 'https://sporto.asia/communities',
    type: 'website',
  },
  alternates: {
    canonical: 'https://sporto.asia/communities',
  },
};

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

