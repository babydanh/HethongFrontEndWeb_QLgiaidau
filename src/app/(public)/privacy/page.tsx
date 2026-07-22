'use client';

import { Shield, Eye, Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 md:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Block */}
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">Bảo mật thông tin</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Chính sách bảo mật VNSPORT
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-2">
            Cập nhật lần cuối: ngày 14 tháng 07 năm 2026
          </p>
        </div>

        {/* Content Block */}
        <div className="p-8 md:p-12 space-y-8 text-sm text-slate-650 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              1. Thông tin chúng tôi thu thập
            </h2>
            <p>
              Để mang lại trải nghiệm quản lý giải đấu và thi đấu tốt nhất, chúng tôi thu thập các loại thông tin sau:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Thông tin tài khoản:</strong> Tên đăng nhập, mật khẩu mã hóa, số điện thoại, địa chỉ email khi bạn đăng ký sử dụng.
              </li>
              <li>
                <strong>Hồ sơ Vận động viên:</strong> Ảnh đại diện, ảnh bìa, giới tính, thông tin kỹ năng/ELO, lịch sử thi đấu và danh sách câu lạc bộ bạn tham gia.
              </li>
              <li>
                <strong>Dữ liệu giao dịch:</strong> Lịch sử nộp lệ phí giải đấu, thanh toán hóa đơn nâng cấp Pro hoặc lịch sử yêu cầu rút tiền của ban tổ chức.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              2. Cách thức sử dụng thông tin
            </h2>
            <p>
              Chúng tôi chỉ sử dụng thông tin thu thập được cho các mục đích cụ thể:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Vận hành, duy trì và nâng cấp các tính năng quản trị, ghép cặp thi đấu, tính toán ELO của VNSPORT.</li>
              <li>Xử lý các giao dịch tài chính trực tuyến an toàn và hỗ trợ hoàn trả lệ phí khi có yêu cầu hợp lệ.</li>
              <li>Gửi các thông báo quan trọng về giải đấu, sự thay đổi lịch trình, cập nhật kết quả trận đấu hoặc lời mời trọng tài.</li>
              <li>Ngăn chặn các hành vi gian lận thông tin, vi phạm quy chế ứng xử thể thao hoặc phá hoại hệ thống.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              3. Chia sẻ thông tin với bên thứ ba
            </h2>
            <p>
              VNSPORT cam kết không bán, trao đổi hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị. Thông tin của bạn chỉ được chia sẻ trong các trường hợp:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Hiển thị công khai trên hồ sơ VĐV (Tên, CLB, điểm ELO, lịch sử trận đấu) để phục vụ tính minh bạch của giải đấu.</li>
              <li>Cung cấp cho các đối tác xử lý cổng thanh toán trực tuyến được cấp phép nhằm thực hiện giao dịch đóng phí/rút tiền.</li>
              <li>Tuân thủ các yêu cầu pháp lý từ cơ quan nhà nước có thẩm quyền theo quy định của pháp luật Việt Nam.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              4. Bảo mật và lưu trữ dữ liệu
            </h2>
            <p>
              Chúng tôi áp dụng các biện pháp bảo mật mã hóa tiêu chuẩn ngành (như SSL/TLS) nhằm bảo vệ thông tin cá nhân tránh khỏi mất mát, truy cập trái phép hoặc tiết lộ ngoài ý muốn. Tuy nhiên, không có phương thức truyền tải qua Internet hoặc lưu trữ điện tử nào là an toàn tuyệt đối, vì vậy chúng tôi không thể cam kết bảo mật tuyệt đối 100%.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              5. Quyền của người dùng
            </h2>
            <p>
              Bạn có quyền truy cập, chỉnh sửa, cập nhật hoặc yêu cầu xóa bỏ thông tin cá nhân của mình bất kỳ lúc nào bằng cách đăng nhập vào phần Cài đặt hồ sơ cá nhân hoặc liên hệ trực tiếp với đội ngũ hỗ trợ kỹ thuật của VNSPORT.
            </p>
          </section>

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 flex gap-3 text-slate-800 mt-8">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold">Cam kết bảo mật tuyệt đối:</h4>
              <p className="leading-relaxed font-medium text-emerald-800">
                Chúng tôi liên tục giám sát và kiểm tra định kỳ tính bảo mật của mã nguồn và cơ sở dữ liệu để phòng ngừa mọi nguy cơ rò rỉ dữ liệu của thành viên hệ thống.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
          <span className="text-slate-450 font-bold">© 2026 VNDC Sport. Bảo lưu mọi quyền.</span>
          <a
            href="/"
            className="text-blue-650 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            Quay lại trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
