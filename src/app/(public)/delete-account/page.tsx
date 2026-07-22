import React from 'react';
import { Shield, Trash2, Mail, Info, Clock, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Yêu cầu xóa tài khoản & Dữ liệu liên quan | Quản lý Giải đấu',
  description: 'Hướng dẫn chi tiết và các bước để người dùng yêu cầu xóa tài khoản và dữ liệu cá nhân liên kết khỏi hệ thống Quản lý Giải đấu.',
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-rose-950/50 border border-rose-800/30 text-rose-500 rounded-full">
            <Trash2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Yêu cầu xóa tài khoản & Dữ liệu
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Hệ thống Quản lý Giải đấu tôn trọng quyền riêng tư của bạn. Trang này cung cấp thông tin chi tiết về cách thức yêu cầu xóa tài khoản và dữ liệu liên quan theo chính sách của Google Play.
          </p>
        </div>

        <hr className="border-slate-800" />

        {/* Section 1: Hướng dẫn các bước */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Các bước yêu cầu xóa tài khoản
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            Bạn có thể gửi yêu cầu xóa tài khoản của mình bằng một trong hai phương thức sau:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Cách 1</span>
              <h3 className="font-semibold text-white">Xóa trực tiếp trong App</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Đăng nhập vào ứng dụng di động của bạn ➔ Đi tới phần <strong className="text-slate-200">Cài đặt cá nhân</strong> ➔ Chọn <strong className="text-rose-400">Xóa tài khoản</strong> và xác nhận.
              </p>
            </div>
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Cách 2</span>
              <h3 className="font-semibold text-white">Yêu cầu qua Email hỗ trợ</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Gửi email trực tiếp từ tài khoản đăng ký của bạn đến <a href="mailto:support@vnvar.com" className="text-blue-400 hover:underline">support@vnvar.com</a> với tiêu đề &quot;Yêu cầu xóa tài khoản giải đấu&quot;.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Dữ liệu được xóa */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Các loại dữ liệu sẽ bị xóa hoặc giữ lại
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-slate-300">
            <div className="flex gap-2 items-start">
              <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
              <p>
                <strong className="text-white">Dữ liệu bị xóa vĩnh viễn:</strong> Thông tin hồ sơ cá nhân (Họ tên, Email, Số điện thoại, Ảnh đại diện), Thông tin liên kết Google/Facebook và lịch sử đăng nhập.
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <div className="w-2 h-2 rounded-full bg-slate-1000 mt-2 shrink-0" />
              <p>
                <strong className="text-white">Dữ liệu được lưu trữ ẩn danh (Anonymized Data):</strong> Lịch sử thi đấu, kết quả giải đấu và điểm Elo sẽ được giữ lại để đảm bảo tính minh bạch và lịch sử của giải đấu, nhưng tất cả thông tin định danh cá nhân của bạn sẽ bị gỡ bỏ (hiển thị dưới dạng &quot;Người chơi đã xóa&quot;).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Thời gian xử lý */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Thời gian xử lý dữ liệu
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            Sau khi yêu cầu của bạn được gửi thành công:
          </p>
          <ul className="list-disc pl-5 text-sm sm:text-base text-slate-300 space-y-1">
            <li>Tài khoản của bạn sẽ bị khóa ngay lập tức và không thể đăng nhập.</li>
            <li>Quá trình xóa và làm sạch dữ liệu cá nhân trên cơ sở dữ liệu sẽ hoàn tất trong vòng <strong className="text-white">7 ngày làm việc</strong>.</li>
          </ul>
        </div>

        {/* Cảnh báo */}
        <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-rose-200">Lưu ý quan trọng</h4>
            <p className="text-xs sm:text-sm text-rose-300/80">
              Hành động này không thể hoàn tác. Một khi dữ liệu đã bị xóa, bạn sẽ không thể khôi phục lại tài khoản cũng như lịch sử thi đấu liên quan.
            </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 mt-8">
        © {new Date().getFullYear()} Quản lý Giải đấu. Bảo lưu mọi quyền.
      </div>
    </div>
  );
}
