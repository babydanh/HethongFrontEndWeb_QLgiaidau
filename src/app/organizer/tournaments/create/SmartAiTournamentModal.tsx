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
import { getErrorMessage } from '@/utils/error';
import {
  parseParticipantsExcel,
  downloadParticipantsTemplateExcel,
  type ParsedExcelResult,
} from '@/utils/exportTournament';
import { tournamentsApi, type CreateDivisionInput } from '@/features/tournaments/api';
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
  prizeDescription?: string | null;
  startDate?: string | null;
  registrationEndDate?: string | null;
}

interface ParsedTournament {
  name: string;
  sport: 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';
  startDate?: string | null;
  endDate?: string | null;
  venueName?: string | null;
  locationAddress?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  prizeDescription?: string | null;
  contactInfo?: { phone?: string | null; email?: string | null } | null;
  registrationMode?: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY' | null;
  isRanked?: boolean | null;
  startTime?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  teamSize?: 5 | 7 | 11 | null;
  maxReserve?: number | null;
  setsToWin?: number | null;
  pointsPerSet?: number | null;
  winByTwo?: boolean | null;
  maxPoints?: number | null;
  footballHalvesCount?: number | null;
  footballHalfDuration?: number | null;
  footballAllowDraw?: boolean | null;
  isRecurring?: boolean | null;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | null;
  recurringDayOfWeek?: number | null;
  recurringDaysOfWeek?: number[] | null;
  recurringTimeOfDay?: string | null;
  recurringAdvanceDays?: number | null;
  formats: ParsedFormat[];
  registrationFormFields?: RegistrationField[];
}

type CreationSettings = {
  visibility: 'PRIVATE' | 'PUBLIC';
  registrationMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  isRanked: boolean;
};

export default function SmartAiTournamentModal({
  isOpen,
  onClose,
  onSuccess,
}: SmartAiTournamentModalProps) {
  const translate = useTranslations('SmartAiTournament');
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const getBracketLabel = (bracketType?: ParsedFormat['bracketType'] | string | null) => {
    switch (bracketType) {
      case 'DOUBLE_ELIMINATION':
        return translate('bracketDoubleElimination');
      case 'ROUND_ROBIN':
        return translate('bracketRoundRobin');
      case 'GROUP_STAGE_KNOCKOUT':
        return translate('bracketGroupStageKnockout');
      case 'SINGLE_ELIMINATION':
      default:
        return translate('singleElimination');
    }
  };

  const getFieldTypeLabel = (type: RegistrationFieldType) => {
    const labels: Partial<Record<RegistrationFieldType, string>> = {
      TEXT: translate('fieldTypeText'),
      TEXTAREA: translate('fieldTypeTextarea'),
      NUMBER: translate('fieldTypeNumber'),
      PHONE: translate('fieldTypePhone'),
      EMAIL: translate('fieldTypeEmail'),
      SELECT: translate('fieldTypeSelect'),
      MULTI_SELECT: translate('fieldTypeMultiSelect'),
      CHECKBOX: translate('fieldTypeCheckbox'),
      FILE: translate('fieldTypeFile'),
    };
    return labels[type] || type;
  };
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
        const list = res.data ?? [];
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
  const [creationSettings, setCreationSettings] = useState<CreationSettings>({
    visibility: 'PUBLIC',
    registrationMode: 'APPROVAL',
    isRanked: true,
  });

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
      setSelectedFormatForExcel('all');
      setExcelResult(res);
      toast.success(translate('excelReadSuccess', { count: res.rows.length }));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, translate('excelReadError', { message: translate('invalidFile') })));
    }
  };

  const handleAnalyze = async () => {
    if (!sourceUrl.trim() && !rawText.trim()) {
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

      const parsed = res.data;
      if (parsed && parsed.name) {
        setParsedData(parsed);
        setCreationSettings({
          visibility: 'PUBLIC',
          registrationMode: parsed.registrationMode ?? 'APPROVAL',
          isRanked: parsed.isRanked ?? true,
        });
        setStep(2);
        toast.success(translate('analysisSuccess'));
      } else {
        toast.error(translate('analysisEmpty'));
      }
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const rawMessage = Array.isArray(responseMessage) ? responseMessage[0] : responseMessage;
      const normalizedMessage = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';
      if (normalizedMessage.includes('google form') && (normalizedMessage.includes('đăng nhập') || normalizedMessage.includes('sign in') || normalizedMessage.includes('sign-in'))) {
        toast.error(translate('googleFormAuthRequired'));
      } else {
        toast.error(getErrorMessage(err, translate('analysisError')));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!parsedData) return;

    let createdTournamentId: string | null = null;
    try {
      setIsCreating(true);

      // 1. Create lite tournament
      const primaryFormat = parsedData.formats?.[0] || { formatKey: 'DOUBLES_MALE', name: translate('defaultDivisionName', { count: 1 }), bracketType: 'SINGLE_ELIMINATION' as const, maxParticipants: 16 };
      const isFootballFormat = (formatKey: string) => formatKey.startsWith('FOOTBALL_');
      const getGenderRestriction = (formatKey: string): 'MALE' | 'FEMALE' | 'MIXED' | undefined => {
        if (formatKey === 'FOOTBALL_OPEN') return undefined;
        if (formatKey.includes('FEMALE')) return 'FEMALE';
        if (formatKey.includes('MIXED')) return 'MIXED';
        return 'MALE';
      };
      const matchType: 'singles' | 'doubles' | 'mixed_doubles' = isFootballFormat(primaryFormat.formatKey)
        ? 'doubles'
        : primaryFormat.formatKey.includes('SINGLES')
          ? 'singles'
          : primaryFormat.formatKey.includes('MIXED') ? 'mixed_doubles' : 'doubles';
      const genderRestriction = getGenderRestriction(primaryFormat.formatKey);

      const formats = parsedData.formats?.length ? parsedData.formats : [primaryFormat];
      const divisionInputs: CreateDivisionInput[] = formats.map((fmt, index) => ({
        name: fmt.name?.trim() || translate('defaultDivisionName', { count: index + 1 }),
        matchType: isFootballFormat(fmt.formatKey)
          ? MatchTypeDB.DOUBLES
          : fmt.formatKey.includes('SINGLES')
            ? MatchTypeDB.SINGLES
            : fmt.formatKey.includes('MIXED')
              ? MatchTypeDB.MIXED_DOUBLES
              : MatchTypeDB.DOUBLES,
        genderRestriction: getGenderRestriction(fmt.formatKey) as GenderRestriction | undefined,
        bracketType: fmt.bracketType || 'SINGLE_ELIMINATION',
        maxParticipants: fmt.maxParticipants || primaryFormat.maxParticipants || 16,
        startDate: fmt.startDate || parsedData.startDate || undefined,
        registrationEndDate: fmt.registrationEndDate || parsedData.registrationEndDate || undefined,
        minElo: fmt.minElo ?? null,
        maxElo: fmt.maxElo ?? null,
        prizeDescription: fmt.prizeDescription || undefined,
      }));

      const createRes = await tournamentsApi.createLiteTournament({
        name: parsedData.name.trim() || translate('defaultTournamentName'),
        sport: parsedData.sport,
        tournamentType: 'PUBLIC',
        format: matchType,
        genderRestriction,
        visibility: creationSettings.visibility,
        registrationMode: creationSettings.registrationMode,
        isRanked: creationSettings.isRanked,
        startDate: parsedData.startDate ? new Date(parsedData.startDate).toISOString() : undefined,
        endDate: parsedData.endDate ? new Date(parsedData.endDate).toISOString() : undefined,
        durationMinutes: parsedData.startDate && parsedData.endDate
          ? Math.max(15, Math.round((new Date(parsedData.endDate).getTime() - new Date(parsedData.startDate).getTime()) / 60000))
          : undefined,
        durationHours: parsedData.startDate && parsedData.endDate
          ? Number((Math.max(15, Math.round((new Date(parsedData.endDate).getTime() - new Date(parsedData.startDate).getTime()) / 60000)) / 60).toFixed(1))
          : undefined,
        startTime: parsedData.startTime || undefined,
        registrationStartDate: parsedData.registrationStartDate ? new Date(parsedData.registrationStartDate).toISOString() : undefined,
        registrationEndDate: parsedData.registrationEndDate ? new Date(parsedData.registrationEndDate).toISOString() : undefined,
        venueName: parsedData.venueName || undefined,
        locationAddress: parsedData.locationAddress || undefined,
        province: parsedData.province || undefined,
        district: parsedData.district || undefined,
        ward: parsedData.ward || undefined,
        description: parsedData.description || undefined,
        bannerUrl: parsedData.bannerUrl || undefined,
        logoUrl: parsedData.logoUrl || undefined,
        prizeDescription: parsedData.prizeDescription || undefined,
        contactInfo: parsedData.contactInfo ? {
          phone: parsedData.contactInfo.phone || undefined,
          email: parsedData.contactInfo.email || undefined,
        } : undefined,
        teamSize: parsedData.sport === 'football' && parsedData.teamSize ? parsedData.teamSize : undefined,
        maxReserve: parsedData.sport === 'football' && parsedData.maxReserve !== null ? parsedData.maxReserve ?? undefined : undefined,
        setsToWin: parsedData.sport !== 'football' ? parsedData.setsToWin ?? undefined : undefined,
        pointsPerSet: parsedData.sport !== 'football' ? parsedData.pointsPerSet ?? undefined : undefined,
        winByTwo: parsedData.sport !== 'football' && parsedData.winByTwo !== null ? parsedData.winByTwo ?? undefined : undefined,
        maxPoints: parsedData.sport !== 'football' ? parsedData.maxPoints ?? undefined : undefined,
        footballHalvesCount: parsedData.sport === 'football' ? parsedData.footballHalvesCount ?? undefined : undefined,
        footballHalfDuration: parsedData.sport === 'football' ? parsedData.footballHalfDuration ?? undefined : undefined,
        footballAllowDraw: parsedData.sport === 'football' && parsedData.footballAllowDraw !== null ? parsedData.footballAllowDraw ?? undefined : undefined,
        isRecurring: parsedData.isRecurring === true ? true : undefined,
        recurringFrequency: parsedData.isRecurring ? parsedData.recurringFrequency ?? undefined : undefined,
        recurringDayOfWeek: parsedData.isRecurring ? parsedData.recurringDayOfWeek ?? undefined : undefined,
        recurringDaysOfWeek: parsedData.isRecurring ? parsedData.recurringDaysOfWeek ?? undefined : undefined,
        recurringTimeOfDay: parsedData.isRecurring ? parsedData.recurringTimeOfDay ?? undefined : undefined,
        recurringAdvanceDays: parsedData.isRecurring ? parsedData.recurringAdvanceDays ?? undefined : undefined,
        bracketType: (primaryFormat.bracketType?.toLowerCase() as 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout') || 'single_elimination',
        maxTeams: primaryFormat.maxParticipants || 16,
        divisions: divisionInputs,
      });

      if (!createRes?.id || !Array.isArray(createRes.divisionIds) || createRes.divisionIds.length === 0) {
        throw new Error(translate('creationResponseInvalid'));
      }
      const tournamentId = createRes.id;
      createdTournamentId = tournamentId;
      const createdDivisionIds = createRes.divisionIds;
      const primaryDivisionId = createdDivisionIds[0];

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

      // 4. Import real participant/team records from Excel when provided.
      // Do not use the mock-participant endpoint here: it intentionally creates
      // test users and discards emails, phones, ELO, and source metadata.
      if (excelResult && excelResult.rows.length > 0) {
        const p1Column = excelResult.detectedMapping.player1NameCol || excelResult.headers[0];
        const p1EmailColumn = excelResult.detectedMapping.player1EmailCol;
        const p1PhoneColumn = excelResult.detectedMapping.player1PhoneCol;
        const p2Column = excelResult.detectedMapping.player2NameCol;
        const p2EmailColumn = excelResult.detectedMapping.player2EmailCol;
        const p2PhoneColumn = excelResult.detectedMapping.player2PhoneCol;
        const teamColumn = excelResult.detectedMapping.teamNameCol;
        const formatColumn = excelResult.detectedMapping.formatCol;
        const eloColumn = excelResult.detectedMapping.eloCol;
        const divisionRoutes = formats.map((format, index) => ({
          id: createdDivisionIds[index],
          name: format.name?.trim() || translate('defaultDivisionName', { count: index + 1 }),
          isDoubles: !format.formatKey.includes('SINGLES'),
        }));
        const normalizeDivisionName = (value: string) => value.trim().toLocaleLowerCase(locale).replace(/[–—]/g, '-');
        const manualRoute = selectedFormatForExcel !== 'all'
          ? divisionRoutes[Number(selectedFormatForExcel)]
          : undefined;
        if (selectedFormatForExcel !== 'all' && !manualRoute) {
          throw new Error(translate('excelDivisionRequired'));
        }

        const rowsWithIndex = excelResult.rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => {
            const p1 = String(row[p1Column] ?? '').trim();
            const p2 = p2Column ? String(row[p2Column] ?? '').trim() : '';
            const team = teamColumn ? String(row[teamColumn] ?? '').trim() : '';
            return Boolean(p1 || p2 || team);
          });
        const participantsByDivision = new Map<
          string,
          Array<Parameters<typeof tournamentsApi.importParticipants>[1]['participants'][number]>
        >();

        for (const { row, index } of rowsWithIndex) {
          const rawDivision = formatColumn ? String(row[formatColumn] ?? '').trim() : '';
          const route = manualRoute || (divisionRoutes.length === 1
            ? divisionRoutes[0]
            : rawDivision
              ? divisionRoutes.find((candidate) => {
                  const raw = normalizeDivisionName(rawDivision);
                  const name = normalizeDivisionName(candidate.name);
                  return raw === name || raw.includes(name) || name.includes(raw);
                })
              : undefined);
          if (!route) {
            throw new Error(rawDivision
              ? translate('excelDivisionUnknown', { name: rawDivision })
              : translate('excelDivisionRequired'));
          }

          const player1Name = String(row[p1Column] ?? '').trim();
          const player2Name = p2Column ? String(row[p2Column] ?? '').trim() : '';
          const teamName = teamColumn ? String(row[teamColumn] ?? '').trim() : '';
          const player1Email = p1EmailColumn ? String(row[p1EmailColumn] ?? '').trim() || undefined : undefined;
          const player1Phone = p1PhoneColumn ? String(row[p1PhoneColumn] ?? '').trim() || undefined : undefined;
          const player2Email = p2EmailColumn ? String(row[p2EmailColumn] ?? '').trim() || undefined : undefined;
          const player2Phone = p2PhoneColumn ? String(row[p2PhoneColumn] ?? '').trim() || undefined : undefined;
          const rawElo = eloColumn ? Number.parseFloat(String(row[eloColumn] ?? '')) : Number.NaN;
          if (route.isDoubles && !player2Name) {
            throw new Error(translate('doublesMissingPlayerTwo'));
          }
          if (!route.isDoubles && (player2Name || player2Email || player2Phone)) {
            throw new Error(translate('singlesHasPlayerTwo'));
          }

          const mappedColumns = new Set([
            p1Column,
            p1EmailColumn,
            p1PhoneColumn,
            p2Column,
            p2EmailColumn,
            p2PhoneColumn,
            teamColumn,
            formatColumn,
            eloColumn,
          ].filter((column): column is string => Boolean(column)));
          const importedResponses = Object.fromEntries(
            Object.entries(row)
              .filter(([column, value]) => !mappedColumns.has(column) && value !== null && value !== undefined && String(value).trim() !== '')
              .map(([column, value]) => [column, value]),
          );

          const participant = {
            teamName: teamName || (player2Name ? `${player1Name} / ${player2Name}` : player1Name),
            player1Name: player1Name || teamName,
            player1Email,
            player1Phone,
            player2Name: player2Name || undefined,
            player2Email,
            player2Phone,
            elo: Number.isFinite(rawElo) ? rawElo : undefined,
            // Excel does not prove payment or organizer approval; keep the roster pending
            // until the organizer verifies it in Manage.
            isPaid: false,
            autoApprove: false,
            customResponses: {
              ...importedResponses,
              importedFrom: 'AI_EXCEL',
              sourceFileName: fileName || undefined,
              sourceRowIndex: index + 1,
              sourceDivision: rawDivision || route.name,
            },
          };
          const divisionParticipants = participantsByDivision.get(route.id) || [];
          divisionParticipants.push(participant);
          participantsByDivision.set(route.id, divisionParticipants);
        }

        for (const [divisionId, participants] of participantsByDivision) {
          await tournamentsApi.importParticipants(tournamentId, {
            divisionId,
            participants,
            sendInvitationEmail: false,
            notifyLinkedAccounts: true,
          });
        }
      }

      toast.success(translate('creationSuccess'));
      onSuccess(tournamentId);
      onClose();
    } catch (err: unknown) {
      if (createdTournamentId) {
        toast.error(translate('partialCreationWarning'));
        onSuccess(createdTournamentId);
        onClose();
      } else {
        toast.error(getErrorMessage(err, translate('creationError', { message: translate('tryAgainLater') })));
      }
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
                        <option value="pickleball">{translate('pickleball')}</option>
                        <option value="badminton">{translate('badminton')}</option>
                        <option value="tennis">{translate('tennis')}</option>
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

              {/* Explicit creation policy — these values are organizer decisions, not AI guesses. */}
              <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{translate('creationPolicyTitle')}</h4>
                  <p className="mt-1 text-xs text-slate-600">{translate('creationPolicyDescription')}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                    <span>{translate('visibilityLabel')}</span>
                    <select
                      value={creationSettings.visibility}
                      onChange={(event) => setCreationSettings((current) => ({
                        ...current,
                        visibility: event.target.value as CreationSettings['visibility'],
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="PUBLIC">{translate('publicVisibility')}</option>
                      <option value="PRIVATE">{translate('privateVisibility')}</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                    <span>{translate('registrationModeLabel')}</span>
                    <select
                      value={creationSettings.registrationMode}
                      onChange={(event) => setCreationSettings((current) => ({
                        ...current,
                        registrationMode: event.target.value as CreationSettings['registrationMode'],
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="OPEN">{translate('registrationOpen')}</option>
                      <option value="APPROVAL">{translate('registrationApproval')}</option>
                      <option value="INVITE_ONLY">{translate('registrationInviteOnly')}</option>
                    </select>
                  </label>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={creationSettings.isRanked}
                    onChange={(event) => setCreationSettings((current) => ({
                      ...current,
                      isRanked: event.target.checked,
                    }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {creationSettings.isRanked ? translate('rankedOption') : translate('unrankedOption')}
                    <span className="ml-1 font-normal text-slate-500">{translate('rankingSettingHint')}</span>
                  </span>
                </label>
                {creationSettings.visibility === 'PUBLIC' && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {translate('publicCreationNotice')}
                  </p>
                )}
                <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                  {translate('clonePolicyNotice')}
                </p>
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
                        <span>{getBracketLabel(fmt.bracketType)}</span>
                        {(fmt.minElo || fmt.maxElo) && (
                          <span>{translate('eloRange', { min: fmt.minElo ?? 0, max: fmt.maxElo ?? translate('unlimited') })}</span>
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
                      {translate('registrationFormTitle', { count: parsedData.registrationFormFields.length })}
                    </h4>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">{translate('registrationFormDraftBadge')}</span>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                    {parsedData.registrationFormFields.slice(0, 12).map((field) => (
                      <div key={field.id} className="flex items-start justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{field.label}</p>
                          <p className="text-[11px] text-slate-500">{getFieldTypeLabel(field.type)}{field.required ? ` · ${translate('requiredField')}` : ` · ${translate('optionalField')}`}{field.options?.length ? ` · ${translate('optionCount', { count: field.options.length })}` : ''}{field.needsReview ? ` · ${translate('needsReview')}` : ''}</p>
                        </div>
                        {field.type === 'FILE' && <span className="text-[11px] text-slate-400 shrink-0">{translate('fileField')}</span>}
                      </div>
                    ))}
                    {parsedData.registrationFormFields.length > 12 && <p className="text-[11px] text-slate-500 text-center">{translate('remainingQuestions', { count: parsedData.registrationFormFields.length - 12 })}</p>}
                  </div>
                  <p className="text-xs text-slate-500">{translate('registrationFormHelp')}</p>
                  {parsedData.registrationFormFields.some((field) => field.needsReview) && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{translate('registrationFormReviewWarning')}</p>}
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
                  {parsedData.formats.length > 1 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-amber-900">
                        {translate('excelDivisionMode')}
                      </label>
                      <select
                        value={selectedFormatForExcel}
                        onChange={(event) => setSelectedFormatForExcel(event.target.value)}
                        className="w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-slate-800"
                      >
                        {excelResult.detectedMapping.formatCol ? (
                          <option value="all">{translate('excelDivisionAuto')}</option>
                        ) : (
                          <option value="all" disabled>{translate('excelDivisionRequired')}</option>
                        )}
                        {parsedData.formats.map((format, formatIndex) => (
                          <option key={formatIndex} value={String(formatIndex)}>
                            {translate('excelDivisionManual')}: {format.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                              <td className="py-1 font-medium text-slate-700">{p1 || translate('emptyCell')}</td>
                              <td className="py-1 text-slate-500">{phone || translate('emptyCell')}</td>
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
