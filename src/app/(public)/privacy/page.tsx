import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật (Privacy Policy) | VNVar Giaidau',
  description: 'Chính sách bảo mật quyền riêng tư và thu thập dữ liệu bảng xếp hạng Leaderboard của ứng dụng Quản Lý Giải Đấu VNVar.',
};

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("Privacy");

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm leading-relaxed text-slate-700">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 pb-4 border-b border-slate-200">
          {t("heading")}
        </h1>

        <p className="text-xs text-slate-400 font-semibold mb-6">
          {t("lastUpdated")}
        </p>

        <section className="space-y-6 text-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section1")}</h2>
            <p>
              Chào mừng bạn đến với nền tảng **Quản Lý Giải Đấu (VNVar / sporto.asia)**. Chúng tôi cam kết bảo vệ quyền riêng tư và thông tin cá nhân của người dùng khi sử dụng ứng dụng di động cũng như trang web của chúng tôi.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section2")}</h2>
            <p className="mb-2">
              Khi bạn đăng ký tài khoản, tham gia thi đấu các giải thể thao (Pickleball, Cầu lông, Tennis, Bóng bàn) hoặc sử dụng các tính năng của ứng dụng:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>Chúng tôi thu thập thông tin cơ bản như: Họ tên, Ảnh đại diện, Email, Số điện thoại và Thành tích thi đấu.</li>
              <li>Bảng xếp hạng toàn cầu (Global Leaderboard & ELO Rating): Với nội dung giải có xếp hạng, tên hiển thị, kết quả trận đấu và điểm ELO của bạn có thể được lưu trên máy chủ và hiển thị trên bảng xếp hạng để phục vụ xếp hạt giống và thi đấu.</li>
              <li>Màn hình đăng ký giải có xếp hạng sẽ hiển thị một ô xác nhận riêng. Chỉ khi bạn tích đồng ý, dữ liệu kết quả và điểm ELO mới được đưa vào hệ thống xếp hạng. Giải không xếp hạng không cập nhật ELO.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section3")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-slate-600">
              <li>Xác thực tài khoản người dùng và quản lý danh sách vận động viên tham gia giải đấu.</li>
              <li>Tính toán điểm ELO, bảng xếp hạng và tạo lịch thi đấu tự động.</li>
              <li>Gửi thông báo lịch thi đấu, kết quả trận đấu và các thông tin liên quan từ Ban tổ chức.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section4")}</h2>
            <p>
              Chúng tôi cam kết **không bán, chia sẻ hoặc cho thuê** thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại. Dữ liệu của bạn được lưu trữ an toàn trên hệ thống máy chủ được bảo mật cao.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section5")}</h2>
            <p>
              Bạn có quyền yêu cầu cập nhật, chỉnh sửa thông tin cá nhân hoặc yêu cầu xóa toàn bộ dữ liệu tài khoản bất kỳ lúc nào bằng cách liên hệ với chúng tôi qua email hỗ trợ hoặc sử dụng tính năng Xóa tài khoản trong ứng dụng.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("section6")}</h2>
            <p>
              Nếu bạn có bất kỳ câu hỏi hoặc thắc mắc nào liên quan đến Chính sách bảo mật này, vui lòng liên hệ Ban quản trị qua:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-600 mt-2">
              <li>**Email**: contact@sporto.asia</li>
              <li>**Website**: https://sporto.asia</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

