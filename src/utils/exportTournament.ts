import * as XLSX from 'xlsx';
import type { Match } from '@/types/match';
import type { TournamentParticipant } from '@/types/tournament';

type ExportLocale = 'en' | 'vi';

type ExportCopy = {
  status: Record<string, string>;
  participantStatus: Record<string, string>;
  waiting: string;
  player: string;
  resultsSheet: string;
  resultsFilePrefix: string;
  participantsSheet: string;
  participantsFilePrefix: string;
  templateFileName: string;
  templateSheet: string;
  resultsHeaders: string[];
  participantHeaders: string[];
  templateRows: Record<string, string | number>[];
  dateTime: (value: string | null | undefined) => string;
};

const pad = (n: number) => String(n).padStart(2, '0');

function formatExportDateTime(value: string | null | undefined, locale: ExportLocale): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

const EXPORT_COPY: Record<ExportLocale, Omit<ExportCopy, 'dateTime'>> = {
  en: {
    status: {
      SCHEDULED: 'Scheduled',
      ONGOING: 'Live',
      COMPLETED: 'Completed',
      CANCELLED: 'Canceled',
      DISPUTED: 'Needs review',
    },
    participantStatus: {
      REGISTERED: 'Registered',
      APPROVED: 'Approved',
      CONFIRMED: 'Confirmed',
      WAITLISTED: 'Waitlisted',
      PENDING: 'Pending approval',
      PENDING_PAYMENT: 'Pending payment',
      REJECTED: 'Rejected',
      WITHDRAWN: 'Withdrawn',
      CHECKED_IN: 'Checked in',
    },
    waiting: 'Waiting to be determined',
    player: 'Player',
    resultsSheet: 'Tournament results',
    resultsFilePrefix: 'TournamentResults',
    participantsSheet: 'Participants',
    participantsFilePrefix: 'Participants',
    templateFileName: 'Registration_List_Template.xlsx',
    templateSheet: 'Registration template',
    resultsHeaders: ['Round', 'Match number', 'Team 1', 'Score 1', 'Score 2', 'Team 2', 'Winner', 'Status', 'Completion time', 'Referee'],
    participantHeaders: ['No.', 'Team / Player', 'Player 1', 'Player 2 (Doubles)', 'Division / Group', 'Seed / ELO', 'Status', 'Payment', 'Registration date'],
    templateRows: [
      {
        'No.': 1,
        'Player 1 name': 'Alex Brown',
        'Player 1 phone': '0901234567',
        'Player 2 name': 'Jamie Lee',
        'Player 2 phone': '0907654321',
        'Team name (Optional)': 'Saigon Pickleball Club',
        'Registration format': 'Men doubles 6.5',
        'ELO points (if available)': 1250,
        Notes: 'Deposit transferred',
      },
      {
        'No.': 2,
        'Player 1 name': 'Taylor Smith',
        'Player 1 phone': '0912345678',
        'Player 2 name': 'Morgan Davis',
        'Player 2 phone': '0918765432',
        'Team name (Optional)': 'Hanoi Pickleball Team',
        'Registration format': 'Mixed doubles',
        'ELO points (if available)': 1100,
        Notes: '',
      },
      {
        'No.': 3,
        'Player 1 name': 'Jordan Wilson',
        'Player 1 phone': '0933445566',
        'Player 2 name': '',
        'Player 2 phone': '',
        'Team name (Optional)': '',
        'Registration format': 'Men singles',
        'ELO points (if available)': 1300,
        Notes: '',
      },
    ],
  },
  vi: {
    status: {
      SCHEDULED: 'Sắp đấu',
      ONGOING: 'Đang đấu',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Đã hủy',
      DISPUTED: 'Cần xử lý',
    },
    participantStatus: {
      REGISTERED: 'Đã đăng ký',
      APPROVED: 'Đã duyệt',
      CONFIRMED: 'Đã xác nhận',
      WAITLISTED: 'Hàng chờ',
      PENDING: 'Chờ duyệt',
      PENDING_PAYMENT: 'Chờ thanh toán',
      REJECTED: 'Bị từ chối',
      WITHDRAWN: 'Đã rút lui',
      CHECKED_IN: 'Đã điểm danh',
    },
    waiting: 'Chờ xác định',
    player: 'VĐV',
    resultsSheet: 'Kết quả toàn giải',
    resultsFilePrefix: 'KetQua',
    participantsSheet: 'Danh sách VĐV',
    participantsFilePrefix: 'DanhSachVDV',
    templateFileName: 'Mau_Danh_Sach_VDV_Dang_Ky.xlsx',
    templateSheet: 'Mau_Dang_Ky',
    resultsHeaders: ['Vòng', 'Trận số', 'Đội 1', 'Điểm 1', 'Điểm 2', 'Đội 2', 'Đội thắng', 'Trạng thái', 'Thời gian kết thúc', 'Trọng tài'],
    participantHeaders: ['STT', 'Tên Đội / VĐV', 'VĐV 1', 'VĐV 2 (Nếu Đôi)', 'Hạng đấu / Bảng', 'Hạt giống / ELO', 'Trạng thái', 'Thanh toán', 'Ngày đăng ký'],
    templateRows: [
      {
        STT: 1,
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
        STT: 2,
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
        STT: 3,
        'Họ và tên VĐV 1': 'Đỗ Hữu E',
        'Số điện thoại 1': '0933445566',
        'Họ và tên VĐV 2': '',
        'Số điện thoại 2': '',
        'Tên Đội (Tùy chọn)': '',
        'Nội dung đăng ký': 'Đơn Nam',
        'Điểm ELO (nếu có)': 1300,
        'Ghi chú': '',
      },
    ],
  },
};

function getExportCopy(locale: string = 'vi'): ExportCopy {
  const activeLocale: ExportLocale = locale === 'en' ? 'en' : 'vi';
  const copy = EXPORT_COPY[activeLocale];
  return { ...copy, dateTime: (value) => formatExportDateTime(value, activeLocale) };
}

function teamName(match: Match, key: 'participant1' | 'participant2', waitingLabel: string): string {
  return match[key]?.teamName ?? waitingLabel;
}

/** Export the tournament results summary to an .xlsx file. */
export function exportTournamentResultsExcel(
  tournamentName: string,
  matches: Match[],
  locale: string = 'vi',
): void {
  const copy = getExportCopy(locale);
  const sorted = [...matches].sort(
    (a, b) => a.roundNumber - b.roundNumber || a.matchOrder - b.matchOrder,
  );

  const rows: Record<string, string | number>[] = sorted.map((match) => {
    const winnerId = match.winnerId;
    const winnerName =
      winnerId == null
        ? ''
        : winnerId === match.participant1Id
          ? teamName(match, 'participant1', copy.waiting)
          : winnerId === match.participant2Id
            ? teamName(match, 'participant2', copy.waiting)
            : '';

    return {
      [copy.resultsHeaders[0]]: match.roundNumber,
      [copy.resultsHeaders[1]]: match.matchOrder,
      [copy.resultsHeaders[2]]: teamName(match, 'participant1', copy.waiting),
      [copy.resultsHeaders[3]]: match.p1SetsWon,
      [copy.resultsHeaders[4]]: match.p2SetsWon,
      [copy.resultsHeaders[5]]: teamName(match, 'participant2', copy.waiting),
      [copy.resultsHeaders[6]]: winnerName,
      [copy.resultsHeaders[7]]: copy.status[match.status] ?? match.status,
      [copy.resultsHeaders[8]]: copy.dateTime(match.completedAt),
      [copy.resultsHeaders[9]]: match.refereeName ?? '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: copy.resultsHeaders });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, copy.resultsSheet);

  const fileName = `${copy.resultsFilePrefix}_${tournamentName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** Export the tournament participants to an .xlsx file. */
export function exportParticipantsExcel(
  tournamentName: string,
  divisionName: string,
  participants: TournamentParticipant[],
  locale: string = 'vi',
): void {
  const copy = getExportCopy(locale);
  const rows = participants.map((participant, index) => {
    const member1 = participant.members?.[0]?.fullName || participant.registeredBy?.fullName || participant.teamName || `${copy.player} ${index + 1}`;
    const member2 = participant.members?.[1]?.fullName || '';
    const status = copy.participantStatus[participant.teamStatus || ''] || participant.teamStatus || copy.waiting;
    const paid = participant.isPaid ? (locale === 'en' ? 'Paid' : 'Đã thanh toán') : (locale === 'en' ? 'Not paid' : 'Chưa thanh toán');

    return {
      [copy.participantHeaders[0]]: index + 1,
      [copy.participantHeaders[1]]: participant.teamName || member1,
      [copy.participantHeaders[2]]: member1,
      [copy.participantHeaders[3]]: member2,
      [copy.participantHeaders[4]]: divisionName || (locale === 'en' ? 'General' : 'Chung'),
      [copy.participantHeaders[5]]: participant.seed != null ? `#${participant.seed}` : participant.eloPoints ?? '',
      [copy.participantHeaders[6]]: status,
      [copy.participantHeaders[7]]: paid,
      [copy.participantHeaders[8]]: copy.dateTime(participant.registeredAt),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: copy.participantHeaders });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, copy.participantsSheet);

  const cleanName = `${tournamentName}_${divisionName}`.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
  const fileName = `${copy.participantsFilePrefix}_${cleanName}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** Download a sample participant-registration workbook. */
export function downloadParticipantsTemplateExcel(locale: string = 'vi'): void {
  const copy = getExportCopy(locale);
  const ws = XLSX.utils.json_to_sheet(copy.templateRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, copy.templateSheet);
  XLSX.writeFile(wb, copy.templateFileName);
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

/** Read an Excel/CSV registration file and detect its participant columns. */
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
  const findCol = (keywords: string[]) => {
    return headers.find((header) => {
      const lower = header.toLowerCase().trim();
      return keywords.some((keyword) => lower.includes(keyword));
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
