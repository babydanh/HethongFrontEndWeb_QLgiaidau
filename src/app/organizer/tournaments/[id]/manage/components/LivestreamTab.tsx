'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Copy, Loader2, Play, Radio, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { livestreamApi, type CreatedLivestreamCamera, type LivestreamCamera } from '@/features/tournaments/api';
import type { BracketMatch, BracketStage, Tournament } from '@/types/tournament';
import { getErrorMessage } from '@/utils/error';

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

  const loadCameras = async () => {
    setIsLoading(true);
    try {
      const response = await livestreamApi.getCameras(tournament.id);
      setCameras(response.data ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCameras();
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
      await loadCameras();
      toast.success('Đã tạo camera livestream');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCamera = async (cameraId: string) => {
    try {
      await livestreamApi.deleteCamera(cameraId);
      await loadCameras();
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
      await loadCameras();
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
      toast.success('Đã đánh dấu stream đã dừng');
      await loadCameras();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActiveMatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Trực tiếp</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              BTC tạo camera và gán camera vào trận. Trọng tài chỉ được start/dừng stream nếu đã được phân công đúng trận đó và trận đã có camera.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Thêm camera PUSH</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500">Tên camera</label>
              <input
                value={cameraName}
                onChange={(event) => setCameraName(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="Ví dụ: Camera sân 1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Giao thức</label>
              <select
                value={protocol}
                onChange={(event) => setProtocol(event.target.value as 'RTMP' | 'SRT')}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Link publish vừa tạo</p>
              <p className="mt-2 break-all text-xs font-semibold text-blue-900">{lastPublish.url}</p>
              <Button variant="outline" className="mt-3 border-blue-200 text-blue-700" onClick={() => void copyText(lastPublish.url, 'link publish')}>
                <Copy className="mr-2 h-4 w-4" />
                Sao chép
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Camera của giải</h3>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          </div>
          <div className="mt-4 space-y-3">
            {cameras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                Chưa có camera. Tạo camera trước rồi gán vào trận.
              </div>
            ) : (
              cameras.map((camera) => (
                <div key={camera.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{camera.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {camera.protocol} • {statusLabel[camera.status] ?? camera.status}
                      </p>
                      {camera.playbackUrl ? (
                        <p className="mt-2 break-all text-xs font-medium text-slate-500">{camera.playbackUrl}</p>
                      ) : null}
                    </div>
                    <Button variant="outline" className="border-rose-200 text-rose-600" onClick={() => void handleDeleteCamera(camera.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Gán camera vào trận</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr_auto]">
          <select
            value={selectedMatchId}
            onChange={(event) => setSelectedMatchId(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Chọn trận</option>
            {readyMatches.map((match) => (
              <option key={match.id} value={match.id}>
                Vòng {match.roundNumber} • Trận {match.matchOrder} • {match.participant1?.teamName || 'Đội 1'} vs {match.participant2?.teamName || 'Đội 2'}
              </option>
            ))}
          </select>
          <select
            value={selectedCameraId}
            onChange={(event) => setSelectedCameraId(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Chọn camera</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.name} • {camera.protocol}
              </option>
            ))}
          </select>
          <Button onClick={() => void handleAssignCamera()} disabled={!selectedMatchId || !selectedCameraId || activeMatchId === selectedMatchId} className="bg-blue-600 text-white hover:bg-blue-700">
            Gán camera
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {readyMatches.slice(0, 12).map((match) => (
            <div key={match.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Vòng {match.roundNumber} • Trận {match.matchOrder}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {match.participant1?.teamName || 'Đội 1'} vs {match.participant2?.teamName || 'Đội 2'} • Trọng tài: {match.refereeId ? 'đã phân công' : 'chưa phân công'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-emerald-200 text-emerald-700" onClick={() => void handleStart(match.id)} disabled={activeMatchId === match.id}>
                  {activeMatchId === match.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Start
                </Button>
                <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => void handleStop(match.id)} disabled={activeMatchId === match.id}>
                  Dừng
                </Button>
                <Button variant="outline" className="border-blue-200 text-blue-700" onClick={() => window.open(`/live/${match.id}`, '_blank')}>
                  <Video className="mr-2 h-4 w-4" />
                  Xem live
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
