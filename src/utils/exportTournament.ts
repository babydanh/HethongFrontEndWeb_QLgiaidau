import * as XLSX from 'xlsx';
import type { Match } from '@/types/match';
import type { TournamentParticipant } from '@/types/tournament';

const STATUS_VIETNAMESE: Record<Match['status'], string> = {
  SCHEDULED: 'Sắp đấu',
  ONGOING: 'Đang đấu',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  DISPUTED: 'Cần xử lý',
};

const PARTICIPANT_STATUS_VI: Record<string, string> = {
  REGISTERED: 'Đã đăng ký',
  APPROVED: 'Đã duyệt',
  CONFIRMED: 'Đã xác nhận',
  WAITLISTED: 'Hàng chờ',
  PENDING: 'Chờ duyệt',
  PENDING_PAYMENT: 'Chờ thanh toán',
  REJECTED: 'Bị từ chối',
  WITHDRAWN: 'Đã rút lui',
  CHECKED_IN: 'Đã điểm danh',
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

/**
 * Export danh sách vận động viên / đội thi đấu ra file .xlsx chuẩn
 */
export function exportParticipantsExcel(
  tournamentName: string,
  divisionName: string,
  participants: TournamentParticipant[],
): void {
  const rows = participants.map((p, index) => {
    const member1 = p.members?.[0]?.fullName || p.registeredBy?.fullName || p.teamName || 'VĐV ' + (index + 1);
    const member2 = p.members?.[1]?.fullName || '';
    const status = PARTICIPANT_STATUS_VI[p.teamStatus || ''] || p.teamStatus || 'Đang chờ';
    const paid = p.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán';

    return {
      'STT': index + 1,
      'Tên Đội / VĐV': p.teamName || member1,
      'VĐV 1': member1,
      'VĐV 2 (Nếu Đôi)': member2,
      'Hạng đấu / Bảng': divisionName || 'Chung',
      'Hạt giống / ELO': p.seed != null ? `#${p.seed}` : p.eloPoints ?? '',
      'Trạng thái': status,
      'Thanh toán': paid,
      'Ngày đăng ký': formatVnDateTime(p.registeredAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách VĐV');

  const cleanName = `${tournamentName}_${divisionName}`.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
  const fileName = `DanhSachVDV_${cleanName}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Tải file mẫu danh sách VĐV đăng ký (.xlsx)
 */
export function downloadParticipantsTemplateExcel(): void {
  const sampleRows = [
    {
      'STT': 1,
      'Họ và tên VĐV 1': 'Nguyễn Văn A',
      'Số điện thoại 1': '0901234567',
      'Họ và tên VĐV 2': 'Trần Văn B',
      'Số điện thoại 2': '0907654321',
      'Tên Đội (Tùy chọn)': 'CLB Pickleball Saigon',
      'Nội dung đăng ký': 'Đôi Nam 6.5',
      'Điểm ELO (nếu có)': 1250,
      'Ghi chú': 'Đã chuyển khoản cọc',
    },
    {
      'STT': 2,
      'Họ và tên VĐV 1': 'Lê Thị C',
      'Số điện thoại 1': '0912345678',
      'Họ và tên VĐV 2': 'Phạm Hoàng D',
      'Số điện thoại 2': '0918765432',
      'Tên Đội (Tùy chọn)': 'Hà Nội Pickleball Team',
      'Nội dung đăng ký': 'Đôi Nam Nữ',
      'Điểm ELO (nếu có)': 1100,
      'Ghi chú': '',
    },
    {
      'STT': 3,
      'Họ và tên VĐV 1': 'Đỗ Hữu E',
      'Số điện thoại 1': '0933445566',
      'Họ và tên VĐV 2': '',
      'Số điện thoại 2': '',
      'Tên Đội (Tùy chọn)': '',
      'Nội dung đăng ký': 'Đơn Nam',
      'Điểm ELO (nếu có)': 1300,
      'Ghi chú': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Dang_Ky');
  XLSX.writeFile(wb, 'Mau_Danh_Sach_VDV_Dang_Ky.xlsx');
}

export interface ParsedExcelResult {
  headers: string[];
  rows: Record<string, any>[];
  detectedMapping: {
    teamNameCol?: string;
    player1NameCol?: string;
    player1PhoneCol?: string;
    player2NameCol?: string;
    player2PhoneCol?: string;
    formatCol?: string;
    eloCol?: string;
  };
}

/**
 * Đọc file Excel / CSV tải lên và tự động đối soát nhận diện các cột
 */
export async function parseParticipantsExcel(file: File): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rawJson.length === 0) {
    return { headers: [], rows: [], detectedMapping: {} };
  }

  const headers = Object.keys(rawJson[0]);

  // Heuristic matching for columns
  const findCol = (keywords: string[]) => {
    return headers.find((h) => {
      const lower = h.toLowerCase().trim();
      return keywords.some((kw) => lower.includes(kw));
    });
  };

  const player1NameCol = findCol(['vđv 1', 'vdv 1', 'họ và tên', 'họ tên', 'người chơi 1', 'vận động viên 1', 'tên 1', 'player 1', 'full name', 'tên']);
  const player1PhoneCol = findCol(['sđt 1', 'sdt 1', 'điện thoại 1', 'phone 1', 'sđt', 'sdt', 'điện thoại', 'phone', 'mobile']);
  const player2NameCol = findCol(['vđv 2', 'vdv 2', 'đồng đội', 'họ tên vđv 2', 'người chơi 2', 'vận động viên 2', 'tên 2', 'player 2', 'partner']);
  const player2PhoneCol = findCol(['sđt 2', 'sdt 2', 'điện thoại 2', 'phone 2']);
  const teamNameCol = findCol(['tên đội', 'team', 'cặp đôi', 'tên cặp', 'clb', 'club']);
  const formatCol = findCol(['nội dung', 'hạng đấu', 'hạng mục', 'division', 'category', 'thể thức']);
  const eloCol = findCol(['elo', 'trình', 'điểm', 'rating', 'level', 'rank']);

  return {
    headers,
    rows: rawJson,
    detectedMapping: {
      teamNameCol,
      player1NameCol,
      player1PhoneCol,
      player2NameCol,
      player2PhoneCol,
      formatCol,
      eloCol,
    },
  };
}
