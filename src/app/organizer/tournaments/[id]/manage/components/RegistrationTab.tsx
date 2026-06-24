'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Users, 
  RefreshCw, 
  Loader2, 
  Plus, 
  Trash2, 
  UserPlus, 
  CheckCircle,
  Link as LinkIcon,
  Lock
} from 'lucide-react';
import { Tournament, TournamentParticipant } from '@/types/tournament';
import { formatDate } from '@/utils/format';

interface RegistrationTabProps {
  tournament: Tournament;
  inviteLink: string;
  participants: TournamentParticipant[];
  mockNamesText: string;
  setMockNamesText: (val: string) => void;
  isSeedingMock: boolean;
  isClearingMock: boolean;
  wildcardEmailOrPhone: string;
  setWildcardEmailOrPhone: (val: string) => void;
  wildcardTeamName: string;
  setWildcardTeamName: (val: string) => void;
  isAssigningWildcard: boolean;
  publishFeeAmount: number;
  handlePublish: () => void;
  handleOpenLockModal: () => void;
  handleUpdateStatus: (id: string, status: 'COMPLETE' | 'PENDING' | 'WITHDRAWN') => void;
  handleSeedMockData: () => void;
  handleClearMockData: () => void;
  handleAssignWildcard: () => void;
  onCopyInviteLink: () => void;
}

export function RegistrationTab({
  tournament,
  inviteLink,
  participants,
  mockNamesText,
  setMockNamesText,
  isSeedingMock,
  isClearingMock,
  wildcardEmailOrPhone,
  setWildcardEmailOrPhone,
  wildcardTeamName,
  setWildcardTeamName,
  isAssigningWildcard,
  publishFeeAmount,
  handlePublish,
  handleOpenLockModal,
  handleUpdateStatus,
  handleSeedMockData,
  handleClearMockData,
  handleAssignWildcard,
  onCopyInviteLink
}: RegistrationTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: PUBLISH STATUS & ROSTER LIST (span-2) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Publish Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Trạng thái phát hành giải đấu</h3>
          
          {tournament.status === 'DRAFT' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400">ℹ</span>
                <p className="text-xs leading-relaxed font-medium">
                  Giải đấu đang ở trạng thái <strong>Bản nháp</strong>. Giải đấu chỉ hiển thị đối với bạn. Hãy kiểm tra kỹ thông tin cấu hình, thời gian và địa điểm thi đấu trước khi công bố.
                </p>
              </div>
              {publishFeeAmount > 0 && (
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200">
                  Khi bấm nút bên dưới, hệ thống sẽ chuyển sang bước thanh toán phí công bố giải đấu: {publishFeeAmount.toLocaleString('vi-VN')}đ.
                </div>
              )}
              <Button
                onClick={handlePublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-auto flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> {publishFeeAmount > 0 ? 'Thanh toán phí & công bố' : 'Công bố giải đấu'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950 text-sm">Giải đấu đã được công bố!</p>
                    <p className="text-emerald-700 text-xs mt-1">Người chơi có thể đăng ký tài khoản và truy cập link để tham gia.</p>
                  </div>
                </div>
                
                {/* Lock list button */}
                {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'REGISTRATION_CLOSED') && (
                  <Button
                    onClick={handleOpenLockModal}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Lock className="w-4 h-4" /> Chốt danh sách & Tạo sơ đồ
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 border p-3.5 rounded-xl bg-slate-50/50">
                <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">
                    {tournament.visibility === 'PRIVATE' ? 'Đường dẫn đăng ký riêng tư' : 'Đường dẫn đăng ký công khai'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 truncate select-all">{inviteLink}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={onCopyInviteLink}
                  className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Sao chép
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Roster / Participant List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Danh sách VĐV đăng ký ({participants.length})</h3>
              <p className="text-xs text-slate-455 mt-1 font-semibold">BTC duyệt đăng ký của vận động viên trước khi chốt danh sách thi đấu chính thức.</p>
            </div>
            {participants.some(p => p.members?.some(m => m.isMock)) && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px]">
                CHỨA DỮ LIỆU MOCK
              </Badge>
            )}
          </div>
          
          {participants.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed flex flex-col items-center">
              <Users className="w-10 h-10 mb-3 text-slate-300" />
              <p className="font-bold text-sm text-slate-700">Chưa có đội hoặc vận động viên nào đăng ký</p>
              <p className="text-xs text-slate-455 mt-1 max-w-xs">Người chơi đăng ký sẽ xuất hiện tại đây. Bạn cũng có thể dùng bảng bên phải để sinh dữ liệu mock phục vụ thử nghiệm.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {participants.map((p) => {
                const hasMockMembers = p.members?.some(m => m.isMock || m.role === 'MOCK');
                return (
                  <div key={p.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 group hover:bg-slate-50/30 px-2 rounded-xl transition-all duration-200">
                    
                    <div className="space-y-1.5 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 text-base">{p.teamName}</h4>
                        {hasMockMembers && (
                          <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                            Dữ liệu ảo
                          </span>
                        )}
                        {p.teamStatus === 'COMPLETE' && (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                            ĐÃ DUYỆT
                          </span>
                        )}
                        {p.teamStatus === 'PENDING' && (
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider animate-pulse">
                            CHỜ DUYỆT
                          </span>
                        )}
                        {p.teamStatus === 'WITHDRAWN' && (
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                            ĐÃ RÚT
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                        <span>Đăng ký: {formatDate(p.registeredAt)}</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1.5">
                          Lệ phí: 
                          {p.isPaid ? (
                            <span className="text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100/60">Đã nộp</span>
                          ) : (
                            <span className="text-amber-600 font-bold bg-amber-50/50 px-2 py-0.5 rounded-full border border-amber-100/60">Chưa nộp</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Team Members info */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="flex gap-2">
                        {p.members?.map((m) => (
                          <div key={m.userId} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold text-[9px] flex items-center justify-center uppercase">
                              {m.fullName?.substring(0,2) || 'VD'}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-extrabold text-slate-800 leading-none">{m.fullName}</p>
                              <p className="text-[9px] text-blue-650 font-black leading-none mt-1">({m.elo?.eloPoints || 1200} ELO)</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons for Approvals */}
                      {p.teamStatus === 'PENDING' && (
                        <div className="flex items-center gap-1.5 ml-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(p.id, 'COMPLETE')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 h-8 shadow-sm flex items-center gap-1 animate-none"
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn từ chối đơn đăng ký của đội ${p.teamName}?`)) {
                                handleUpdateStatus(p.id, 'WITHDRAWN');
                              }
                            }}
                            className="border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs px-3 py-1 h-8 animate-none"
                          >
                            Từ chối
                          </Button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: TESTING & WILDCARDS (span-1) */}
      <div className="space-y-6">
        
        {/* Mock Participant Testing Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-none" /> Bảng thử nghiệm dữ liệu ảo
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">Tạo danh sách vận động viên ảo để kiểm thử sơ đồ thi đấu trước khi mở đăng ký thật.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách VĐV ảo</label>
            <Textarea
              value={mockNamesText}
              onChange={(e) => setMockNamesText(e.target.value)}
              placeholder="Mỗi dòng là 1 tên VĐV.&#10;Đánh đôi: Cứ 2 dòng liên tiếp xếp 1 đội.&#10;Ví dụ:&#10;VĐV A&#10;VĐV B"
              className="h-32 text-xs resize-none font-semibold text-slate-700"
              disabled={isSeedingMock || isClearingMock}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSeedMockData}
              disabled={isSeedingMock || isClearingMock || !mockNamesText.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
            >
              {isSeedingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Sinh VĐV ảo
            </Button>
            <Button
              variant="outline"
              onClick={handleClearMockData}
              disabled={isSeedingMock || isClearingMock}
              className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 animate-none"
            >
              {isClearingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Dọn dẹp
            </Button>
          </div>
        </div>

        {/* Reserved Slots / Wildcards Direct Assignment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" /> Suất đặc cách
            </h3>
            <p className="text-xs text-slate-455 mt-1 font-semibold">Gán trực tiếp khách mời, nhà tài trợ vào danh sách thi đấu của hình thức đang chọn. Suất này bỏ qua mọi quy tắc giới hạn trình độ ELO.</p>
          </div>

          <Input
            label="Tài khoản Baseline (Email hoặc SĐT)"
            placeholder="partner@baseline.vn hoặc 09xxxx"
            value={wildcardEmailOrPhone}
            onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
            className="bg-white text-xs h-10"
            disabled={isAssigningWildcard}
          />

          <Input
            label="Tên đội thi đấu đặc cách"
            placeholder="Ví dụ: Đội Khách Mời VIP"
            value={wildcardTeamName}
            onChange={(e) => setWildcardTeamName(e.target.value)}
            className="bg-white text-xs h-10"
            disabled={isAssigningWildcard}
          />

          <Button
            onClick={handleAssignWildcard}
            disabled={isAssigningWildcard || !wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
          >
            {isAssigningWildcard ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gán...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" /> Gán suất đặc cách
              </>
            )}
          </Button>
        </div>

      </div>

    </div>
  );
}
