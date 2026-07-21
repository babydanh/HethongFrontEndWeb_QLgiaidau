'use client';

import { FileText, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/navigation';

export default function TermsPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 md:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Block */}
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-450">Pháp lý & Điều khoản</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Điều khoản sử dụng VNSPORT
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-2">
            Cập nhật lần cuối: ngày 14 tháng 07 năm 2026
          </p>
        </div>

        {/* Content Block */}
        <div className="p-8 md:p-12 space-y-8 text-sm text-slate-650 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              1. Chấp thuận điều khoản
            </h2>
            <p>
              Chào mừng bạn đến với <strong>VNSPORT</strong> (&quot;Nền tảng&quot;), được vận hành bởi Công ty TNHH VNDC Sport. Bằng việc đăng ký tài khoản, truy cập hoặc sử dụng bất kỳ tính năng nào của VNSPORT trên cả hai nền tảng Web và ứng dụng di động, bạn đồng ý tuân thủ và chịu sự ràng buộc bởi các Điều khoản sử dụng này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng dịch vụ ngay lập tức.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              2. Tài khoản và Bảo mật
            </h2>
            <p>
              Để sử dụng một số dịch vụ của chúng tôi, bạn có thể được yêu cầu đăng ký tài khoản và cung cấp thông tin cá nhân chính xác, đầy đủ (bao gồm tên đầy đủ, số điện thoại, địa chỉ email). Bạn tự chịu trách nhiệm bảo mật thông tin đăng nhập của mình và mọi hoạt động diễn ra dưới tài khoản của bạn. Vui lòng thông báo ngay cho chúng tôi nếu phát hiện bất kỳ hành vi truy cập trái phép nào.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              3. Quy chế tổ chức &amp; tham gia giải đấu
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Đối với Ban tổ chức (BTC):</strong> Bạn cam kết cung cấp thông tin trung thực về giải đấu, thể lệ, lệ phí và cơ cấu giải thưởng. BTC có trách nhiệm vận hành giải đấu công bằng, xử lý tranh chấp theo đúng quy định đã công bố và tuân thủ các quy tắc tài chính liên quan đến thu phí sàn, hoàn tiền.
              </li>
              <li>
                <strong>Đối với Vận động viên (VĐV) &amp; Đội thi đấu:</strong> Bạn cam kết thi đấu với tinh thần thể thao cao thượng, không gian lận thông tin độ tuổi, giới tính hoặc điểm ELO trình độ. Mọi hành vi gian lận trình độ có thể dẫn đến việc bị truất quyền thi đấu và khóa tài khoản vĩnh viễn.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              4. Giao dịch tài chính &amp; Hoàn tiền
            </h2>
            <p>
              Mọi giao dịch đóng lệ phí tham gia giải đấu trực tuyến được xử lý qua cổng thanh toán liên kết của VNSPORT. Việc rút lui khỏi giải đấu và yêu cầu hoàn tiền phải tuân thủ chính sách hoàn trả cụ thể của từng giải đấu do BTC quy định. VNSPORT chỉ chịu trách nhiệm chuyển tiền hoàn lại khi yêu cầu đáp ứng đủ điều kiện quy định và được BTC phê duyệt hợp lệ.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              5. Quyền sở hữu trí tuệ
            </h2>
            <p>
              Tất cả nội dung, nhãn hiệu, logo, mã nguồn, thiết kế đồ họa và công nghệ liên quan thuộc sở hữu độc quyền của VNDC Sport hoặc các đối tác cấp phép. Bạn không được sao chép, sửa đổi, phân phối hoặc sử dụng cho mục đích thương mại mà không có sự đồng ý trước bằng văn bản từ chúng tôi.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              6. Giới hạn trách nhiệm
            </h2>
            <p>
              VNSPORT cung cấp nền tảng kết nối và quản lý kỹ thuật. Chúng tôi không chịu trách nhiệm đối với bất kỳ chấn thương thể chất, tổn thất tài sản cá nhân hay sự cố phát sinh ngoài ý muốn nào xảy ra trong quá trình diễn ra các giải đấu thực tế trên sân. BTC và người chơi tự chịu trách nhiệm đảm bảo các điều kiện an toàn sức khỏe và y tế cần thiết khi thi đấu.
            </p>
          </section>

          <div className="bg-amber-50 rounded-lg border border-amber-200 p-5 flex gap-3 text-amber-900 mt-8">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold">Lưu ý quan trọng đối với thành viên hệ thống:</h4>
              <p className="leading-relaxed font-medium text-amber-800">
                Việc vi phạm nghiêm trọng các quy tắc ứng xử thể thao hoặc cố ý phá hoại dữ liệu giải đấu có thể dẫn đến việc khóa tài khoản quản trị/VĐV tạm thời hoặc vĩnh viễn mà không được hoàn trả bất kỳ chi phí nào đã đóng.
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
