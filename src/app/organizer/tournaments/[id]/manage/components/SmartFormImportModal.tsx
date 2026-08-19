'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Mail,
  Users,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Loader2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { tournamentsApi, type Division } from '@/features/tournaments/api';
import { parseParticipantsExcel, type ParsedExcelResult } from '@/utils/exportTournament';
import type { Tournament } from '@/types/tournament';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

interface SmartFormImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament;
  divisions: Division[];
  selectedDivisionId: string;
  onSuccess: () => Promise<void> | void;
}

interface ColumnMapping {
  teamNameCol: string;
  player1NameCol: string;
  player1EmailCol: string;
  player1PhoneCol: string;
  player2NameCol: string;
  player2EmailCol: string;
  player2PhoneCol: string;
  divisionCol: string;
  eloCol: string;
}

export default function SmartFormImportModal({
  open,
  onOpenChange,
  tournament,
  divisions,
  selectedDivisionId,
  onSuccess,
}: SmartFormImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [excelResult, setExcelResult] = useState<ParsedExcelResult | null>(null);
  const [targetDivisionId, setTargetDivisionId] = useState<string>(selectedDivisionId || divisions[0]?.id || '');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    teamNameCol: '',
    player1NameCol: '',
    player1EmailCol: '',
    player1PhoneCol: '',
    player2NameCol: '',
    player2EmailCol: '',
    player2PhoneCol: '',
    divisionCol: '',
    eloCol: '',
  });

  // Import options
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [sendInvitationEmail, setSendInvitationEmail] = useState<boolean>(true);
  const [splitDoublesIntoSingles, setSplitDoublesIntoSingles] = useState<boolean>(false);
  const [excludedRowIndices, setExcludedRowIndices] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetDivision = useMemo(() => {
    return divisions.find((d) => d.id === targetDivisionId) ?? null;
  }, [divisions, targetDivisionId]);

  const isTargetDoubles = useMemo(() => {
    const matchType = targetDivision?.matchType || tournament.matchType;
    return matchType === 'DOUBLES' || matchType === 'MIXED_DOUBLES';
  }, [targetDivision, tournament.matchType]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const res = await parseParticipantsExcel(file);
      if (!res.rows.length) {
        toast.error('File Excel không có dữ liệu dòng nào!');
        return;
      }
      setExcelResult(res);

      // Heuristic auto-detect columns
      const headers = res.headers;
      const findBestCol = (keywords: string[]) => {
        return headers.find((h) => {
          const lower = h.toLowerCase().trim();
          return keywords.some((kw) => lower.includes(kw));
        }) || '';
      };

      const p1Email = findBestCol(['địa chỉ email', 'email vđv 1', 'email 1', 'gmail 1', 'email', 'gmail', 'thư điện tử']);
      const p1Name = findBestCol(['họ và tên', 'họ tên vđv 1', 'họ tên', 'người chơi 1', 'vđv 1', 'vận động viên 1', 'tên 1', 'player 1', 'tên vđv', 'tên']);
      const p1Phone = findBestCol(['số điện thoại vđv 1', 'sđt vđv 1', 'sđt 1', 'điện thoại 1', 'phone 1', 'sđt', 'sdt', 'điện thoại', 'phone', 'zalo']);
      const p2Name = findBestCol(['họ và tên vđv 2', 'họ tên vđv 2', 'người chơi 2', 'vđv 2', 'vận động viên 2', 'tên 2', 'player 2', 'đồng đội', 'partner', 'partner name']);
      const p2Email = findBestCol(['email vđv 2', 'email 2', 'gmail 2', 'email đồng đội', 'gmail đồng đội']);
      const p2Phone = findBestCol(['số điện thoại vđv 2', 'sđt vđv 2', 'sđt 2', 'điện thoại 2', 'phone 2', 'sđt đồng đội']);
      const teamName = findBestCol(['tên đội', 'tên cặp', 'cặp đôi', 'tên cặp đôi', 'clb', 'club', 'team', 'tên clb']);
      const division = findBestCol(['nội dung đăng ký', 'nội dung', 'hạng đấu', 'hạng mục', 'division', 'category', 'thể thức']);
      const elo = findBestCol(['điểm trình', 'elo', 'dupr', 'rating', 'trình độ', 'điểm', 'rank', 'level']);

      setColumnMapping({
        teamNameCol: teamName || (p1Name ? '' : headers[0] || ''),
        player1NameCol: p1Name || headers[0] || '',
        player1EmailCol: p1Email,
        player1PhoneCol: p1Phone,
        player2NameCol: p2Name,
        player2EmailCol: p2Email,
        player2PhoneCol: p2Phone,
        divisionCol: division,
        eloCol: elo,
      });

      setExcludedRowIndices(new Set());
      setStep(2);
      toast.success(`Đã đọc ${res.rows.length} dòng từ Google Form!`);
    } catch (err: any) {
      toast.error('Lỗi khi đọc file: ' + (err?.message || 'Không hợp lệ'));
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Process rows into items based on mapping
  const parsedItems = useMemo(() => {
    if (!excelResult) return [];

    const items: Array<{
      rowIndex: number;
      teamName: string;
      player1Name: string;
      player1Email?: string;
      player1Phone?: string;
      player2Name?: string;
      player2Email?: string;
      player2Phone?: string;
      elo?: number;
      hasFormatMismatch?: boolean;
      mismatchReason?: string;
    }> = [];

    const seenEmails = new Set<string>();

    excelResult.rows.forEach((row, idx) => {
      const p1Name = columnMapping.player1NameCol ? String(row[columnMapping.player1NameCol] || '').trim() : '';
      const p1Email = columnMapping.player1EmailCol ? String(row[columnMapping.player1EmailCol] || '').trim() : undefined;
      const p1Phone = columnMapping.player1PhoneCol ? String(row[columnMapping.player1PhoneCol] || '').trim() : undefined;

      const p2Name = columnMapping.player2NameCol ? String(row[columnMapping.player2NameCol] || '').trim() : undefined;
      const p2Email = columnMapping.player2EmailCol ? String(row[columnMapping.player2EmailCol] || '').trim() : undefined;
      const p2Phone = columnMapping.player2PhoneCol ? String(row[columnMapping.player2PhoneCol] || '').trim() : undefined;

      const rawTeam = columnMapping.teamNameCol ? String(row[columnMapping.teamNameCol] || '').trim() : '';
      const rawElo = columnMapping.eloCol ? parseFloat(String(row[columnMapping.eloCol])) : undefined;
      const elo = Number.isFinite(rawElo) ? rawElo : undefined;

      // Filter empty rows
      if (!p1Name && !p2Name && !rawTeam) return;

      let defaultTeam = rawTeam;
      if (!defaultTeam) {
        if (p1Name && p2Name) {
          defaultTeam = `${p1Name} / ${p2Name}`;
        } else {
          defaultTeam = p1Name || p2Name || `Đội #${idx + 1}`;
        }
      }

      // Check format mismatch
      let hasFormatMismatch = false;
      let mismatchReason = '';

      if (!isTargetDoubles && p2Name && splitDoublesIntoSingles) {
        // Tách thành 2 dòng VĐV Đơn độc lập
        if (p1Name) {
          items.push({
            rowIndex: idx * 2,
            teamName: p1Name,
            player1Name: p1Name,
            player1Email: p1Email || undefined,
            player1Phone: p1Phone || undefined,
            elo,
            hasFormatMismatch: false,
          });
        }
        if (p2Name) {
          items.push({
            rowIndex: idx * 2 + 1,
            teamName: p2Name,
            player1Name: p2Name,
            player1Email: p2Email || undefined,
            player1Phone: p2Phone || undefined,
            elo,
            hasFormatMismatch: false,
          });
        }
        return;
      }

      if (!isTargetDoubles && p2Name && !splitDoublesIntoSingles) {
        hasFormatMismatch = true;
        mismatchReason = 'Bảng Đơn nhưng có VĐV 2 (Cặp đôi)';
      } else if (isTargetDoubles && !p2Name) {
        hasFormatMismatch = true;
        mismatchReason = 'Bảng Đôi nhưng thiếu VĐV 2';
      }

      if (p1Email) {
        if (seenEmails.has(p1Email.toLowerCase())) {
          hasFormatMismatch = true;
          mismatchReason = mismatchReason ? `${mismatchReason}, Trùng Email ${p1Email}` : `Trùng Email ${p1Email}`;
        } else {
          seenEmails.add(p1Email.toLowerCase());
        }
      }

      items.push({
        rowIndex: idx,
        teamName: defaultTeam,
        player1Name: p1Name || defaultTeam,
        player1Email: p1Email || undefined,
        player1Phone: p1Phone || undefined,
        player2Name: p2Name || undefined,
        player2Email: p2Email || undefined,
        player2Phone: p2Phone || undefined,
        elo,
        hasFormatMismatch,
        mismatchReason,
      });
    });

    return items;
  }, [excelResult, columnMapping, isTargetDoubles, splitDoublesIntoSingles]);

  const activeItemsToImport = useMemo(() => {
    return parsedItems.filter((item) => !excludedRowIndices.has(item.rowIndex));
  }, [parsedItems, excludedRowIndices]);

  const formatMismatchCount = useMemo(() => {
    return parsedItems.filter((item) => item.hasFormatMismatch).length;
  }, [parsedItems]);

  const handleToggleRow = (idx: number) => {
    setExcludedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (excludedRowIndices.size === 0) {
      setExcludedRowIndices(new Set(parsedItems.map((item) => item.rowIndex)));
    } else {
      setExcludedRowIndices(new Set());
    }
  };

  const handleSubmitImport = async () => {
    if (!activeItemsToImport.length) {
      toast.error('Không có dòng VĐV nào được chọn để nạp!');
      return;
    }

    setIsImporting(true);
    try {
      const payloadParticipants = activeItemsToImport.map((item) => ({
        teamName: item.teamName,
        player1Name: item.player1Name,
        player1Email: item.player1Email,
        player1Phone: item.player1Phone,
        player2Name: item.player2Name,
        player2Email: item.player2Email,
        player2Phone: item.player2Phone,
        elo: item.elo,
        isPaid,
        autoApprove,
      }));

      const res = await tournamentsApi.importParticipants(tournament.id, {
        divisionId: targetDivisionId || undefined,
        participants: payloadParticipants,
        sendInvitationEmail,
      });

      toast.success(res.data?.message || `Đã nạp thành công ${payloadParticipants.length} hồ sơ!`);
      await onSuccess();
      onOpenChange(false);
      setStep(1);
      setExcelResult(null);
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <ModalHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-slate-50/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Nhập danh sách từ Google Form / Excel
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  <Sparkles className="w-3 h-3 text-blue-600" /> AI Heuristic
                </span>
              </ModalTitle>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Trích xuất danh sách VĐV, tự động đoán cột, kiểm tra thể thức Đơn/Đôi và gửi email thư mời
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">
              Bước {step}/3
            </span>
          </div>
        </ModalHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Upload File & Select Division */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nội dung thi đấu đích (Division)
                  </label>
                  <select
                    value={targetDivisionId}
                    onChange={(e) => setTargetDivisionId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.matchType})
                      </option>
                    ))}
                    {divisions.length === 0 && (
                      <option value="">-- Toàn giải đấu chung --</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Định dạng file hỗ trợ
                  </label>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-medium text-slate-600">
                    <span className="font-bold text-emerald-600">.xlsx</span>,{' '}
                    <span className="font-bold text-emerald-600">.xls</span>,{' '}
                    <span className="font-bold text-emerald-600">.csv</span> (xuất trực tiếp từ Google Sheets)
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-10 text-center transition-all hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer shadow-2xs"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 group-hover:scale-105 group-hover:border-blue-200 transition-transform">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-900">
                  Kéo thả file Google Form vào đây hoặc bấm để chọn
                </h4>
                <p className="mt-1 max-w-md text-xs font-medium text-slate-500">
                  Hệ thống sẽ tự động quét các cột Họ tên, Email, Số điện thoại, Tên đội và Cặp đấu mà không cần sửa file
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 rounded-lg font-bold text-xs border-slate-200 bg-white shadow-2xs hover:bg-slate-50 text-slate-700"
                >
                  Chọn file từ máy tính
                </Button>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Mẹo từ Sporto:</p>
                  <p className="text-blue-800 leading-relaxed font-medium">
                    Trong Google Form của bạn, chỉ cần bấm <strong>&quot;Xem câu trả lời trong Trang tính&quot;</strong> &rarr; Chọn <strong>Tệp &rarr; Tải xuống &rarr; Microsoft Excel (.xlsx)</strong> rồi tải lên tại đây.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Smart Column Mapping */}
          {step === 2 && excelResult && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Kiểm tra và khớp cột dữ liệu ({fileName})
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    AI đã tự động dò tìm các cột tương ứng. Bạn có thể kiểm tra và thay đổi nếu cần.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0">
                  Tổng {excelResult.rows.length} dòng
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Tên đội */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Tên Đội / Cặp đấu
                  </label>
                  <select
                    value={columnMapping.teamNameCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, teamNameCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Tự động ghép từ tên VĐV --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Họ tên VĐV 1 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                    Họ tên VĐV 1 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={columnMapping.player1NameCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, player1NameCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-blue-300 bg-blue-50/30 px-2.5 text-xs font-bold text-slate-900"
                  >
                    <option value="">-- Chọn cột --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email VĐV 1 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    Email VĐV 1 (Gửi thư mời)
                  </label>
                  <select
                    value={columnMapping.player1EmailCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, player1EmailCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Không có / Bỏ qua --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SĐT VĐV 1 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    SĐT VĐV 1
                  </label>
                  <select
                    value={columnMapping.player1PhoneCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, player1PhoneCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Không có / Bỏ qua --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Họ tên VĐV 2 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Họ tên VĐV 2 (Đồng đội)
                  </label>
                  <select
                    value={columnMapping.player2NameCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, player2NameCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Không có / Bỏ qua --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email VĐV 2 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Email VĐV 2
                  </label>
                  <select
                    value={columnMapping.player2EmailCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, player2EmailCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Không có / Bỏ qua --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SĐT VĐV 2 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    SĐT VĐV 2
                  </label>
                  <select
                    value={columnMapping.player2PhoneCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, player2PhoneCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Không có / Bỏ qua --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ELO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Điểm ELO / Trình độ
                  </label>
                  <select
                    value={columnMapping.eloCol}
                    onChange={(e) => setColumnMapping({ ...columnMapping, eloCol: e.target.value })}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Không có / Mặc định --</option>
                    {excelResult.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation Table */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Warnings Banner if format mismatch */}
              {formatMismatchCount > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      Phát hiện {formatMismatchCount} dòng có xung đột thể thức hoặc thông tin:
                    </span>
                  </div>
                  <p className="text-amber-700 font-medium">
                    Nội dung đang chọn: <strong>{targetDivision?.name} ({targetDivision?.matchType})</strong>.
                  </p>
                  {!isTargetDoubles && columnMapping.player2NameCol && (
                    <div className="rounded-lg border border-amber-300 bg-white/80 p-3">
                      <label className="flex items-center gap-2.5 cursor-pointer font-bold text-amber-900 select-none">
                        <input
                          type="checkbox"
                          checked={splitDoublesIntoSingles}
                          onChange={(e) => setSplitDoublesIntoSingles(e.target.checked)}
                          className="rounded border-amber-400 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Tự động tách cặp đôi trong mỗi dòng thành 2 VĐV thi đấu Đơn độc lập</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Toggles */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Tự động duyệt (APPROVED)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Đã đóng lệ phí (PAID)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={sendInvitationEmail}
                    onChange={(e) => setSendInvitationEmail(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Gửi email thư mời
                  </span>
                </label>
              </div>

              {/* Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                  <span>Danh sách đối soát ({activeItemsToImport.length}/{parsedItems.length} dòng được chọn)</span>
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                  >
                    {excludedRowIndices.size === 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">Tên Đội / VĐV</th>
                        <th className="p-3">VĐV 1 & Liên hệ</th>
                        <th className="p-3">VĐV 2 (Đồng đội)</th>
                        <th className="p-3 text-center">Trình/ELO</th>
                        <th className="p-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {parsedItems.map((item, idx) => {
                        const isExcluded = excludedRowIndices.has(item.rowIndex);
                        return (
                          <tr
                            key={item.rowIndex}
                            onClick={() => handleToggleRow(item.rowIndex)}
                            className={`cursor-pointer transition-colors ${
                              isExcluded
                                ? 'bg-slate-50/60 opacity-50'
                                : item.hasFormatMismatch
                                  ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                  : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={() => handleToggleRow(item.rowIndex)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                              />
                            </td>
                            <td className="p-3 font-bold text-slate-900">
                              {item.teamName}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{item.player1Name}</div>
                              {(item.player1Email || item.player1Phone) && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {item.player1Email} {item.player1Phone && `• ${item.player1Phone}`}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {item.player2Name ? (
                                <div>
                                  <div className="font-semibold text-slate-800">{item.player2Name}</div>
                                  {(item.player2Email || item.player2Phone) && (
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {item.player2Email} {item.player2Phone && `• ${item.player2Phone}`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">-- Không có --</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-800">
                              {item.elo ? item.elo : '--'}
                            </td>
                            <td className="p-3 text-center">
                              {item.hasFormatMismatch ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                                  title={item.mismatchReason}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" /> Lưu ý
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Hợp lệ
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                disabled={isImporting}
                className="h-9 px-4 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Quay lại
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isImporting}
              className="h-9 px-4 text-xs font-semibold"
            >
              Đóng
            </Button>

            {step === 1 && (
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Chọn file Excel
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                onClick={() => {
                  if (!columnMapping.player1NameCol && !columnMapping.teamNameCol) {
                    toast.error('Vui lòng chọn ít nhất cột Họ tên VĐV 1 hoặc Tên đội!');
                    return;
                  }
                  setStep(3);
                }}
                className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Tiếp tục đối soát <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                onClick={handleSubmitImport}
                disabled={isImporting || activeItemsToImport.length === 0}
                className="h-9 px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang nạp {activeItemsToImport.length} VĐV...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Xác nhận nạp {activeItemsToImport.length} VĐV
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
