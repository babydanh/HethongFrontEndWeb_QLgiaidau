import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Danh Sách Câu Lạc Bộ Thể Thao | VNDC Sport',
  description: 'Khám phá và gia nhập các câu lạc bộ Pickleball, Cầu lông, Quần vợt, Bóng bàn uy tín trên toàn quốc cùng VNDC Sport.',
  openGraph: {
    title: 'Danh Sách Câu Lạc Bộ Thể Thao | VNDC Sport',
    description: 'Khám phá và gia nhập các câu lạc bộ Pickleball, Cầu lông, Quần vợt, Bóng bàn uy tín trên toàn quốc.',
    url: 'https://giaidau.vnvar.com/communities',
    type: 'website',
  },
  alternates: {
    canonical: 'https://giaidau.vnvar.com/communities',
  },
};

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
