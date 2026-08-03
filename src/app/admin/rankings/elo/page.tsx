'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  rankingsApi,
  type AdminEloOperation,
  type AdminEloOperationHistoryItem,
  type AdminEloOperationPayload,
  type AdminRankingContext,
  type AdminRankingScope,
  type AdminRankingStatus,
} from '@/features/rankings/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';

const PAGE_LIMIT = 30;

type FilterState = {
  scope: AdminRankingScope;
  search: string;
  status: AdminRankingStatus | '';
  communityId: string;
  categoryId: string;
  matchType: string;
  minElo: string;
  maxElo: string;
};

const INITIAL_QUERY: FilterState = {
  scope: 'PUBLIC',
  search: '',
  status: '',
  communityId: '',
  categoryId: '',
  matchType: '',
  minElo: '',
  maxElo: '',
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

export default function AdminEloPage() {
  const translate = useTranslations('AdminElo');
  const locale = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const [contexts, setContexts] = useState<AdminRankingContext[]>([]);
  const [query, setQuery] = useState<FilterState>(INITIAL_QUERY);
  const [scope, setScope] = useState<AdminRankingScope>(INITIAL_QUERY.scope);
  const [search, setSearch] = useState(INITIAL_QUERY.search);
  const [status, setStatus] = useState<AdminRankingStatus | ''>(INITIAL_QUERY.status);
  const [communityId, setCommunityId] = useState(INITIAL_QUERY.communityId);
  const [categoryId, setCategoryId] = useState(INITIAL_QUERY.categoryId);
  const [matchType, setMatchType] = useState(INITIAL_QUERY.matchType);
  const [minElo, setMinElo] = useState(INITIAL_QUERY.minElo);
  const [maxElo, setMaxElo] = useState(INITIAL_QUERY.maxElo);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<AdminRankingContext | null>(null);
  const [operation, setOperation] = useState<AdminEloOperation>('ADD');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [operationKey, setOperationKey] = useState<string | null>(null);
  const [historyContext, setHistoryContext] = useState<AdminRankingContext | null>(null);
  const [history, setHistory] = useState<AdminEloOperationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const requestSequence = useRef(0);
  const canManage = currentUser?.roles?.includes('ADMIN') === true;

  const loadContexts = useCallback(async ({ nextQuery, cursor = null, append = false }: { nextQuery: FilterState; cursor?: string | null; append?: boolean }) => {
    const requestId = ++requestSequence.current;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadingMore(false);
      setNextCursor(null);
      setHasMore(false);
    }
    try {
      const result = await rankingsApi.listAdminContexts({
        limit: PAGE_LIMIT,
        scope: nextQuery.scope,
        search: nextQuery.search || undefined,
        status: nextQuery.status || undefined,
        communityId: nextQuery.communityId.trim() || undefined,
        categoryId: nextQuery.categoryId.trim() || undefined,
        matchType: nextQuery.matchType || undefined,
        minElo: nextQuery.minElo.trim() ? Number(nextQuery.minElo) : undefined,
        maxElo: nextQuery.maxElo.trim() ? Number(nextQuery.maxElo) : undefined,
        cursor: cursor || undefined,
      });
      if (requestId !== requestSequence.current) return;
      const page = result.data;
      setContexts((current) => append
        ? [...current, ...page.data.filter((item) => !current.some((existing) => existing.contextId === item.contextId))]
        : page.data);
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
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
    const timer = window.setTimeout(() => {
      void loadContexts({ nextQuery: INITIAL_QUERY });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContexts]);

  const applyFilters = () => {
    const nextQuery: FilterState = {
      scope,
      search: search.trim(),
      status,
      communityId: communityId.trim(),
      categoryId: categoryId.trim(),
      matchType,
      minElo: minElo.trim(),
      maxElo: maxElo.trim(),
    };
    setQuery(nextQuery);
    void loadContexts({ nextQuery });
  };

  const openOperation = (context: AdminRankingContext) => {
    setSelected(context);
    setOperation('ADD');
    setValue('');
    setReason('');
    setExpiresAt('');
    setOperationKey(makeOperationKey());
  };

  const closeOperation = () => {
    if (processing) return;
    setSelected(null);
    setOperationKey(null);
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
    const stableOperationKey = operationKey ?? makeOperationKey();
    setOperationKey(stableOperationKey);
    setProcessing(true);
    const payload: AdminEloOperationPayload = {
      operationKey: stableOperationKey,
      userId: selected.userId,
      categoryId: selected.categoryId,
      scope: selected.scope,
      ...(selected.communityId ? { communityId: selected.communityId } : {}),
      matchType: selected.matchType,
      ...(selected.genderRestriction ? { genderRestriction: selected.genderRestriction } : {}),
      operation,
      ...(numericValue !== undefined && operation !== 'RESET' && !VISIBILITY_OPERATIONS.includes(operation) ? { requestedValue: numericValue } : {}),
      reason: reason.trim(),
      ...(expiresAt && ['HIDE', 'BAN'].includes(operation) ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    };
    try {
      await rankingsApi.applyAdminOperation(payload);
      toast.success(translate('operationSuccess'));
      setSelected(null);
      setOperationKey(null);
      await loadContexts({ nextQuery: query });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('operationFailed')));
      toast(translate('retryOperation'));
    } finally {
      setProcessing(false);
    }
  };

  const openHistory = async (context: AdminRankingContext) => {
    setHistoryContext(context);
    setHistoryLoading(true);
    try {
      const result = await rankingsApi.getAdminHistory(context.contextId);
      setHistory(result.data.data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('loadFailed')));
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
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

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="md:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={translate('searchPlaceholder')} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('scope')}</span><select value={scope} onChange={(event) => setScope(event.target.value as AdminRankingScope)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="PUBLIC">{translate('publicScope')}</option><option value="COMMUNITY">{translate('communityScope')}</option></select></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('status')}</span><select value={status} onChange={(event) => setStatus(event.target.value as AdminRankingStatus | '')} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="">{translate('allStatuses')}</option><option value="VISIBLE">{translate('visible')}</option><option value="HIDDEN">{translate('hidden')}</option><option value="BANNED">{translate('banned')}</option></select></label>
        {scope === 'COMMUNITY' && <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('communityId')}</span><input value={communityId} onChange={(event) => setCommunityId(event.target.value)} placeholder={translate('communityIdPlaceholder')} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>}
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('categoryId')}</span><input value={categoryId} onChange={(event) => setCategoryId(event.target.value)} placeholder={translate('categoryIdPlaceholder')} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('matchType')}</span><select value={matchType} onChange={(event) => setMatchType(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="">{translate('allMatchTypes')}</option><option value="SINGLES">{translate('singles')}</option><option value="DOUBLES">{translate('doubles')}</option><option value="MIXED_DOUBLES">{translate('mixedDoubles')}</option></select></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('minElo')}</span><input type="number" min={0} step={1} value={minElo} onChange={(event) => setMinElo(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('maxElo')}</span><input type="number" min={0} step={1} value={maxElo} onChange={(event) => setMaxElo(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
        <div className="flex items-end md:col-span-4"><Button type="button" onClick={applyFilters} disabled={loading || loadingMore}>{translate('search')}</Button></div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">{translate('player')}</th><th className="px-4 py-3">{translate('context')}</th><th className="px-4 py-3">{translate('rating')}</th><th className="px-4 py-3">{translate('matches')}</th><th className="px-4 py-3">{translate('status')}</th><th className="px-4 py-3">{translate('actions')}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!loading && contexts.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{translate('noContexts')}</td></tr>}
              {!loading && contexts.map((context) => (
                <tr key={context.contextId} className="align-top">
                  <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100">{context.avatarUrl && <Image src={context.avatarUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />}</div><div><div className="font-semibold text-slate-900">{context.fullName}</div><div className="text-xs text-slate-500">{context.email}</div></div></div></td>
                  <td className="px-4 py-4 text-slate-600"><div>{context.scope === 'PUBLIC' ? translate('publicScope') : translate('communityScope')}</div><div className="text-xs">{translate(getMatchTypeLabelKey(context.matchType))}{context.genderRestriction ? ` · ${context.genderRestriction}` : ''}</div></td>
                  <td className="px-4 py-4"><div className="font-bold text-slate-900">{context.eloPoints}</div><div className="text-xs text-slate-500">{context.matchesWon}/{context.matchesPlayed}</div></td>
                  <td className="px-4 py-4 text-slate-600">{context.matchesPlayed}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${context.status === 'BANNED' ? 'bg-red-100 text-red-700' : context.status === 'HIDDEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{context.status === 'BANNED' ? translate('banned') : context.status === 'HIDDEN' ? translate('hidden') : translate('visible')}</span></td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => openOperation(context)} disabled={processing || loading}>{translate('manage')}</Button><Button type="button" variant="outline" onClick={() => void openHistory(context)} disabled={historyLoading}><History className="mr-1 h-4 w-4" />{translate('history')}</Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && hasMore && <div className="flex justify-center"><Button type="button" variant="outline" disabled={loadingMore || !nextCursor} onClick={() => void loadContexts({ nextQuery: query, cursor: nextCursor, append: true })}>{loadingMore && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{translate('loadMoreUsers')}</Button></div>}

      <Modal open={selected !== null} onOpenChange={(open) => { if (!open) closeOperation(); }}>
        <ModalContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>{translate('preview')}</ModalTitle>
            <ModalDescription>{selected ? `${selected.fullName} · ${selected.eloPoints} ${translate('eloUnit')}` : ''}</ModalDescription>
          </ModalHeader>
          {selected && <div className="space-y-4">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('operation')}</span><select value={operation} onChange={(event) => { setOperation(event.target.value as AdminEloOperation); setExpiresAt(''); }} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="ADD">{translate('add')}</option><option value="SUBTRACT">{translate('subtract')}</option><option value="SET">{translate('set')}</option><option value="RESET">{translate('reset')}</option><option value="HIDE">{translate('hide')}</option><option value="BAN">{translate('ban')}</option><option value="RESTORE">{translate('restore')}</option></select></label>
            {isRatingOperation(operation) && operation !== 'RESET' && <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{translate('value')}</span><input type="number" min={1} max={10000} step={1} value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>}
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
          <ModalFooter><Button type="button" variant="outline" onClick={() => setHistoryContext(null)}>{translate('close')}</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
