import React from 'react';

export const metadata = {
  title: 'Yêu cầu xóa tài khoản | Quản lý Giải đấu',
  description: 'Hướng dẫn các bước yêu cầu xóa tài khoản và dữ liệu cá nhân khỏi hệ thống Quản lý Giải đấu.',
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
            Yêu cầu xóa tài khoản
          </h1>
          <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
            Chúng tôi tôn trọng quyền riêng tư của bạn. Dưới đây là các cách để yêu cầu xóa tài khoản và dữ liệu cá nhân.
          </p>
        </div>

        {/* Các bước */}
        <div className="space-y-4 mb-10">
          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold shrink-0 mt-0.5">1</span>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-900">Xóa trực tiếp trong ứng dụng</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Đăng nhập vào ứng dụng, vào <span className="text-gray-700">Cài đặt cá nhân</span>, chọn <span className="text-red-600">Xóa tài khoản</span> và xác nhận.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold shrink-0 mt-0.5">2</span>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-900">Gửi yêu cầu qua email</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Gửi email từ tài khoản đã đăng ký đến{' '}
                  <a href="mailto:support@vnvar.com" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
                    support@vnvar.com
                  </a>
                  {' '}với tiêu đề <span className="text-gray-700">&quot;Yêu cầu xóa tài khoản&quot;</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dữ liệu */}
        <div className="bg-gray-50 rounded-xl p-5 mb-10">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Dữ liệu được xóa và giữ lại</h2>
          <div className="space-y-2">
            <div className="flex gap-2.5 items-start text-sm">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">Xóa vĩnh viễn:</span> Họ tên, email, số điện thoại, ảnh đại diện, thông tin đăng nhập.
              </span>
            </div>
            <div className="flex gap-2.5 items-start text-sm">
              <svg className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">Giữ lại ẩn danh:</span> Lịch sử thi đấu, kết quả giải, điểm Elo được giữ nhưng không gắn với thông tin cá nhân (hiển thị &quot;Người chơi đã xóa&quot;).
              </span>
            </div>
          </div>
        </div>

        {/* Thời gian */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-10">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-gray-900">Thời gian xử lý</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sau khi gửi yêu cầu, tài khoản sẽ bị khóa ngay. Quá trình xóa dữ liệu hoàn tất trong vòng <span className="font-medium text-gray-700">7 ngày làm việc</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Cảnh báo */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-amber-800 leading-relaxed">
            Hành động này không thể hoàn tác. Sau khi xóa, bạn không thể khôi phục tài khoản hay dữ liệu liên quan.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          &copy; {new Date().getFullYear()} Quản lý Giải đấu.
        </p>
      </div>
    </div>
  );
}

