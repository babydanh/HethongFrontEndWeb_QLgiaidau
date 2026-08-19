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
import { useLocale, useTranslations } from 'next-intl';
import type { RegistrationField, RegistrationFieldType } from '@/features/tournaments/registration-form';

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
  registrationFormFields?: RegistrationField[];
}

export default function SmartAiTournamentModal({
  isOpen,
  onClose,
  onSuccess,
}: SmartAiTournamentModalProps) {
  const translate = useTranslations('SmartAiTournament');
  const locale = useLocale();
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
      toast.success(translate('excelReadSuccess', { count: res.rows.length }));
    } catch (err: any) {
      toast.error(translate('excelReadError', { message: err.message || translate('invalidFile') }));
    }
  };

  const handleAnalyze = async () => {
    if (!sourceUrl.trim() && !rawText.trim() && !excelResult) {
      toast.error(translate('sourceRequired'));
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
        toast.success(translate('analysisSuccess'));
      } else {
        toast.error(translate('analysisEmpty'));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || translate('analysisError'));
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
      const createdDivisionIds: string[] = [];

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
            createdDivisionIds.push(existingList[0].id);
            await divisionsApi.updateDivision(existingList[0].id, divInput);
          } else {
            const createdDiv = await divisionsApi.createDivision(tournamentId, divInput);
            const divisionId = (createdDiv as any)?.data?.id || (createdDiv as any)?.id;
            if (divisionId) {
              createdDivisionIds.push(divisionId);
              if (idx === 0) primaryDivisionId = divisionId;
            }
          }
        }
      }

      // 3. Batch import participants from Excel if available
      // 3. Clone the detected Google Form questions into a draft registration form.
      // The organizer reviews and publishes it from the management workspace; AI never
      // silently exposes a form to players.
      const registrationFormFields = (parsedData.registrationFormFields ?? [])
        .filter((field): field is RegistrationField => Boolean(field && field.label && field.type))
        .map((field, index) => ({
          ...field,
          id: field.id || `ai_field_${index + 1}`,
          required: field.required === true,
          type: field.type as RegistrationFieldType,
        }));
      if (registrationFormFields.length > 0) {
        await tournamentsApi.updateTournament(tournamentId, {
          tournamentConfig: {
            registrationForm: {
              version: 1,
              status: 'DRAFT',
              fields: registrationFormFields,
              divisionIds: createdDivisionIds,
            },
          },
        });
      }

      // 4. Batch import participants from Excel if available
      if (excelResult && excelResult.rows.length > 0) {
        const player2Column = excelResult.detectedMapping.player2NameCol;
        const hasPlayer2Data = Boolean(player2Column && excelResult.rows.some((row) => String(row[player2Column] ?? '').trim().length > 0));
        const primaryIsDoubles = !primaryFormat.formatKey.includes('SINGLES');
        if (primaryIsDoubles !== hasPlayer2Data) {
          throw new Error(primaryIsDoubles
            ? 'Nội dung đang chọn là nội dung đôi nhưng file Excel chưa có cột VĐV 2. Hãy chọn đúng nội dung hoặc bổ sung cột VĐV 2.'
            : 'Nội dung đang chọn là nội dung đơn nhưng file Excel có cột VĐV 2. Hãy chọn nội dung đôi hoặc bỏ cột VĐV 2.');
        }
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

      toast.success(translate('creationSuccess'));
      onSuccess(tournamentId);
      onClose();
    } catch (err: any) {
      toast.error(translate('creationError', { message: err.message || translate('tryAgainLater') }));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isAnalyzing && !isCreating) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white text-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg leading-tight text-slate-900">{translate('title')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {translate('subtitle')}
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
                  {translate('sourceLabel')}
                </label>
                <input
                  type="url"
                  placeholder={translate('sourcePlaceholder')}
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
                <p className="text-xs text-slate-500">
                  {translate('sourceHelp')}
                </p>
              </div>

              {/* Option 2: Copy Paste Text */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  {translate('textLabel')}
                </label>
                <textarea
                  rows={4}
                  placeholder={translate('textPlaceholder')}
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
                      <h4 className="text-sm font-bold text-slate-800">{translate('uploadTitle')}</h4>
                      <p className="text-xs text-slate-500">{translate('uploadDescription')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadParticipantsTemplateExcel(locale)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {translate('downloadTemplate')}
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
                    {fileName ? fileName : translate('chooseFile')}
                  </button>
                  {excelResult && (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {translate('participantsLoaded', { count: excelResult.rows.length })}
                    </span>
                  )}
                </div>
              </div>

              {/* Sport Selector Hint (Loaded from active categories) */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">{translate('sportHintLabel')}</label>
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
                        <option value="badminton">{translate('badminton')}</option>
                        <option value="tennis">Tennis</option>
                        <option value="table_tennis">{translate('tableTennis')}</option>
                        <option value="football">{translate('football')}</option>
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
                      {translate(`sport.${parsedData.sport}`)}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{parsedData.name}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {parsedData.startDate ? new Date(parsedData.startDate).toLocaleDateString(locale) : translate('unknownDate')}
                      {parsedData.endDate ? ` - ${new Date(parsedData.endDate).toLocaleDateString(locale)}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{parsedData.venueName || parsedData.province || translate('unknownVenue')}</span>
                  </div>
                </div>
              </div>

              {/* Formats Extracted */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  {translate('recognizedDivisions', { count: parsedData.formats.length })}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parsedData.formats.map((fmt, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{fmt.name}</span>
                        <span className="text-[11px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                          {translate('teamsCount', { count: fmt.maxParticipants || 16 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>                          {fmt.bracketType || translate('singleElimination')}</span>
                        {(fmt.minElo || fmt.maxElo) && (
                          <span>• ELO: {fmt.minElo || 0} - {fmt.maxElo || '∞'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {parsedData.registrationFormFields && parsedData.registrationFormFields.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Form đăng ký được AI nhận diện ({parsedData.registrationFormFields.length} câu hỏi)
                    </h4>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">Bản nháp để rà soát</span>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                    {parsedData.registrationFormFields.slice(0, 12).map((field) => (
                      <div key={field.id} className="flex items-start justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{field.label}</p>
                          <p className="text-[11px] text-slate-500">{field.type}{field.required ? ' · Bắt buộc' : ' · Tùy chọn'}{field.options?.length ? ` · ${field.options.length} lựa chọn` : ''}{field.needsReview ? ' · Cần kiểm tra' : ''}</p>
                        </div>
                        {field.type === 'FILE' && <span className="text-[11px] text-slate-400 shrink-0">Tệp</span>}
                      </div>
                    ))}
                    {parsedData.registrationFormFields.length > 12 && <p className="text-[11px] text-slate-500 text-center">Còn {parsedData.registrationFormFields.length - 12} câu hỏi sẽ được lưu đầy đủ trong bản nháp.</p>}
                  </div>
                  <p className="text-xs text-slate-500">AI đọc ngữ nghĩa câu hỏi từ Google Form/link, giữ lựa chọn và ràng buộc. Sau khi tạo, vào tab <strong>Đăng ký</strong> để chỉnh sửa rồi bấm công bố.</p>
                  {parsedData.registrationFormFields.some((field) => field.needsReview) && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Một số câu hỏi có cách hiểu chưa chắc chắn. Chúng được giữ nguyên ở bản nháp và phải được rà lại trước khi công bố.</p>}
                </div>
              )}

              {/* Excel Preview */}
              {excelResult && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <TableProperties className="w-4 h-4 text-emerald-600" />
                      {translate('excelPreviewTitle', { count: excelResult.rows.length })}
                    </span>
                    <span className="font-semibold text-slate-500">{fileName}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400">
                          <th className="pb-1 font-semibold">{translate('index')}</th>
                          <th className="pb-1 font-semibold">{translate('athleteOrTeam')}</th>
                          <th className="pb-1 font-semibold">{translate('phone')}</th>
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
                        {translate('moreParticipants', { count: excelResult.rows.length - 5 })}
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
                {translate('cancel')}
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
                    {translate('analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {translate('analyzeWithAi')}
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
                {translate('backToEdit')}
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
                    {translate('creating')}
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    {translate('createAndManage')}
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
