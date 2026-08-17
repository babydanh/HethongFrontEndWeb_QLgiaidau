'use client';

import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { Info, Zap, Calendar, CheckCircle, Check, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import Step1Info from './components/Step1Info';
import Step2FormatMulti from './components/Step2Format_Multi';
import Step3ScheduleFees from './components/Step3ScheduleFees';
import Step4ReviewSubmit from './components/Step4ReviewSubmit';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BRAND } from '@/constants/brand';
import QuickTournamentCreate from './QuickTournamentCreate';

const STEPS = [
  { id: 1, label: 'Thông Tin', icon: Info },
  { id: 2, label: 'Hình Thức', icon: Zap },
  { id: 3, label: 'Lịch & Lệ Phí', icon: Calendar },
  { id: 4, label: 'Xác Nhận', icon: CheckCircle },
];

function AdvancedTournamentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId');
  const isClubAdvanced = Boolean(communityId);
  const { currentStep, updateFormData, setStep } = useCreateTournamentStore();

  useEffect(() => {
    // Reset wizard to Step 1 on page load
    setStep(1);
    if (communityId) {
      updateFormData({
        communityId,
        tournamentType: 'CLUB',
        visibility: 'PUBLIC',
        registrationMode: 'OPEN',
        entryFee: 0,
      });
    } else {
      updateFormData({ communityId: '', tournamentType: 'PUBLIC' });
    }
  }, [communityId, updateFormData, setStep]);

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-slate-900">Tạo giải đấu (Nâng cao)</h1>
            <p className="text-slate-500 mt-1 font-medium">Thiết lập chi tiết điều lệ, phân bảng và lệ phí qua 4 bước</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/organizer/tournaments/create${communityId ? `?communityId=${communityId}` : ''}`)}
            className="inline-flex items-center gap-2 self-start md:self-auto rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Tạo nhanh
          </button>
        </div>

        {isClubAdvanced && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-left">
            <p className="text-sm font-bold text-emerald-900">Tạo giải nâng cao trong câu lạc bộ</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
              Giải vẫn thuộc CLB và miễn phí đăng ký. Bạn có thể chọn công khai để người ngoài xem được trang giải,
              hoặc không niêm yết để chỉ chia sẻ trong phạm vi nội bộ/mã mời.
            </p>
          </div>
        )}

        {/* Stepper */}
        <div className="mb-10 max-w-2xl mx-auto">
          <div className="flex justify-between items-center relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:h-1 before:bg-slate-200 before:z-0">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isPast = step.id < currentStep;
              const Icon = step.icon;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-slate-50 transition-colors duration-300 ${
                    isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' :
                    isPast ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {isPast ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap absolute -bottom-6 text-center ${
                    isActive ? 'text-blue-600' : isPast ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-16">
          <div className="p-6 md:p-8">
            {currentStep === 1 && <Step1Info />}
            {currentStep === 2 && <Step2FormatMulti />}
            {currentStep === 3 && <Step3ScheduleFees />}
            {currentStep === 4 && <Step4ReviewSubmit />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateTournamentPage() {
  const searchParams = useSearchParams();
  const isAdvanced = searchParams.get('mode') === 'advanced';

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner className="h-8 w-8 text-blue-600" /></div>}>
      {isAdvanced ? <AdvancedTournamentForm /> : <QuickTournamentCreate />}
    </Suspense>
  );
}
