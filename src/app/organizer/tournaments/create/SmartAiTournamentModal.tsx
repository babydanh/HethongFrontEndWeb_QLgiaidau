'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  Link as LinkIcon,
  FileText,
  Download,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Layers,
  ChevronRight,
  TableProperties,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios';
import {
  parseParticipantsExcel,
  downloadParticipantsTemplateExcel,
  type ParsedExcelResult,
} from '@/utils/exportTournament';
import { tournamentsApi, divisionsApi, type CreateDivisionInput } from '@/features/tournaments/api';
import { categoriesApi, type Category } from '@/features/categories/api';
import { MatchTypeDB, GenderRestriction } from '@/types/tournament';

interface SmartAiTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tournamentId: string) => void;
}

interface ParsedFormat {
  name: string;
  formatKey: string;
  bracketType?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT' | null;
  maxParticipants?: number | null;
  minElo?: number | null;
  maxElo?: number | null;
}

interface ParsedTournament {
  name: string;
  sport: 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';
  startDate?: string | null;
  endDate?: string | null;
  venueName?: string | null;
  locationAddress?: string | null;
  province?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  formats: ParsedFormat[];
}

export default function SmartAiTournamentModal({
  isOpen,
  onClose,
  onSuccess,
}: SmartAiTournamentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [sportHint, setSportHint] = useState<string>('pickleball');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch active categories from admin
  useEffect(() => {
    let active = true;
    categoriesApi
      .getCategories()
      .then((res) => {
        if (!active) return;
        const list = (res as any)?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setCategories(list);
          setSportHint(list[0].slug || list[0].id);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Parsed AI data
  const [parsedData, setParsedData] = useState<ParsedTournament | null>(null);

  // Excel parsed data
  const [excelResult, setExcelResult] = useState<ParsedExcelResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [selectedFormatForExcel, setSelectedFormatForExcel] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFileName(file.name);
      const res = await parseParticipantsExcel(file);
      setExcelResult(res);
      toast.success(`Đã đọc ${res.rows.length} dòng từ file Excel!`);
    } catch (err: any) {
      toast.error('Lỗi khi đọc file Excel: ' + (err.message || 'File không hợp lệ'));
    }
  };

  const handleAnalyze = async () => {
    if (!sourceUrl.trim() && !rawText.trim() && !excelResult) {
      toast.error('Vui lòng nhập Link Form, dán văn bản Điều lệ hoặc tải file Excel!');
      return;
    }

    try {
      setIsAnalyzing(true);
      const res = await api.post<{ success: boolean; data: ParsedTournament }>('/ai/parse-tournament-source', {
        sourceUrl: sourceUrl.trim() || undefined,
        rawText: rawText.trim() || undefined,
        sportHint,
      });

      const parsed = (res as any)?.data || (res as any);
      if (parsed && parsed.name) {
        setParsedData(parsed);
        setStep(2);
        toast.success('AI đã trích xuất dữ liệu thành công!');
      } else {
        toast.error('Không nhận được dữ liệu phân tích từ AI.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi phân tích AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!parsedData) return;

    try {
      setIsCreating(true);

      // 1. Create lite tournament
      const primaryFormat = parsedData.formats?.[0] || { formatKey: 'DOUBLES_MALE', name: 'Đôi Nam', bracketType: 'SINGLE_ELIMINATION' as const, maxParticipants: 16 };
      const matchType: 'singles' | 'doubles' = primaryFormat.formatKey.includes('SINGLES') ? 'singles' : 'doubles';
      const genderRestriction: 'MALE' | 'FEMALE' | 'MIXED' = primaryFormat.formatKey.includes('FEMALE')
        ? 'FEMALE'
        : primaryFormat.formatKey.includes('MIXED')
        ? 'MIXED'
        : 'MALE';

      const createRes = await tournamentsApi.createLiteTournament({
        name: parsedData.name.trim() || 'Giải đấu thể thao',
        sport: parsedData.sport,
        format: matchType,
        genderRestriction,
        visibility: 'PUBLIC',
        registrationMode: 'OPEN',
        isRanked: true,
        startDate: parsedData.startDate ? new Date(parsedData.startDate).toISOString() : undefined,
        endDate: parsedData.endDate ? new Date(parsedData.endDate).toISOString() : undefined,
        venueName: parsedData.venueName || undefined,
        locationAddress: parsedData.locationAddress || undefined,
        province: parsedData.province || undefined,
        description: parsedData.description || undefined,
        bannerUrl: parsedData.bannerUrl || undefined,
        bracketType: (primaryFormat.bracketType?.toLowerCase() as any) || 'single_elimination',
        maxTeams: primaryFormat.maxParticipants || 16,
      });

      const tournamentId = createRes.id;
      let primaryDivisionId: string | undefined = undefined;

      // 2. Create divisions
      if (parsedData.formats.length > 0) {
        const existingDivs = await divisionsApi.getDivisions(tournamentId);
        const existingList = (existingDivs as any)?.data ?? existingDivs ?? [];

        for (const [idx, fmt] of parsedData.formats.entries()) {
          const divMatchType = fmt.formatKey.includes('SINGLES') ? MatchTypeDB.SINGLES : MatchTypeDB.DOUBLES;
          const divGender = fmt.formatKey.includes('FEMALE')
            ? GenderRestriction.FEMALE
            : fmt.formatKey.includes('MIXED')
            ? GenderRestriction.MIXED
            : GenderRestriction.MALE;

          const divInput: CreateDivisionInput = {
            name: fmt.name || `Hạng đấu ${idx + 1}`,
            matchType: divMatchType,
            genderRestriction: divGender,
            bracketType: fmt.bracketType || 'SINGLE_ELIMINATION',
            maxParticipants: fmt.maxParticipants || 16,
            minElo: fmt.minElo ?? null,
            maxElo: fmt.maxElo ?? null,
          };

          if (idx === 0 && existingList.length > 0) {
            primaryDivisionId = existingList[0].id;
            await divisionsApi.updateDivision(existingList[0].id, divInput);
          } else {
            const createdDiv = await divisionsApi.createDivision(tournamentId, divInput);
            if (idx === 0) primaryDivisionId = (createdDiv as any)?.data?.id || (createdDiv as any)?.id;
          }
        }
      }

      // 3. Batch import participants from Excel if available
      if (excelResult && excelResult.rows.length > 0) {
        const p1Col = excelResult.detectedMapping.player1NameCol || excelResult.headers[0];
        const names = excelResult.rows
          .map((r) => {
            const p1 = r[p1Col];
            const p2 = excelResult.detectedMapping.player2NameCol ? r[excelResult.detectedMapping.player2NameCol] : '';
            const team = excelResult.detectedMapping.teamNameCol ? r[excelResult.detectedMapping.teamNameCol] : '';
            if (team) return String(team).trim();
            if (p1 && p2) return `${String(p1).trim()} / ${String(p2).trim()}`;
            return String(p1 || '').trim();
          })
          .filter(Boolean);

        if (names.length > 0) {
          try {
            await tournamentsApi.seedMockParticipants(tournamentId, names, primaryDivisionId);
          } catch (seedErr) {
            console.warn('Could not seed participants:', seedErr);
          }
        }
      }

      toast.success('Đã tạo giải đấu và nạp dữ liệu thành công!');
      onSuccess(tournamentId);
      onClose();
    } catch (err: any) {
      toast.error('Lỗi khi tạo giải đấu: ' + (err.message || 'Thử lại sau'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white text-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg leading-tight text-slate-900">Tạo giải đấu thông minh với AI &amp; Excel</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động trích xuất từ Google Form, Điều lệ và nạp danh sách VĐV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Option 1: Google Form / Web Link */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  Đường dẫn Google Form hoặc Link Điều lệ giải (Tùy chọn)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/forms/d/e/... hoặc link thông báo giải"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
                <p className="text-xs text-slate-500">
                  AI sẽ tự động đọc tiêu đề, thể thức, các hạng mục và ngày thi đấu từ biểu mẫu.
                </p>
              </div>

              {/* Option 2: Copy Paste Text */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Hoặc Dán nội dung thông báo / Điều lệ giải đấu
                </label>
                <textarea
                  rows={4}
                  placeholder="Dán toàn bộ bài đăng Facebook, thông báo Zalo hoặc điều lệ giải vào đây..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 resize-none"
                />
              </div>

              {/* Option 3: Excel Upload */}
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Tải lên danh sách VĐV (.xlsx, .csv)</h4>
                      <p className="text-xs text-slate-500">Tải file Google Sheets xuất ra hoặc file Excel danh sách</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadParticipantsTemplateExcel}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file mẫu
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-sm hover:bg-slate-50 transition-all"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    {fileName ? fileName : 'Chọn file Excel từ máy'}
                  </button>
                  {excelResult && (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã nạp {excelResult.rows.length} VĐV
                    </span>
                  )}
                </div>
              </div>

              {/* Sport Selector Hint (Loaded from active categories) */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Gợi ý môn thi đấu:</label>
                  <select
                    value={sportHint}
                    onChange={(e) => setSportHint(e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.slug || cat.name.toLowerCase()}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="pickleball">Pickleball</option>
                        <option value="badminton">Cầu lông</option>
                        <option value="tennis">Tennis</option>
                        <option value="table_tennis">Bóng bàn</option>
                        <option value="football">Bóng đá</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && parsedData && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] rounded-md uppercase tracking-wider mb-1">
                      {parsedData.sport}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{parsedData.name}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {parsedData.startDate ? new Date(parsedData.startDate).toLocaleDateString('vi-VN') : 'Chưa rõ ngày'}
                      {parsedData.endDate ? ` - ${new Date(parsedData.endDate).toLocaleDateString('vi-VN')}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{parsedData.venueName || parsedData.province || 'Chưa cập nhật sân'}</span>
                  </div>
                </div>
              </div>

              {/* Formats Extracted */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  Các Hạng đấu / Divisions được AI nhận diện ({parsedData.formats.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parsedData.formats.map((fmt, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{fmt.name}</span>
                        <span className="text-[11px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                          {fmt.maxParticipants || 16} đội
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{fmt.bracketType || 'Loại trực tiếp'}</span>
                        {(fmt.minElo || fmt.maxElo) && (
                          <span>• ELO: {fmt.minElo || 0} - {fmt.maxElo || '∞'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excel Preview */}
              {excelResult && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <TableProperties className="w-4 h-4 text-emerald-600" />
                      Danh sách {excelResult.rows.length} VĐV từ file Excel sẽ được nạp tự động
                    </span>
                    <span className="font-semibold text-slate-500">{fileName}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400">
                          <th className="pb-1 font-semibold">STT</th>
                          <th className="pb-1 font-semibold">VĐV / Đội</th>
                          <th className="pb-1 font-semibold">SĐT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelResult.rows.slice(0, 5).map((row, rIdx) => {
                          const p1 = row[excelResult.detectedMapping.player1NameCol || excelResult.headers[0]];
                          const phone = excelResult.detectedMapping.player1PhoneCol ? row[excelResult.detectedMapping.player1PhoneCol] : '';
                          return (
                            <tr key={rIdx} className="border-b border-slate-50">
                              <td className="py-1 text-slate-400">{rIdx + 1}</td>
                              <td className="py-1 font-medium text-slate-700">{p1 || '---'}</td>
                              <td className="py-1 text-slate-500">{phone || '---'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {excelResult.rows.length > 5 && (
                      <p className="text-[10px] text-slate-400 text-center pt-1.5">
                        và {excelResult.rows.length - 5} vận động viên khác...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Đang Phân Tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Phân Tích Với AI
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Quay lại sửa
              </button>
              <button
                type="button"
                onClick={handleCreateTournament}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang Tạo Giải &amp; Nạp VĐV...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    Tạo Giải &amp; Vào Quản Lý Ngay
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
