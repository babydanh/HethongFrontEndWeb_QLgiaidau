'use client';

import { FormEvent, use, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clubMatchSessionsApi } from '@/features/club-match-sessions/api';
import { getErrorMessage } from '@/utils/error';

export default function CreateClubMatchSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('ClubMatchSession');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [registrationMode, setRegistrationMode] = useState<'SELF' | 'MANAGER_ASSIGN' | 'MIXED'>('MIXED');
  const [isRanked, setIsRanked] = useState(true);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
      toast.error(t('invalidDateRange'));
      return;
    }
    setSubmitting(true);
    try {
      const response = await clubMatchSessionsApi.create({
        communityId: id,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        registrationMode,
        isRanked,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      });
      toast.success(t('created'));
      router.replace(`/communities/${id}/match-sessions/${response.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">{t('createTitle')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('createDescription')}</p>
        </div>
        <label className="block space-y-2"><span className="text-sm font-semibold">{t('name')}</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('namePlaceholder')} /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">{t('description')}</span><textarea className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">{t('registrationMode')}</span><select className="h-10 w-full rounded-lg border border-slate-300 px-3" value={registrationMode} onChange={(event) => setRegistrationMode(event.target.value as typeof registrationMode)}><option value="MIXED">{t('registrationMixed')}</option><option value="SELF">{t('registrationSelf')}</option><option value="MANAGER_ASSIGN">{t('registrationManager')}</option></select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-semibold">{t('startAt')}</span><Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label><label className="space-y-2"><span className="text-sm font-semibold">{t('endAt')}</span><Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label></div>
        <label className="flex items-center gap-3"><input type="checkbox" checked={isRanked} onChange={(event) => setIsRanked(event.target.checked)} /><span className="text-sm font-semibold">{t('ranked')}</span></label>
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{t('noBracketHint')}</p>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>{t('cancel')}</Button><Button type="submit" isLoading={submitting}>{t('create')}</Button></div>
      </form>
    </main>
  );
}
