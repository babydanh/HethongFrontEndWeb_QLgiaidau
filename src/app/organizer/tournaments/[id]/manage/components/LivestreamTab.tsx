'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Copy, Loader2, Play, Radio, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { livestreamApi, type CreatedLivestreamCamera, type LivestreamCamera, type MatchLivestream } from '@/features/tournaments/api';
import type { BracketMatch, BracketStage, Tournament } from '@/types/tournament';
import { getErrorMessage } from '@/utils/error';
import { getMatchRoundLabel } from '@/utils/match-round-label';

interface LivestreamTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
}

const statusLabel: Record<LivestreamCamera['status'], string> = {
  IDLE: 'Sẵn sàng',
  WAITING: 'Chờ tín hiệu',
  LIVE: 'Đang live',
  OFFLINE: 'Offline',
  ERROR: 'Lỗi',
};

const flattenMatches = (bracket: { stages: BracketStage[] } | null): BracketMatch[] => {
  if (!bracket?.stages) {
    return [];
  }

  return bracket.stages.flatMap((stage) =>
    stage.groups.flatMap((group) =>
      group.matches.map((match) => ({
        ...match,
        groupName: group.name,
        stageName: stage.name,
      })),
    ),
  );
};

export function LivestreamTab({ tournament, bracket }: LivestreamTabProps) {
  const [cameras, setCameras] = useState<LivestreamCamera[]>([]);
  const [matchStreams, setMatchStreams] = useState<Record<string, MatchLivestream>>({});
  const [cameraName, setCameraName] = useState('');
  const [protocol, setProtocol] = useState<'RTMP' | 'SRT'>('RTMP');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [lastPublish, setLastPublish] = useState<CreatedLivestreamCamera['publish'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const matches = useMemo(() => flattenMatches(bracket), [bracket]);
  const readyMatches = matches.filter((match) => !match.isBye && match.participant1Id && match.participant2Id);
  const getCameraMatchLabel = (match: BracketMatch) => getMatchRoundLabel({
    match,
    matches,
    tournamentFormat: tournament.format,
  });

  const loadLivestreamData = async () => {
    try {
      const [cameraResponse, streamResponse] = await Promise.all([
        livestreamApi.getCameras(tournament.id),
        livestreamApi.getMatchLivestreams(tournament.id),
      ]);
      const activeCameras = cameraResponse.data ?? [];
      setCameras(activeCameras);
      setSelectedCameraId((current) =>
        current && activeCameras.some((camera) => camera.id === current) ? current : '',
      );
      setMatchStreams(Object.fromEntries((streamResponse.data ?? []).map((stream) => [stream.matchId, stream])));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void loadLivestreamData();
    return () => {
      active = false;
    };
  }, [tournament.id]);

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã sao chép ${label}`);
  };

  const handleCreateCamera = async () => {
    if (!cameraName.trim()) {
      toast.error('Nhập tên camera trước');
      return;
    }

    setIsCreating(true);
    try {
      const response = await livestreamApi.createCamera(tournament.id, {
        name: cameraName.trim(),
        protocol,
      });
      if (response.data) {
        setLastPublish(response.data.publish);
      }
      setCameraName('');
      await loadLivestreamData();
      toast.success('Đã tạo camera livestream');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    try {
      if (selectedCameraId === cameraId) {
        setSelectedCameraId('');
      }
      await livestreamApi.deleteCamera(cameraId);
      await loadLivestreamData();
      toast.success('Đã xóa camera');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAssignCamera = async () => {
    if (!selectedMatchId || !selectedCameraId) {
      toast.error('Chọn trận và camera trước');
      return;
    }

    setActiveMatchId(selectedMatchId);
    try {
      await livestreamApi.assignCamera(selectedMatchId, selectedCameraId);
      await loadLivestreamData();
      toast.success('Đã gán camera cho trận');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchId(null);
    }
  };

  const handleStart = async (matchId: string) => {
    setActiveMatchId(matchId);
    try {
      const response = await livestreamApi.startMatchStream(matchId);
      if (response.data?.publish) {
        await copyText(response.data.publish.url, 'link publish');
      }
      toast.success('Đã tạo link start stream cho trận');
      await loadLivestreamData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchId(null);
    }
  };

  const handleStop = async (matchId: string) => {
    setActiveMatchId(matchId);
    try {
      await livestreamApi.stopMatchStream(matchId);
      toast.success('Đã tắt phát trực tiếp. Bạn có thể bật lại bất cứ lúc nào.');
      await loadLivestreamData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Trực tiếp</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              BTC tạo camera và gán camera vào trận. Trọng tài chỉ được start/dừng stream nếu đã được phân công đúng trận đó và trận đã có camera.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Thêm camera PUSH</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500">Tên camera</label>
              <input
                value={cameraName}
                onChange={(event) => setCameraName(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                placeholder="Ví dụ: Camera sân 1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Giao thức</label>
              <select
                value={protocol}
                onChange={(event) => setProtocol(event.target.value as 'RTMP' | 'SRT')}
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="RTMP">RTMP - OBS/Larix dễ dùng</option>
                <option value="SRT">SRT - ổn định hơn nếu app hỗ trợ</option>
              </select>
            </div>
            <Button onClick={() => void handleCreateCamera()} disabled={isCreating} className="w-full bg-blue-600 text-white hover:bg-blue-700">
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Tạo camera
            </Button>
          </div>

          {lastPublish ? (
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Link publish vừa tạo</p>
              <p className="mt-2 break-all text-xs font-semibold text-blue-900">{lastPublish.url}</p>
              <Button variant="outline" className="mt-3" onClick={() => void copyText(lastPublish.url, 'link publish')}>
                <Copy className="mr-2 h-4 w-4" />
                Sao chép
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Camera của giải</h3>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>
          <div className="mt-4 space-y-3">
            {cameras.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                Chưa có camera. Tạo camera trước rồi gán vào trận.
              </div>
            ) : (
              cameras.map((camera) => {
                const serverUrl = camera.protocol === 'SRT' 
                  ? 'srt://sporto.asia:8890' 
                  : 'rtmp://sporto.asia:1935/live';
                const streamKey = camera.streamName || camera.id;

                return (
                  <div key={camera.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{camera.name}</p>
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-blue-100 text-blue-700 uppercase">
                            {camera.protocol}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 text-slate-700">
                            {statusLabel[camera.status] ?? camera.status}
                          </span>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => void handleDeleteCamera(camera.id)} title="Xóa camera">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Server URL & Stream Key Info */}
                    <div className="space-y-2 pt-1.5 border-t border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 shrink-0">Server URL:</span>
                        <span className="font-mono text-xs md:text-sm font-bold text-slate-900 select-all truncate">{serverUrl}</span>
                        <button 
                          onClick={() => void copyText(serverUrl, 'Server URL')}
                          title="Sao chép Server URL"
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors shrink-0 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 shrink-0">Stream Key:</span>
                        <span className="font-mono text-xs md:text-sm font-bold text-slate-900 select-all truncate">{streamKey}</span>
                        <button 
                          onClick={() => void copyText(streamKey, 'Stream Key')}
                          title="Sao chép Stream Key"
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors shrink-0 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      {camera.playbackUrl && (
                        <div className="pt-1">
                          <span className="text-[11px] font-bold text-slate-500 block mb-1">Stream Playback HLS URL:</span>
                          <p className="break-all font-mono text-xs font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 select-all">{camera.playbackUrl}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Gán camera vào trận</h3>
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedMatchId}
            onChange={(event) => setSelectedMatchId(event.target.value)}
            className="h-11 flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
          >
            <option value="">Chọn trận</option>
            {readyMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {getCameraMatchLabel(match)} • Trận {match.matchOrder} • {match.participant1?.teamName || 'Đội 1'} vs {match.participant2?.teamName || 'Đội 2'}
              </option>
            ))}
          </select>

          <select
            value={selectedCameraId}
            onChange={(event) => setSelectedCameraId(event.target.value)}
            className="h-11 flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
          >
            <option value="">Chọn camera</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.name} • {camera.protocol}
              </option>
            ))}
          </select>

          <Button 
            onClick={() => void handleAssignCamera()} 
            disabled={!selectedMatchId || !selectedCameraId || activeMatchId === selectedMatchId} 
            className="h-11 px-6 bg-blue-600 text-white hover:bg-blue-700 font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Gán camera
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {readyMatches.slice(0, 12).map((match) => (
            (() => {
              const stream = matchStreams[match.id];
              // A match is assigned only when the API can resolve a live
              // camera record. This prevents stale soft-deleted ids from
              // keeping old controls visible.
              const hasCamera = Boolean(stream?.cameraId && stream.cameraName);
              const isLive = stream?.streamStatus === 'LIVE';
              const isBusy = activeMatchId === match.id;

              return (
            <div key={match.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {getCameraMatchLabel(match)} • Trận {match.matchOrder}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {match.participant1?.teamName || 'Đội 1'} vs {match.participant2?.teamName || 'Đội 2'} • Trọng tài: {match.refereeId ? 'đã phân công' : 'chưa phân công'}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {isLive ? 'Livestream đang phát' : hasCamera ? `Đã gán camera${stream?.cameraName ? `: ${stream.cameraName}` : ''}` : 'Chưa gán camera'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className={isLive ? 'border-rose-200 text-rose-700 font-bold hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-50'}
                  onClick={() => {
                    if (!hasCamera) {
                      setSelectedMatchId(match.id);
                      toast('Hãy chọn camera ở mục “Gán camera vào trận” trước.');
                    } else if (isLive) {
                      void handleStop(match.id);
                    } else {
                      void handleStart(match.id);
                    }
                  }}
                  disabled={isBusy}
                >
                  {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  {isLive ? 'Dừng phát' : hasCamera ? 'Bật phát' : 'Gán camera'}
                </Button>
                <Button variant="outline" className="font-bold border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => window.open(`/live/${match.id}`, '_blank')}>
                  <Video className="mr-2 h-4 w-4" />
                  Xem live
                </Button>
              </div>
            </div>
              );
            })()
          ))}
        </div>
      </section>
    </div>
  );
}
