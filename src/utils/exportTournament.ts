import * as XLSX from 'xlsx';
import type { Match } from '@/types/match';

const STATUS_VIETNAMESE: Record<Match['status'], string> = {
  SCHEDULED: 'Sắp đấu',
  ONGOING: 'Đang đấu',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  DISPUTED: 'Cần xử lý',
};

function formatVnDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function teamName(match: Match, key: 'participant1' | 'participant2'): string {
  return match[key]?.teamName ?? 'Chờ xác định';
}

/**
 * Export tổng kết kết quả toàn giải ra file .xlsx — giống app
 * (App: ExcelExportService.exportTournamentData)
 */
export function exportTournamentResultsExcel(
  tournamentName: string,
  matches: Match[],
): void {
  const sorted = [...matches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.matchOrder - b.matchOrder,
  );

  const rows: Record<string, string | number>[] = sorted.map((match) => {
    const winnerId = match.winnerId;
    const winnerName =
      winnerId == null
        ? ''
        : winnerId === match.participant1Id
          ? teamName(match, 'participant1')
          : winnerId === match.participant2Id
            ? teamName(match, 'participant2')
            : '';

    return {
      'Vòng': match.roundNumber,
      'Trận số': match.matchOrder,
      'Đội 1': teamName(match, 'participant1'),
      'Điểm 1': match.p1SetsWon,
      'Điểm 2': match.p2SetsWon,
      'Đội 2': teamName(match, 'participant2'),
      'Đội thắng': winnerName,
      'Trạng thái': STATUS_VIETNAMESE[match.status] ?? match.status,
      'Thời gian kết thúc': formatVnDateTime(match.completedAt),
      'Trọng tài': match.refereeName ?? '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      'Vòng',
      'Trận số',
      'Đội 1',
      'Điểm 1',
      'Điểm 2',
      'Đội 2',
      'Đội thắng',
      'Trạng thái',
      'Thời gian kết thúc',
      'Trọng tài',
    ],
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kết quả toàn giải');

  const fileName = `KetQua_${tournamentName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}