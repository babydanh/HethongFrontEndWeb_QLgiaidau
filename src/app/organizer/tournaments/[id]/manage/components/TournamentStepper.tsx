import React from 'react';
import { Check, ChevronRight, Users, GitMerge, Play, Trophy, FileText } from 'lucide-react';
import { Tournament } from '@/features/tournaments/api';
import { Button } from '@/components/ui/Button';
import {
  isTournamentCompleted,
  isTournamentDraft,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentRegistrationClosed,
  isTournamentUpcoming,
} from '@/utils/tournament-status';

interface TournamentStepperProps {
  tournament: Tournament;
  onPublish: () => void;
  onNextStep: (nextStatus: Tournament['status']) => void;
  onPayPlatformFee?: () => void;
  publishFeeAmount?: number;
  isLoading?: boolean;
}

export function TournamentStepper({ tournament, onPublish, onNextStep, onPayPlatformFee, publishFeeAmount = 0, isLoading }: TournamentStepperProps) {
  const getStepIndex = () => {
    if (isTournamentDraft(tournament.status)) return -1;
    if (isTournamentUpcoming(tournament.status) || isTournamentRegistrationClosed(tournament.status)) return 1;
    if (isTournamentOpenForRegistration(tournament.status)) return 0;
    if (isTournamentInProgress(tournament.status)) return 2;
    if (isTournamentCompleted(tournament.status)) return 3;
    return -1;
  };

  const currentStep = getStepIndex();
  const isRegistrationClosed = isTournamentRegistrationClosed(tournament.status);

  const steps = [
    {
      title: 'Nhận Đăng ký',
      icon: <Users className="w-4 h-4" />,
      description: 'VĐV đăng ký tham gia',
      actionText: 'Chốt đăng ký',
      onClick: () => onNextStep('UPCOMING'),
      canProgress: currentStep === 0,
    },
    {
      title: 'Sơ đồ & Lịch đấu',
      icon: <GitMerge className="w-4 h-4" />,
      description: 'Chốt sơ đồ nháp, phân lịch',
      actionText: (isRegistrationClosed && tournament.tournamentType !== 'CLUB') ? 'Thanh toán phí sàn' : 'Khai mạc giải đấu',
      onClick: () => {
        if (isRegistrationClosed && tournament.tournamentType !== 'CLUB') {
          onPayPlatformFee?.();
        } else {
          onNextStep('IN_PROGRESS');
        }
      },
      canProgress: currentStep === 1,
    },
    {
      title: 'Đang Thi đấu',
      icon: <Play className="w-4 h-4" />,
      description: 'Cập nhật điểm số, kết quả',
      actionText: 'Kết thúc giải đấu',
      onClick: () => onNextStep('COMPLETED'),
      canProgress: currentStep === 2,
    },
    {
      title: 'Kết thúc',
      icon: <Trophy className="w-4 h-4" />,
      description: 'Giải đấu hoàn thành',
      actionText: null,
      onClick: () => {},
      canProgress: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" /> Tiến trình giải đấu
      </h3>
      
      {isTournamentDraft(tournament.status) && (
        <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-300 mb-6">
          <h4 className="font-bold text-slate-700 mb-2">Giải đấu chưa được công bố</h4>
          <p className="text-sm text-slate-500 mb-3 max-w-md text-center">
            Bạn cần công bố giải đấu để kích hoạt thanh tiến trình và bắt đầu nhận đăng ký.
          </p>
          {publishFeeAmount > 0 && (
            <p className="text-xs text-blue-700 font-semibold mb-3 text-center">
              Bước tiếp theo sẽ chuyển sang thanh toán phí công bố: {publishFeeAmount.toLocaleString('vi-VN')}đ
            </p>
          )}
          <div className="bg-amber-50 text-amber-800 text-[13px] px-4 py-3 rounded-lg mb-5 max-w-lg border border-amber-200">
            <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Lưu ý quan trọng trước khi công bố:
            </span>
            <p className="mb-2 font-medium">Thông tin cơ bản phải được điền đầy đủ và chính xác. Vui lòng kiểm tra kỹ các trường sau trước khi công bố:</p>
            <ul className="list-disc pl-6 space-y-0.5 mt-1 font-bold text-amber-900">
              <li>Lệ phí thi đấu</li>
              <li>Địa điểm / Sân thi đấu</li>
              <li>Thời gian Mở & Đóng đăng ký</li>
              <li>Hình thức thi đấu (Loại trực tiếp / Nhánh thắng thua / Vòng tròn)</li>
            </ul>
            <p className="mt-2 text-xs italic text-amber-700 font-medium">* Ngày khai mạc & bế mạc có thể linh động cập nhật sau.</p>
          </div>
          <Button
            onClick={onPublish}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-500/20"
          >
            {publishFeeAmount > 0 ? 'Thanh toán phí & công bố giải đấu' : 'Công bố giải đấu'} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <div className={`relative flex flex-col md:flex-row justify-between ${isTournamentDraft(tournament.status) ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Progress bar background line for desktop */}
        <div className="hidden md:block absolute top-6 left-8 right-8 h-1 bg-slate-100 rounded -z-10" />
        {/* Active progress line */}
        <div 
          className="hidden md:block absolute top-6 left-8 h-1 bg-blue-600 rounded -z-10 transition-all duration-500"
          style={{ width: `${Math.max(0, (currentStep / (steps.length - 1)) * 100)}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 relative mb-6 md:mb-0">
              {/* Step Icon Circle */}
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-3 transition-colors ${
                  isCompleted ? 'bg-emerald-500 text-white' : 
                  isActive ? 'bg-blue-600 text-white ring-4 ring-blue-50' : 
                  'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-6 h-6 font-bold" /> : step.icon}
              </div>
              
              {/* Step Info */}
              <div className="text-center">
                <div className={`font-bold text-sm ${isActive ? 'text-blue-700' : isCompleted ? 'text-slate-800' : 'text-slate-500'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 max-w-[140px] leading-tight mx-auto">
                  {step.description}
                </div>
              </div>

              {/* Action Button for Active Step */}
              {isActive && step.actionText && (
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={step.onClick}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 h-8 px-4 rounded-full shadow-md shadow-blue-500/20"
                  >
                    {step.actionText} <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
