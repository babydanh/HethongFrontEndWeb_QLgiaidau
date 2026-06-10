'use client';

import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { Button } from '@/components/ui/Button';
import { Trophy, Info, Target, MapPin, DollarSign, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import Step1Info from './components/Step1Info';
import Step2Format from './components/Step2Format';
import Step3Venue from './components/Step3Venue';
import Step4Fees from './components/Step4Fees';

const STEPS = [
  { id: 1, label: 'Thông tin cơ bản', icon: Info },
  { id: 2, label: 'Thể thức thi đấu', icon: Target },
  { id: 3, label: 'Thời gian & Địa điểm', icon: MapPin },
  { id: 4, label: 'Lệ phí & Xác nhận', icon: DollarSign },
];

function CreateTournamentForm() {
  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId');
  const { currentStep, nextStep, prevStep, updateFormData } = useCreateTournamentStore();

  useEffect(() => {
    if (communityId) {
      updateFormData({ communityId });
    }
  }, [communityId, updateFormData]);

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">Tạo Giải Đấu Mới</h1>
          <p className="text-slate-500 mt-2 font-medium">Thiết lập giải đấu chuyên nghiệp chỉ trong 4 bước đơn giản</p>
        </div>

        {/* Stepper */}
        <div className="mb-10">
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
                  <span className={`text-xs font-bold whitespace-nowrap absolute -bottom-6 ${
                    isActive ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-16">
          <div className="p-6 md:p-8">
            {currentStep === 1 && <Step1Info />}
            {currentStep === 2 && <Step2Format />}
            {currentStep === 3 && <Step3Venue />}
            {currentStep === 4 && <Step4Fees />}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CreateTournamentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <CreateTournamentForm />
    </Suspense>
  );
}

