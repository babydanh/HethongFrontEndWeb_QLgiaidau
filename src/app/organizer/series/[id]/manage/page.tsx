'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { seriesApi } from '@/features/series/api';
import { tournamentsApi } from '@/features/tournaments/api';
import { Tournament } from '@/features/tournaments/api';
import { TournamentSeries, SeriesLeg, SeriesEvent } from '@/types/series';
import { Button } from '@/components/ui/Button';
import { getSportLogo } from '@/constants/sports';
import { Input } from '@/components/ui/Input';
import { toDateTimeLocalValue } from '@/utils/dateTimeInput';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ArrowLeft, Trophy, Calendar, Plus, Link as LinkIcon, Trash2, 
  Trash, Edit2, Layers, CheckCircle2, ChevronRight, MapPin, X 
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SeriesManagePage() {
  const translate = useTranslations('OrganizerSeriesManage');
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [series, setSeries] = useState<TournamentSeries | null>(null);
  const [legs, setLegs] = useState<SeriesLeg[]>([]);
  const [selectedLegId, setSelectedLegId] = useState<string>('');
  
  // Organizer's tournaments for linking dropdown
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);

  // Page states
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  // Add/Edit Leg Form Modal State
  const [isLegModalOpen, setIsLegModalOpen] = useState(false);
  const [editingLeg, setEditingLeg] = useState<SeriesLeg | null>(null);
  const [legName, setLegName] = useState('');
  const [legOrder, setLegOrder] = useState(1);
  const [legStartDate, setLegStartDate] = useState('');
  const [legEndDate, setLegEndDate] = useState('');
  const [legDirectSlots, setLegDirectSlots] = useState(2);
  const [legWildcardSlots, setLegWildcardSlots] = useState(16);

  // Link Tournament Form State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [targetTournamentId, setTargetTournamentId] = useState('');
  const [eventOrder, setEventOrder] = useState(1);
  const [eventRegion, setEventRegion] = useState('');
  const [eventMultiplier, setEventMultiplier] = useState(1.0);

  const fetchDetail = async () => {
    try {
      const res = await seriesApi.getSeriesDetail(id);
      setSeries(res.series);
      setLegs(res.legs || []);
      if (res.legs && res.legs.length > 0 && !selectedLegId) {
        setSelectedLegId(res.legs[0].id);
      }
    } catch (err: unknown) {
      toast.error(translate('loadError'));
      router.push('/organizer/series');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyTournaments = async () => {
    try {
      const res = await tournamentsApi.getMyTournaments();
      if (res.data) {
        setMyTournaments(res.data);
      }
    } catch (err) {
      console.error('Failed to load tournaments', err);
    }
  };

  useEffect(() => {
    if (!id) return;
    Promise.resolve().then(() => {
      fetchDetail();
      fetchMyTournaments();
    });
  }, [id]);

  const handleOpenLegModal = (leg?: SeriesLeg) => {
    if (leg) {
      setEditingLeg(leg);
      setLegName(leg.name);
      setLegOrder(leg.order);
      setLegStartDate(leg.startDate ? toDateTimeLocalValue(leg.startDate).split('T')[0] : '');
      setLegEndDate(leg.endDate ? toDateTimeLocalValue(leg.endDate).split('T')[0] : '');
      setLegDirectSlots(leg.directEntrySlots);
      setLegWildcardSlots(leg.wildcardSlots);
    } else {
      setEditingLeg(null);
      setLegName(translate('defaultLegName', { count: legs.length + 1 }));
      setLegOrder(legs.length + 1);
      setLegStartDate('');
      setLegEndDate('');
      setLegDirectSlots(2);
      setLegWildcardSlots(16);
    }
    setIsLegModalOpen(true);
  };

  const handleSaveLeg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legName) {
      toast.error(translate('legNameRequired'));
      return;
    }

    try {
      const payload = {
        name: legName,
        order: legOrder,
        startDate: legStartDate || undefined,
        endDate: legEndDate || undefined,
        directEntrySlots: legDirectSlots,
        wildcardSlots: legWildcardSlots,
      };

      if (editingLeg) {
        await seriesApi.updateLeg(id, editingLeg.id, payload);
        toast.success(translate('updateLegSuccess'));
      } else {
        const newLeg = await seriesApi.createLeg(id, payload);
        toast.success(translate('createLegSuccess'));
        setSelectedLegId(newLeg.id);
      }
      setIsLegModalOpen(false);
      fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate('legActionError');
      toast.error(msg);
    }
  };

  const handleDeleteLeg = async (legId: string) => {
    if (!confirm(translate('deleteLegConfirm'))) return;
    try {
      await seriesApi.deleteLeg(id, legId);
      toast.success(translate('deleteLegSuccess'));
      if (selectedLegId === legId) {
        setSelectedLegId('');
      }
      fetchDetail();
    } catch (err: unknown) {
      toast.error(translate('deleteLegError'));
    }
  };

  const handleOpenLinkModal = () => {
    if (legs.length === 0) {
      toast.error(translate('createLegFirst'));
      return;
    }
    
    // Find tournaments already linked in any leg to exclude them
    const linkedTournamentIds = new Set(legs.flatMap(l => l.events || []).map(e => e.tournamentId));
    const available = myTournaments.filter(t => !linkedTournamentIds.has(t.id));
    
    if (available.length === 0) {
      toast.error(translate('noAvailableTournaments'));
      return;
    }

    setTargetTournamentId(available[0].id);
    const selectedLeg = legs.find(l => l.id === selectedLegId);
    setEventOrder((selectedLeg?.events?.length || 0) + 1);
    setEventRegion('');
    setEventMultiplier(1.0);
    setIsLinkModalOpen(true);
  };

  const handleLinkTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTournamentId || !selectedLegId) {
      toast.error(translate('validSelectionRequired'));
      return;
    }

    try {
      setIsLinking(true);
      await seriesApi.linkEvent(id, selectedLegId, {
        tournamentId: targetTournamentId,
        order: eventOrder,
        region: eventRegion || undefined,
        pointMultiplier: eventMultiplier,
      });

      toast.success(translate('linkSuccess'));
      setIsLinkModalOpen(false);
      fetchDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate('linkError');
      toast.error(msg);
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkTournament = async (eventId: string) => {
    if (!confirm(translate('unlinkConfirm'))) return;
    try {
      await seriesApi.unlinkEvent(id, selectedLegId, eventId);
      toast.success(translate('unlinkSuccess'));
      fetchDetail();
    } catch (err: unknown) {
      toast.error(translate('unlinkError'));
    }
  };

  if (isLoading || !series) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">{translate('loadingSeries')}</p>
        </div>
      </div>
    );
  }

  const selectedLeg = legs.find(l => l.id === selectedLegId);
  const linkedTournamentIds = new Set(legs.flatMap(l => l.events || []).map(e => e.tournamentId));
  const availableTournaments = myTournaments.filter(t => !linkedTournamentIds.has(t.id));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation Back */}
        <Link 
          href="/organizer/series"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {translate('backToSeries')}
        </Link>

        {/* Dashboard Header */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-100 tracking-wider">
                {translate('manageSeriesBadge')}
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{series.name}</h1>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Link href={`/series/${series.slug}`} target="_blank" className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center justify-center gap-1.5 font-bold text-xs py-2">
                {translate('viewPlayerPage')} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Legs List (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-4.5 h-4.5 text-blue-500" /> {translate('legsTitle')} ({legs.length})
                </h3>
                <Button 
                  type="button" 
                  onClick={() => handleOpenLegModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> {translate('addLeg')}
                </Button>
              </div>

              {legs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  {translate('noLegs')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {legs.map((leg) => {
                    const isSelected = leg.id === selectedLegId;
                    return (
                      <div 
                        key={leg.id}
                        className={`p-3.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/70 border-blue-300 shadow-sm' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedLegId(leg.id)}
                      >
                        <div className="flex flex-col gap-1 w-[65%]">
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                            #{leg.order}. {leg.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {leg.startDate ? new Date(leg.startDate).toLocaleDateString(locale) : '—'} &rarr; {leg.endDate ? new Date(leg.endDate).toLocaleDateString(locale) : '—'}
                          </span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold border">
                              {translate('directSlots')}: {leg.directEntrySlots}
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold border">
                              {translate('wildcardSlots')}: {leg.wildcardSlots}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLegModal(leg);
                            }}
                            className="p-1.5 hover:bg-blue-100/70 text-slate-400 hover:text-blue-700 rounded-lg transition-colors"
                            title={translate('editLeg')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLeg(leg.id);
                            }}
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-rose-600"
                            title={translate('deleteLeg')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Linked Tournaments in Selected Leg (7 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {selectedLeg ? (
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {translate('linkedTournamentsTitle', { name: selectedLeg.name })}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {translate('scoreDistributionHint')}
                    </p>
                  </div>
                  <Button 
                    type="button"
                    onClick={handleOpenLinkModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> {translate('linkTournament')}
                  </Button>
                </div>

                {selectedLeg.events && selectedLeg.events.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {selectedLeg.events
                      .sort((a, b) => a.order - b.order)
                      .map((event) => {
                        const t = event.tournament;
                        if (!t) return null;
                        return (
                          <div 
                            key={event.id}
                            className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition-all"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  {translate('eventBadge', { order: event.order })}
                                </span>
                                {event.region && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded">
                                    <MapPin className="w-3 h-3 text-slate-400" /> {event.region}
                                  </span>
                                )}
                                {event.pointMultiplier > 1 && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                    {translate('pointsMultiplier', { value: event.pointMultiplier })}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mt-1">
                                {t.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {t.status === 'COMPLETED' ? `✅ ${translate('completedStatus')}` : `⏳ ${translate('notCompletedStatus')}`}
                              </span>
                            </div>

                            <Button
                              type="button"
                              onClick={() => handleUnlinkTournament(event.id)}
                              variant="destructive"
                              size="sm"
                              className="font-bold"
                            >
                              <X className="w-3.5 h-3.5" /> {translate('unlinkTournament')}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
                    <LinkIcon className="w-10 h-10 text-slate-200" />
                    {translate('noLinkedTournaments')}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 text-xs font-semibold">
                {translate('selectLegPrompt')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leg Form Dialog Modal */}
      {isLegModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                {editingLeg ? translate('editLegTitle') : translate('addLegTitle')}
              </h3>
              <button onClick={() => setIsLegModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLeg} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('legName')}</label>
                <Input
                  value={legName}
                  onChange={(e) => setLegName(e.target.value)}
                  placeholder={translate('legNamePlaceholder')}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('legOrder')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={legOrder}
                    onChange={(e) => setLegOrder(Number(e.target.value))}
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('directEntrySlots')}</label>
                  <Input
                    type="number"
                    min={0}
                    value={legDirectSlots}
                    onChange={(e) => setLegDirectSlots(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('startDate')}</label>
                  <Input
                    type="date"
                    value={legStartDate}
                    onChange={(e) => setLegStartDate(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('endDate')}</label>
                  <Input
                    type="date"
                    value={legEndDate}
                    onChange={(e) => setLegEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('psrWildcardSlots')}</label>
                <Input
                  type="number"
                  min={0}
                  value={legWildcardSlots}
                  onChange={(e) => setLegWildcardSlots(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsLegModalOpen(false)} className="text-xs text-slate-600">
                  {translate('cancel')}
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4">
                  {translate('saveLeg')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Tournament Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                {translate('linkTournamentTitle')}
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleLinkTournament} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('chooseTournament')}</label>
                <select
                  value={targetTournamentId}
                  onChange={(e) => setTargetTournamentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition-all cursor-pointer h-[42px]"
                >
                  {availableTournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category?.name || translate('sportFallback')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('eventOrder')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={eventOrder}
                    onChange={(e) => setEventOrder(Number(e.target.value))}
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('eventMultiplier')}</label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={eventMultiplier}
                    onChange={(e) => setEventMultiplier(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{translate('region')}</label>
                <Input
                  value={eventRegion}
                  onChange={(e) => setEventRegion(e.target.value)}
                  placeholder={translate('regionPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsLinkModalOpen(false)} className="text-xs text-slate-600">
                  {translate('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4"
                  isLoading={isLinking}
                >
                  {translate('linkTournamentAction')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
