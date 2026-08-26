'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { History, Loader2, ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { categoriesApi, type Category } from '@/features/categories/api';
import {
  rankingsApi,
  type AdminEloOperation,
  type AdminEloOperationHistoryItem,
  type AdminEloOperationPayload,
  type FootballTeamRanking,
  type AdminEloPairSummary,
  type AdminEloPlayerContextDetail,
  type AdminEloPlayerDetail,
  type AdminEloPlayerSummary,
  type AdminRankingContext,
  type AdminRankingStatus,
} from '@/features/rankings/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';

const PAGE_LIMIT = 30;

type FilterState = {
  search: string;
  status: AdminRankingStatus | '';
  categoryId: string;
  matchType: string;
};

const INITIAL_QUERY: FilterState = {
  search: '',
  status: '',
  categoryId: '',
  // Admin operations currently target PUBLIC user_ranks only; pair/team ELO has a separate grain.
  matchType: 'SINGLES',
};

const RATING_OPERATIONS: AdminEloOperation[] = ['ADD', 'SUBTRACT', 'SET', 'RESET'];
const VISIBILITY_OPERATIONS: AdminEloOperation[] = ['HIDE', 'BAN', 'RESTORE'];

const isRatingOperation = (operation: AdminEloOperation) => RATING_OPERATIONS.includes(operation);

const makeOperationKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `admin-elo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
};

const getMatchTypeLabelKey = (matchType: string) => {
  if (matchType === 'SINGLES') return 'singles';
  if (matchType === 'DOUBLES') return 'doubles';
  if (matchType === 'MIXED_DOUBLES') return 'mixedDoubles';
  return 'matchTypeUnknown';
};

const getOperationLabelKey = (operation: AdminEloOperation) => {
  switch (operation) {
    case 'ADD': return 'add';
    case 'SUBTRACT': return 'subtract';
    case 'SET': return 'set';
    case 'RESET': return 'reset';
    case 'HIDE': return 'hide';
    case 'BAN': return 'ban';
    case 'RESTORE': return 'restore';
  }
};

const previewElo = (context: AdminRankingContext, operation: AdminEloOperation, value: number) => {
  if (operation === 'ADD') return context.eloPoints + value;
  if (operation === 'SUBTRACT') return Math.max(0, context.eloPoints - value);
  if (operation === 'SET') return value;
  if (operation === 'RESET') return 1000;
  return context.eloPoints;
};

const toAdminContext = (player: AdminEloPlayerDetail, context: AdminEloPlayerContextDetail): AdminRankingContext => ({
  contextId: context.contextId,
  userId: player.user.id,
  email: player.user.email,
  fullName: player.user.fullName,
  avatarUrl: player.user.avatarUrl,
  categoryId: context.categoryId,
  scope: context.scope,
  matchType: context.matchType,
  genderRestriction: context.genderRestriction,
  eloPoints: context.eloPoints,
  matchesPlayed: context.matchesPlayed,
  matchesWon: context.matchesWon,
  winStreak: context.winStreak,
  peakElo: context.peakElo,
  updatedAt: context.updatedAt,
  status: context.status,
  statusExpiresAt: context.statusExpiresAt,
});

const createAdminContextDraft = (player: AdminEloPlayerDetail, categoryId: string): AdminRankingContext => ({
  contextId: '',
  userId: player.user.id,
  email: player.user.email,
  fullName: player.user.fullName,
  avatarUrl: player.user.avatarUrl,
  categoryId,
  scope: 'PUBLIC',
  matchType: 'SINGLES',
  genderRestriction: null,
  eloPoints: 1000,
  matchesPlayed: 0,
  matchesWon: 0,
  winStreak: 0,
  peakElo: 1000,
  updatedAt: new Date().toISOString(),
  status: 'VISIBLE',
  statusExpiresAt: null,
});

const createAdminContextDraftFromSummary = (player: AdminEloPlayerSummary, categoryId: string): AdminRankingContext => ({
  contextId: '',
  userId: player.userId,
  email: player.email,
  fullName: player.fullName,
  avatarUrl: player.avatarUrl,
  categoryId,
  scope: 'PUBLIC',
  matchType: 'SINGLES',
  genderRestriction: null,
  eloPoints: 1000,
  matchesPlayed: 0,
  matchesWon: 0,
  winStreak: 0,
  peakElo: 1000,
  updatedAt: new Date().toISOString(),
  status: 'VISIBLE',
  statusExpiresAt: null,
});

export default function AdminEloPage() {
  const translate = useTranslations('AdminElo');
  const locale = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [players, setPlayers] = useState<AdminEloPlayerSummary[]>([]);
  const [pairs, setPairs] = useState<AdminEloPairSummary[]>([]);
  const [footballTeams, setFootballTeams] = useState<FootballTeamRanking[]>([]);
  const [query, setQuery] = useState<FilterState>(INITIAL_QUERY);
  const [search, setSearch] = useState(INITIAL_QUERY.search);
  const [status, setStatus] = useState<AdminRankingStatus | ''>(INITIAL_QUERY.status);
  const [categoryId, setCategoryId] = useState(INITIAL_QUERY.categoryId);
  const [matchType, setMatchType] = useState(INITIAL_QUERY.matchType);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminEloPlayerSummary | null>(null);
  const [playerDetail, setPlayerDetail] = useState<AdminEloPlayerDetail | null>(null);
  const [playerDetailLoading, setPlayerDetailLoading] = useState(false);
  const [selected, setSelected] = useState<AdminRankingContext | null>(null);
  const [operation, setOperation] = useState<AdminEloOperation>('ADD');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [operationKey, setOperationKey] = useState<string | null>(null);
  const [operationPayloadSignature, setOperationPayloadSignature] = useState<string | null>(null);
  const [newContextCategoryId, setNewContextCategoryId] = useState('');
  const [historyContext, setHistoryContext] = useState<AdminRankingContext | null>(null);
  const [history, setHistory] = useState<AdminEloOperationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const requestSequence = useRef(0);
  const historyRequestSequence = useRef(0);
  const playerDetailRequestSequence = useRef(0);
  const canManage = currentUser?.roles?.includes('ADMIN') === true;
  const activeCategories = useMemo(() => (Array.isArray(categories) ? categories.filter((category) => category?.isActive) : []), [categories]);
  const selectedCategory = useMemo(
    () => activeCategories.find((category) => category.id === query.categoryId) ?? null,
    [activeCategories, query.categoryId],
  );
  const playerGroups = Array.isArray(players) ? players : [];
  const pairGroups = Array.isArray(pairs) ? pairs : [];
  const isFootballCategory = selectedCategory?.slug === 'football';
  const isPairView = !isFootballCategory && (query.matchType === 'DOUBLES' || query.matchType === 'MIXED_DOUBLES');
  const currentDetailCategoryId = playerDetail?.category.id ?? query.categoryId;
  const newProfileCategories = activeCategories.filter((category) => category.id !== currentDetailCategoryId);

  const loadContexts = useCallback(async ({ nextQuery, cursor = null, append = false }: { nextQuery: FilterState; cursor?: string | null; append?: boolean }) => {
    if (!nextQuery.categoryId) {
      setPlayers([]);
      setPairs([]);
      setLoading(false);
      setLoadingMore(false);
      setNextCursor(null);
      setHasMore(false);
      return;
    }
    const requestId = ++requestSequence.current;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadingMore(false);
      setNextCursor(null);
      setHasMore(false);
    }
    try {
      if (nextQuery.matchType === 'FOOTBALL') {
        const result = await rankingsApi.getFootballTeamRankings({
          categoryId: nextQuery.categoryId,
          limit: PAGE_LIMIT,
        });
        if (requestId !== requestSequence.current) return;
        setFootballTeams(Array.isArray(result?.data) ? result.data : []);
        setPlayers([]);
        setPairs([]);
        setNextCursor(null);
        setHasMore(false);
        return;
      }
      setFootballTeams([]);
      if (nextQuery.matchType === 'DOUBLES' || nextQuery.matchType === 'MIXED_DOUBLES') {
        const result = await rankingsApi.listAdminPairs({
          limit: PAGE_LIMIT,
          categoryId: nextQuery.categoryId,
          scope: 'PUBLIC',
          search: nextQuery.search || undefined,
          matchType: nextQuery.matchType,
          cursor: cursor || undefined,
        });
        if (requestId !== requestSequence.current) return;
        const page = result?.data;
        const incomingList = Array.isArray(page?.data) ? page.data : [];
        setPairs((current) => append
          ? [...current, ...incomingList.filter((item) => !current.some((existing) => existing.pairId === item.pairId))]
          : incomingList);
        setPlayers([]);
        setNextCursor(page?.meta?.nextCursor ?? null);
        setHasMore(Boolean(page?.meta?.hasMore));
        return;
      }
      const result = await rankingsApi.listAdminPlayers({
        limit: PAGE_LIMIT,
        categoryId: nextQuery.categoryId,
        scope: 'PUBLIC',
        search: nextQuery.search || undefined,
        status: nextQuery.status || undefined,
        matchType: nextQuery.matchType || undefined,
        cursor: cursor || undefined,
      });
      if (requestId !== requestSequence.current) return;
      const page = result?.data;
      const incomingList = Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [];
      setPairs([]);
      setPlayers((current) => {
        const currentList = Array.isArray(current) ? current : [];
        return append
          ? [...currentList, ...incomingList.filter((item) => !currentList.some((existing) => existing?.userId === item?.userId))]
          : incomingList;
      });
      setNextCursor(page?.meta?.nextCursor ?? null);
      setHasMore(Boolean(page?.meta?.hasMore));
    } catch (error: unknown) {
      if (requestId === requestSequence.current) toast.error(getErrorMessage(error, translate('loadFailed')));
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [translate]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void categoriesApi.getCategories().then((result) => {
        if (cancelled) return;
        const rawCategories = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        const active = rawCategories.filter((category) => category?.isActive);
        setCategories(active);
        const initialMatchType = active[0]?.slug === 'football' ? 'FOOTBALL' : 'SINGLES';
        const nextQuery = active[0] ? { ...INITIAL_QUERY, matchType: initialMatchType, categoryId: active[0].id } : INITIAL_QUERY;
        setCategoryId(nextQuery.categoryId);
        setMatchType(nextQuery.matchType);
        setQuery(nextQuery);
        if (active[0]) void loadContexts({ nextQuery });
        else {
          setPlayers([]);
          setLoading(false);
        }
      }).catch((error: unknown) => {
        if (!cancelled) {
          setCategories([]);
          setPlayers([]);
          setLoading(false);
          toast.error(getErrorMessage(error, translate('loadCategoriesFailed')));
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadContexts, translate]);

  const applyFilters = (overrides: Partial<FilterState> = {}) => {
    const nextQuery: FilterState = {
      search: search.trim(),
      status,
      categoryId: categoryId.trim(),
      matchType,
      ...overrides,
    };
    setQuery(nextQuery);
    void loadContexts({ nextQuery });
  };

  const closePlayerDetail = () => {
    playerDetailRequestSequence.current += 1;
    setSelectedPlayer(null);
    setPlayerDetail(null);
    setPlayerDetailLoading(false);
  };

  const openNewContextOperation = (categoryId: string) => {
    if (!playerDetail || !categoryId) return;
    const draft = createAdminContextDraft(playerDetail, categoryId);
    closePlayerDetail();
    setNewContextCategoryId(categoryId);
    setSelected(draft);
    setOperation('ADD');
    setValue('');
    setReason('');
    setExpiresAt('');
    setOperationKey(null);
    setOperationPayloadSignature(null);
  };

  const openNewContextFromSummary = (player: AdminEloPlayerSummary) => {
    const category = activeCategories.find((item) => item.id !== query.categoryId);
    if (!category) return;
    closePlayerDetail();
    setNewContextCategoryId(category.id);
    setSelected(createAdminContextDraftFromSummary(player, category.id));
    setOperation('ADD');
    setValue('');
    setReason('');
    setExpiresAt('');
    setOperationKey(null);
    setOperationPayloadSignature(null);
  };

  const openPlayerDetail = async (player: AdminEloPlayerSummary) => {
    const requestId = ++playerDetailRequestSequence.current;
    setSelectedPlayer(player);
    setPlayerDetail(null);
    setPlayerDetailLoading(true);
    try {
      const result = await rankingsApi.getAdminPlayerDetail(player.userId, query.categoryId);
      if (requestId !== playerDetailRequestSequence.current) return;
      setPlayerDetail(result.data);
    } catch (error: unknown) {
      if (requestId !== playerDetailRequestSequence.current) return;
      toast.error(getErrorMessage(error, translate('loadProfileFailed')));
      closePlayerDetail();
    } finally {
      if (requestId === playerDetailRequestSequence.current) setPlayerDetailLoading(false);
    }
  };

  const openOperation = (context: AdminRankingContext) => {
    closePlayerDetail();
    setNewContextCategoryId('');
    setSelected(context);
    setOperation('ADD');
    setValue('');
    setReason('');
    setExpiresAt('');
    setOperationKey(null);
    setOperationPayloadSignature(null);
  };

  const closeOperation = () => {
    if (processing) return;
    setSelected(null);
    setNewContextCategoryId('');
    setOperationKey(null);
    setOperationPayloadSignature(null);
  };

  const submitOperation = async () => {
    if (!selected || processing) return;
    const numericValue = value.trim() ? Number(value) : undefined;
    if (isRatingOperation(operation) && operation !== 'RESET' && (!numericValue || numericValue <= 0 || !Number.isInteger(numericValue))) {
      toast.error(translate('requiredValue'));
      return;
    }
    if (reason.trim().length < 5) {
      toast.error(translate('requiredReason'));
      return;
    }
    if (operation === 'SUBTRACT' && numericValue !== undefined && numericValue > selected.eloPoints) {
      toast.error(translate('requiredValue'));
      return;
    }
    const payloadDraft = {
      userId: selected.userId,
      categoryId: selected.categoryId,
      scope: 'PUBLIC' as const,
      matchType: selected.matchType,
      ...(selected.genderRestriction ? { genderRestriction: selected.genderRestriction } : {}),
      operation,
      ...(numericValue !== undefined && operation !== 'RESET' && !VISIBILITY_OPERATIONS.includes(operation) ? { requestedValue: numericValue } : {}),
      reason: reason.trim(),
      ...(expiresAt && ['HIDE', 'BAN'].includes(operation) ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    };
    const nextPayloadSignature = JSON.stringify(payloadDraft);
    const stableOperationKey = operationKey && operationPayloadSignature === nextPayloadSignature
      ? operationKey
      : makeOperationKey();
    setOperationKey(stableOperationKey);
    setOperationPayloadSignature(nextPayloadSignature);
    setProcessing(true);
    const payload: AdminEloOperationPayload = {
      operationKey: stableOperationKey,
      ...payloadDraft,
    };
    try {
      await rankingsApi.applyAdminOperation(payload);
      toast.success(translate('operationSuccess'));
      setSelected(null);
      setNewContextCategoryId('');
      setOperationKey(null);
      await loadContexts({ nextQuery: query });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('operationFailed')));
      toast(translate('retryOperation'));
    } finally {
      setProcessing(false);
    }
  };

  const loadHistory = useCallback(async (context: AdminRankingContext, cursor: string | null = null, append = false) => {
    const historyRequestId = append ? historyRequestSequence.current : ++historyRequestSequence.current;
    if (append) setHistoryLoadingMore(true);
    else {
      setHistoryLoading(true);
      setHistoryNextCursor(null);
      setHistoryHasMore(false);
    }
    try {
      const result = await rankingsApi.getAdminHistory(context.contextId, 50, cursor);
      if (historyRequestId !== historyRequestSequence.current) return;
      const page = result.data;
      setHistory((current) => append
        ? [...current, ...page.data.filter((item) => !current.some((existing) => existing.id === item.id))]
        : page.data);
      setHistoryNextCursor(page.meta.nextCursor);
      setHistoryHasMore(page.meta.hasMore);
    } catch (error: unknown) {
      if (historyRequestId !== historyRequestSequence.current) return;
      toast.error(getErrorMessage(error, translate('loadFailed')));
      if (!append) {
        setHistory([]);
        setHistoryNextCursor(null);
        setHistoryHasMore(false);
      }
    } finally {
      if (historyRequestId === historyRequestSequence.current) {
        setHistoryLoading(false);
        setHistoryLoadingMore(false);
      }
    }
  }, [translate]);

  const openHistory = (context: AdminRankingContext) => {
    closePlayerDetail();
    setHistoryContext(context);
    void loadHistory(context);
  };

  if (!canManage) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{translate('forbidden')}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{translate('title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{translate('description')}</p>
      </header>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">{translate('search')}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder={translate('searchPlaceholder')}
              className="h-9.5 w-full rounded-lg border border-slate-300 px-3 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">{translate('category')}</span>
            <select
              value={categoryId}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                const nextCategory = activeCategories.find((c) => c.id === nextCategoryId);
                const nextMatchType = nextCategory?.slug === 'football' ? 'FOOTBALL' : 'SINGLES';
                setCategoryId(nextCategoryId);
                setMatchType(nextMatchType);
                applyFilters({ categoryId: nextCategoryId, matchType: nextMatchType });
              }}
              disabled={activeCategories.length === 0}
              className="h-9.5 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">{translate('selectCategory')}</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">{translate('matchType')}</span>
            <select
              value={matchType}
              onChange={(event) => {
                const nextMatchType = event.target.value;
                setMatchType(nextMatchType);
                applyFilters({ matchType: nextMatchType });
              }}
              className="h-9.5 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {isFootballCategory ? (
                <option value="FOOTBALL">{translate('footballTeam')}</option>
              ) : (
                <>
                  <option value="SINGLES">{translate('singles')}</option>
                  <option value="DOUBLES">{translate('doubles')}</option>
                  <option value="MIXED_DOUBLES">{translate('mixedDoubles')}</option>
                </>
              )}
            </select>
          </div>

          {!isFootballCategory && (
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-600">{translate('status')}</span>
              <select
                value={status}
                onChange={(event) => {
                  const nextStatus = event.target.value as AdminRankingStatus | '';
                  setStatus(nextStatus);
                  applyFilters({ status: nextStatus });
                }}
                className="h-9.5 w-full rounded-lg border border-slate-300 px-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">{translate('allStatuses')}</option>
                <option value="VISIBLE">{translate('visible')}</option>
                <option value="HIDDEN">{translate('hidden')}</option>
                <option value="BANNED">{translate('banned')}</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => applyFilters()}
              disabled={loading || loadingMore || !categoryId}
              className="h-9.5 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
            >
              {translate('search')}
            </Button>
            {!activeCategories.length && (
              <span className="text-xs text-amber-600 font-medium">{translate('noActiveCategories')}</span>
            )}
          </div>
        </div>
      </section>

      {isFootballCategory ? <AdminFootballTable teams={footballTeams} loading={loading} /> : isPairView ? <AdminPairTable pairs={pairGroups} loading={loading} /> : <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">{translate('player')}</th><th className="px-4 py-3">{translate('rankingProfiles')}</th><th className="px-4 py-3">{translate('highestElo')}</th><th className="px-4 py-3">{translate('status')}</th><th className="px-4 py-3">{translate('actions')}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!loading && playerGroups.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{translate('noPlayers')}</td></tr>}
              {!loading && playerGroups.map((player) => (
                <tr key={player.userId} className="align-top">
                  <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100">{player.avatarUrl && <Image src={player.avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />}</div><div><div className="font-semibold text-slate-900">{player.fullName}</div><div className="text-xs text-slate-500">{player.email}</div></div></div></td>
                  <td className="px-4 py-4 text-slate-600"><div className="font-semibold text-slate-900">{player.contextCount} {translate('rankingProfiles')}</div><div className="mt-1 flex flex-wrap gap-1 text-xs"><span className="rounded bg-slate-100 px-2 py-1">{translate('publicScope')}: {player.publicContextCount}</span></div></td>
                  <td className="px-4 py-4"><div className="font-bold text-slate-900">{player.highestElo ?? '—'} {translate('eloUnit')}</div><div className="text-xs text-slate-500">{player.lastUpdatedAt ? new Date(player.lastUpdatedAt).toLocaleString(locale) : '—'}</div></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-1 text-xs"><span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{translate('visible')}: {player.visibleContextCount}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{translate('hidden')}: {player.hiddenContextCount}</span><span className="rounded-full bg-red-100 px-2 py-1 text-red-700">{translate('banned')}: {player.bannedContextCount}</span></div><div className="mt-2 text-xs text-slate-500">{translate('eligibleContexts')}: {player.eligibleContextCount} · {translate('ineligibleContexts')}: {player.ineligibleContextCount}</div></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => openPlayerDetail(player)} disabled={processing}>{translate('managePlayer')}</Button>{activeCategories.some((category) => category.id !== query.categoryId) && <Button type="button" variant="outline" onClick={() => openNewContextFromSummary(player)} disabled={processing}>{translate('addProfileForPlayer')}</Button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {!loading && hasMore && <div className="flex justify-center"><Button type="button" variant="outline" disabled={loadingMore || !nextCursor} onClick={() => void loadContexts({ nextQuery: query, cursor: nextCursor, append: true })}>{loadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{translate(isPairView ? 'loadMorePairs' : 'loadMoreUsers')}</Button></div>}

      <Modal open={selectedPlayer !== null} onOpenChange={(open) => { if (!open) closePlayerDetail(); }}>
        <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <ModalHeader>
            <ModalTitle>{selectedPlayer ? `${selectedPlayer.fullName} · ${translate('profileAndManagement')}` : translate('profileAndManagement')}</ModalTitle>
            <ModalDescription>{selectedPlayer ? `${selectedPlayer.email} · ${selectedCategory?.name ?? translate('selectCategory')}` : ''}</ModalDescription>
          </ModalHeader>
          {selectedPlayer && <div className="space-y-4">
            {playerDetailLoading && <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>}
            {playerDetail && <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{translate('rankingProfiles')}</div><strong className="text-lg text-slate-900">{selectedPlayer.contextCount}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{translate('highestElo')}</div><strong className="text-lg text-slate-900">{selectedPlayer.highestElo ?? '—'} {translate('eloUnit')}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{translate('visible')}</div><strong className="text-lg text-emerald-700">{selectedPlayer.visibleContextCount}</strong></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{translate('excluded')}</div><strong className="text-lg text-red-700">{selectedPlayer.hiddenContextCount + selectedPlayer.bannedContextCount}</strong></div>
            </div>
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{translate('manualEloDoesNotQualify')}</p>
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">{translate('addProfileForAnotherCategoryHint')}</p>
              <select
                aria-label={translate('addProfileForCategory')}
                value=""
                onChange={(event) => openNewContextOperation(event.target.value)}
                disabled={newProfileCategories.length === 0 || processing}
                className="h-9 min-w-48 rounded-lg border border-blue-200 bg-white px-2 text-sm"
              >
                <option value="">{translate('addProfileForCategory')}</option>
                {newProfileCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <p className="text-sm text-slate-600">{translate('selectProfileToManage')}</p>
            <div className="space-y-3">
              {playerDetail.contexts.map((context) => (
                <article key={context.contextId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-semibold text-slate-900">{translate('publicScope')} · {translate(getMatchTypeLabelKey(context.matchType))}</h3><p className="text-xs text-slate-500">{context.genderRestriction || translate('allGenders')}</p></div>
                    <div className="flex flex-wrap justify-end gap-1"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${context.status === 'BANNED' ? 'bg-red-100 text-red-700' : context.status === 'HIDDEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{context.status === 'BANNED' ? translate('banned') : context.status === 'HIDDEN' ? translate('hidden') : translate('visible')}</span><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${context.leaderboardEligible ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{context.leaderboardEligible ? translate('leaderboardEligible') : translate('needsMatch')}</span>{context.adminBootstrapEligible && <span className="inline-flex rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">{translate('adminBootstrapEligible')}</span>}</div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4"><div><span className="block text-xs text-slate-500">{translate('currentElo')}</span><strong>{context.eloPoints} {translate('eloUnit')}</strong></div><div><span className="block text-xs text-slate-500">{translate('peakElo')}</span><strong>{context.peakElo} {translate('eloUnit')}</strong></div><div><span className="block text-xs text-slate-500">{translate('matches')}</span><strong>{context.matchesWon}/{context.matchesPlayed}</strong></div><div><span className="block text-xs text-slate-500">{translate('tier')}</span><strong>{context.tierName || '—'}</strong></div></div><div className="mt-2 text-xs text-slate-500">{translate('updated')}: {new Date(context.updatedAt).toLocaleString(locale)}{context.statusExpiresAt ? ` · ${translate('expiresAt')}: ${new Date(context.statusExpiresAt).toLocaleString(locale)}` : ''}</div>
                  <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => openOperation(toAdminContext(playerDetail, context))} disabled={processing}>{translate('manageElo')}</Button><Button type="button" variant="outline" onClick={() => openHistory(toAdminContext(playerDetail, context))} disabled={historyLoading}><History className="mr-1 h-4 w-4" />{translate('history')}</Button></div>
                </article>
              ))}
            </div>
            {Array.isArray(playerDetail.recentOperations) && playerDetail.recentOperations.length > 0 && <div><h3 className="mb-2 font-semibold text-slate-900">{translate('recentOperations')}</h3><div className="space-y-2">{playerDetail.recentOperations.slice(0, 5).map((item) => <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex justify-between gap-2"><strong>{translate(getOperationLabelKey(item.operation))}</strong><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString(locale)}</time></div><p className="mt-1 text-slate-600">{item.reason}</p></div>)}</div></div>}
            </>}
          </div>}
        </ModalContent>
      </Modal>

      <Modal open={selected !== null} onOpenChange={(open) => { if (!open) closeOperation(); }}>
        <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>{translate('preview')}</ModalTitle>
            <ModalDescription>{selected ? `${selected.fullName} · ${activeCategories.find((category) => category.id === selected.categoryId)?.name ?? translate('selectCategory')} · ${selected.eloPoints} ${translate('eloUnit')}` : ''}</ModalDescription>
          </ModalHeader>
          {selected && <div className="space-y-4">
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{translate(newContextCategoryId ? 'createContextGuide' : 'operationGuide')}</p>
            {newContextCategoryId && <>
              <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('addProfileForCategory')}</span><select value={selected.categoryId} onChange={(event) => { const categoryId = event.target.value; setNewContextCategoryId(categoryId); setSelected((current) => current && current.contextId === '' ? { ...current, categoryId } : current); }} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">{newProfileCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="block text-xs font-semibold text-slate-500">{translate('matchType')}</span><strong className="text-slate-900">{translate('singles')}</strong></div>
            </>}
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('operation')}</span><select value={operation} disabled={Boolean(newContextCategoryId)} onChange={(event) => { setOperation(event.target.value as AdminEloOperation); setExpiresAt(''); }} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="ADD">{translate('add')}</option>{!newContextCategoryId && <><option value="SUBTRACT">{translate('subtract')}</option><option value="SET">{translate('set')}</option><option value="RESET">{translate('reset')}</option><option value="HIDE">{translate('hide')}</option><option value="BAN">{translate('ban')}</option><option value="RESTORE">{translate('restore')}</option></>}</select></label>
            {isRatingOperation(operation) && operation !== 'RESET' && <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate(operation === 'SET' ? 'targetElo' : 'adjustmentPoints')}</span><input type="number" min={1} max={10000} step={1} value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>}
            {['HIDE', 'BAN'].includes(operation) && <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('expiry')}</span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>}
            <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>{translate('currentElo')}</span><strong>{selected.eloPoints}</strong></div><div className="mt-1 flex justify-between"><span>{translate('newElo')}</span><strong>{previewElo(selected, operation, Number(value) || 0)}</strong></div>{['HIDE', 'BAN'].includes(operation) && <p className="mt-2 flex gap-2 text-xs text-amber-800"><ShieldAlert className="h-4 w-4 shrink-0" />{translate('excludeWarning')}</p>}{operation === 'RESET' && <p className="mt-2 text-xs text-amber-800">{translate('resetWarning')}</p>}</div>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('reason')}</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={translate('reasonPlaceholder')} rows={4} maxLength={500} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <ModalFooter><Button type="button" variant="outline" onClick={closeOperation} disabled={processing}>{translate('cancel')}</Button><Button type="button" onClick={() => void submitOperation()} disabled={processing}>{processing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{processing ? translate('processing') : translate('confirm')}</Button></ModalFooter>
          </div>}
        </ModalContent>
      </Modal>

      <Modal open={historyContext !== null} onOpenChange={(open) => { if (!open) setHistoryContext(null); }}>
        <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <ModalHeader>
            <ModalTitle>{translate('historyTitle')}</ModalTitle>
            <ModalDescription>{historyContext ? historyContext.fullName : ''}</ModalDescription>
          </ModalHeader>
          {historyLoading && <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>}
          {!historyLoading && history.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{translate('noHistory')}</p>}
          {!historyLoading && history.length > 0 && <div className="space-y-3">{history.map((item) => <article key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{translate(getOperationLabelKey(item.operation))}</strong><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString(locale)}</time></div><div className="mt-1 text-slate-700">{item.previousElo ?? '—'} → {item.newElo ?? '—'}{item.changedPoints !== null ? ` (${item.changedPoints > 0 ? '+' : ''}${item.changedPoints})` : ''}</div><p className="mt-2 whitespace-pre-wrap text-slate-600">{item.reason}</p></article>)}</div>}
          {historyHasMore && historyContext && <div className="mt-4 flex justify-center"><Button type="button" variant="outline" disabled={historyLoadingMore || !historyNextCursor} onClick={() => void loadHistory(historyContext, historyNextCursor, true)}>{historyLoadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{translate('loadMoreHistory')}</Button></div>}
          <ModalFooter><Button type="button" variant="outline" onClick={() => setHistoryContext(null)}>{translate('close')}</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}


function AdminPairTable({ pairs, loading }: { pairs: AdminEloPairSummary[]; loading: boolean }) {
  const translate = useTranslations('AdminElo');
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
        {translate('pairAdminReadOnlyNotice')}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{translate('pair')}</th>
              <th className="px-4 py-3">{translate('matchType')}</th>
              <th className="px-4 py-3">{translate('rating')}</th>
              <th className="px-4 py-3">{translate('matches')}</th>
              <th className="px-4 py-3">{translate('updated')}</th>
              <th className="px-4 py-3">{translate('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!loading && pairs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{translate('noPairs')}</td></tr>}
            {!loading && pairs.map((pair) => (
              <tr key={pair.pairId} className="align-top">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[pair.user1, pair.user2].map((member) => (
                        <div key={member.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-slate-100">
                          {member.avatarUrl && <Image src={member.avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{pair.user1.fullName || pair.user1.email} / {pair.user2.fullName || pair.user2.email}</div>
                      <div className="text-xs text-slate-500">{pair.categoryName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-700">{translate(getMatchTypeLabelKey(pair.matchType))}</td>
                <td className="px-4 py-4"><div className="font-bold text-slate-900">{pair.eloPoints} {translate('eloUnit')}</div><div className="text-xs text-slate-500">{translate('peakElo')}: {pair.peakElo}</div></td>
                <td className="px-4 py-4 text-slate-700">{pair.matchesWon}/{pair.matchesPlayed}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{new Date(pair.updatedAt).toLocaleString()}</td>
                <td className="px-4 py-4 text-xs font-semibold text-slate-500">{translate('readOnly')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function AdminFootballTable({ teams, loading }: { teams: FootballTeamRanking[]; loading: boolean }) {
  const translate = useTranslations('AdminElo');
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
        {translate('footballAdminReadOnlyNotice')}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{translate('footballTeam')}</th>
              <th className="px-4 py-3">{translate('rating')}</th>
              <th className="px-4 py-3">{translate('matches')}</th>
              <th className="px-4 py-3">{translate('winRate')}</th>
              <th className="px-4 py-3">{translate('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {!loading && teams.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{translate('noFootballTeams')}</td></tr>}
            {!loading && teams.map((team) => (
              <tr key={team.id} className="align-top">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                      {team.logoUrl ? <Image src={team.logoUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{team.teamName.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <span className="font-semibold text-slate-900">{team.teamName}</span>
                  </div>
                </td>
                <td className="px-4 py-4"><div className="font-bold text-slate-900">{team.eloPoints} {translate('eloUnit')}</div><div className="text-xs text-slate-500">{translate('peakElo')}: {team.peakElo ?? team.eloPoints}</div></td>
                <td className="px-4 py-4 text-slate-700">{team.matchesWon}/{team.matchesPlayed}</td>
                <td className="px-4 py-4 text-slate-700">{team.matchesPlayed > 0 ? `${Math.round((team.matchesWon / team.matchesPlayed) * 100)}%` : '—'}</td>
                <td className="px-4 py-4 text-xs font-semibold text-slate-500">{translate('readOnly')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
