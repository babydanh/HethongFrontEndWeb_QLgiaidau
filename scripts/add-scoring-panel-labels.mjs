import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const scorePresentation = {
  BADMINTON: {
    sportLabel: { en: 'Badminton', vi: 'Cầu lông' },
    scoreUnit: { en: 'points', vi: 'điểm' },
    currentScoreLabel: { en: 'Current set score', vi: 'Điểm set hiện tại' },
    sequenceLabel: { en: 'set', vi: 'set' },
    summaryLabel: { en: 'Set scores', vi: 'Tỉ số các set' },
    completeActionLabel: { en: 'Finalize current set', vi: 'Chốt set hiện tại' },
    wonSummaryLabel: { en: 'Sets won', vi: 'Set thắng' },
  },
  TABLE_TENNIS: {
    sportLabel: { en: 'Table tennis', vi: 'Bóng bàn' },
    scoreUnit: { en: 'points', vi: 'điểm' },
    currentScoreLabel: { en: 'Current set score', vi: 'Điểm set hiện tại' },
    sequenceLabel: { en: 'set', vi: 'set' },
    summaryLabel: { en: 'Set scores', vi: 'Tỉ số các set' },
    completeActionLabel: { en: 'Finalize current set', vi: 'Chốt set hiện tại' },
    wonSummaryLabel: { en: 'Sets won', vi: 'Set thắng' },
  },
  PICKLEBALL_RALLY: {
    sportLabel: { en: 'Pickleball', vi: 'Pickleball' },
    scoreUnit: { en: 'points', vi: 'điểm' },
    currentScoreLabel: { en: 'Current game score', vi: 'Điểm game hiện tại' },
    sequenceLabel: { en: 'game', vi: 'game' },
    summaryLabel: { en: 'Game scores', vi: 'Tỉ số các game' },
    completeActionLabel: { en: 'Finalize current game', vi: 'Chốt game hiện tại' },
    wonSummaryLabel: { en: 'Games won', vi: 'Game thắng' },
  },
  PICKLEBALL_SIDE_OUT: {
    sportLabel: { en: 'Pickleball', vi: 'Pickleball' },
    scoreUnit: { en: 'points', vi: 'điểm' },
    currentScoreLabel: { en: 'Current game score', vi: 'Điểm game hiện tại' },
    sequenceLabel: { en: 'game', vi: 'game' },
    summaryLabel: { en: 'Game scores', vi: 'Tỉ số các game' },
    completeActionLabel: { en: 'Finalize current game', vi: 'Chốt game hiện tại' },
    wonSummaryLabel: { en: 'Games won', vi: 'Game thắng' },
  },
  TENNIS: {
    sportLabel: { en: 'Tennis', vi: 'Tennis' },
    scoreUnit: { en: 'games', vi: 'game' },
    currentScoreLabel: { en: 'Current game score', vi: 'Game hiện tại' },
    sequenceLabel: { en: 'set', vi: 'set' },
    summaryLabel: { en: 'Set scores', vi: 'Tỉ số các set' },
    completeActionLabel: { en: 'Finalize current set', vi: 'Chốt set hiện tại' },
    wonSummaryLabel: { en: 'Sets won', vi: 'Set thắng' },
  },
  FOOTBALL: {
    sportLabel: { en: 'Football', vi: 'Bóng đá' },
    scoreUnit: { en: 'goals', vi: 'bàn' },
    currentScoreLabel: { en: 'Current score', vi: 'Tỉ số hiện tại' },
    sequenceLabel: { en: 'half', vi: 'hiệp' },
    summaryLabel: { en: 'Match score', vi: 'Tỉ số trận' },
    completeActionLabel: { en: 'Finalize match', vi: 'Chốt trận đấu' },
    wonSummaryLabel: { en: 'Score', vi: 'Tỉ số' },
  },
};

const scoreWarnings = {
  draw: { en: '{label} is tied at {team1}-{team2}. If the result is final, correct it or enable override mode.', vi: '{label} đang hòa {team1}-{team2}. Nếu đã chốt kết quả thì cần sửa lại hoặc bật chế độ ngoại lệ.' },
  tennisInvalid: { en: '{label} has score {team1}-{team2}, which is invalid for the {pointsPerSet}-game target and {maxPoints}-game preset limit.', vi: '{label} có tỷ số {team1}-{team2}, không hợp lệ theo mốc {pointsPerSet} game và giới hạn {maxPoints} game của preset.' },
  target: { en: '{label} is finalized at {team1}-{team2}, but the winner has not reached the target of {pointsPerSet}.', vi: '{label} đang chốt ở {team1}-{team2} nhưng bên thắng chưa chạm mốc {pointsPerSet}.' },
  minTarget: { en: '{label} is finalized at {team1}-{team2}, but the winner has not reached {pointsPerSet} points.', vi: '{label} đang chốt ở {team1}-{team2} nhưng bên thắng chưa đủ {pointsPerSet} điểm.' },
  margin: { en: '{label} is finalized at {team1}-{team2}, but the default two-point margin has not been reached.', vi: '{label} đang chốt ở {team1}-{team2} nhưng chưa đủ cách biệt 2 điểm theo cấu hình mặc định.' },
  cap: { en: '{label} exceeds the current configuration cap of {maxPoints} points.', vi: '{label} vượt trần {maxPoints} điểm của cấu hình hiện tại.' },
  tooManyWins: { en: 'One side has more {unit} wins than required ({setsToWin}).', vi: 'Một bên đang có số {unit} thắng vượt mức cần thiết ({setsToWin}).' },
};

const phaseLabels = {
  FIRST_HALF: { en: 'First half', vi: 'Hiệp 1' },
  HALFTIME: { en: 'Halftime', vi: 'Giải lao' },
  SECOND_HALF: { en: 'Second half', vi: 'Hiệp 2' },
  STOPPAGE_TIME: { en: 'Stoppage time', vi: 'Bù giờ' },
  FULL_TIME: { en: 'Full time', vi: 'Hết giờ' },
  EXTRA_TIME_FIRST_HALF: { en: 'Extra-time first half', vi: 'Hiệp phụ 1' },
  EXTRA_TIME_BREAK: { en: 'Extra-time break', vi: 'Nghỉ hiệp phụ' },
  EXTRA_TIME_SECOND_HALF: { en: 'Extra-time second half', vi: 'Hiệp phụ 2' },
  PENALTY_SHOOTOUT: { en: 'Penalty shootout', vi: 'Luân lưu' },
  COMPLETED: { en: 'Completed', vi: 'Hoàn thành' },
};

const scoring = {
  noMatch: { en: 'No match data is available for score entry.', vi: 'Không có dữ liệu trận để nhập điểm.' },
  team1: { en: 'Team 1', vi: 'Đội 1' },
  team2: { en: 'Team 2', vi: 'Đội 2' },
  currentSummary: { en: '{label} current: {team1}-{team2}{status}', vi: '{label} hiện tại: {team1}-{team2}{status}' },
  finalizedSuffix: { en: ' (finalized)', vi: ' (đã chốt)' },
  openSuffix: { en: ' (open)', vi: ' (đang mở)' },
  noOpenSequence: { en: 'No {label} is currently open', vi: 'Chưa có {label} đang mở' },
  scoreHeader: { en: '{sport} • {summary} • Target: {points}', vi: '{sport} • {summary} • Chạm đích: {points}' },
  tiebreakSuffix: { en: ' game, tiebreak {points}', vi: ' game, loạt phụ {points}' },
  oneOpenNotice: { en: 'Only one {label} should be open in this modal. If multiple 0-0 rows remain unfinished, the tennis backend will reject the score.', vi: 'Modal này chỉ nên có 1 {label} đang mở. Nếu có nhiều dòng 0-0 chưa chốt, backend tennis sẽ từ chối.' },
  validExamplePrefix: { en: 'Valid example:', vi: 'Ví dụ hợp lệ:' },
  refereeModeTitle: { en: 'Referee / organizer mode', vi: 'Chế độ trọng tài / BTC' },
  overrideEnabled: { en: 'Override enabled', vi: 'Ngoại lệ đang bật' },
  defaultRules: { en: 'Default rules', vi: 'Theo luật mặc định' },
  overrideDescription: { en: 'Enable only when a score outside the default rules must be finalized. The system still records the decision-maker and reason.', vi: 'Chỉ bật khi cần chốt tỷ số khác luật mặc định. Hệ thống vẫn lưu đầy đủ người quyết định và lý do.' },
  disableOverride: { en: 'Disable override', vi: 'Tắt ngoại lệ' },
  enableOverride: { en: 'Enable override', vi: 'Bật ngoại lệ' },
  overrideReasonRequired: { en: 'Override reason is required', vi: 'Lý do ngoại lệ bắt buộc' },
  overridePlaceholder: { en: 'Example: the third-place match used a shortened tiebreak by referee and organizer decision...', vi: 'Ví dụ: trận tranh hạng ba thống nhất chơi loạt phụ rút gọn theo quyết định trọng tài và BTC...' },
  overrideAuditNotice: { en: 'The system records who decided the override, when it was decided, and the reason.', vi: 'Hệ thống sẽ ghi lại người quyết định, thời điểm và lý do ngoại lệ của trận.' },
  liteNotice: { en: '⚡ This tournament uses free rules (Lite Mode). Referees may enter or adjust scores without limits.', vi: '⚡ Giải đang dùng luật Tự do (Lite Mode). Trọng tài được tùy ý ghi/chỉnh điểm số không bị giới hạn.' },
  servingNow: { en: '{team} currently serves • turn {number}. This panel also saves the current serving state.', vi: '{team} đang giữ quyền giao • lượt {number}. Panel này sẽ lưu luôn trạng thái giao bóng hiện tại.' },
  sideOutNotSelected: { en: 'Side-out mode is enabled, but the current serving team has not been selected in the live scoreboard.', vi: 'Chế độ mất quyền giao đang bật nhưng trận chưa chốt đội giao hiện tại ở bảng điểm trực tiếp.' },
  sideOutControlsTitle: { en: 'Serving controls in modal', vi: 'Điều khiển giao bóng trong modal' },
  noServingTeam: { en: 'No current serving team selected', vi: 'Chưa chọn đội giao hiện tại' },
  sideOutDescription: { en: 'Use this to finalize the serving state together with a pickleball game score.', vi: 'Dùng khi cần chốt lại trạng thái giao bóng cùng lúc với việc nhập tỷ số game pickleball.' },
  serve: { en: 'serve', vi: 'giao' },
  serveTurn: { en: 'Serve {number}', vi: 'Lượt giao {number}' },
  sideOutLoss: { en: 'Side-out', vi: 'Mất quyền giao' },
  warningTitle: { en: 'Default-rule warnings', vi: 'Cảnh báo bám luật mặc định' },
  warningOverrideHint: { en: 'If the referee record confirms this is a valid result outside the preset, enable override mode and record the reason.', vi: 'Nếu biên bản trọng tài xác nhận đây là kết quả hợp lệ ngoài preset, hãy bật chế độ ngoại lệ rồi ghi rõ lý do.' },
  inProgress: { en: 'In progress', vi: 'Đang diễn ra' },
  override: { en: 'Override', vi: 'Ngoại lệ' },
  finalized: { en: 'Finalized', vi: 'Đã chốt' },
  currentSequence: { en: 'Current {label}', vi: '{label} hiện tại' },
  notStarted: { en: 'Not started', vi: 'Chưa mở' },
  sequenceDescription: { en: 'Finalized {label} values are retained. Only the current {label} can be entered and finalized with the save button.', vi: '{label} đã chốt sẽ giữ lại. {label} hiện tại mới được nhập điểm và chốt ở nút lưu.' },
  overrideReasonPrefix: { en: 'Override reason:', vi: 'Lý do ngoại lệ:' },
  clearQuickSequence: { en: 'Quick-clear this {label}', vi: 'Xóa nhanh {label} này' },
  currentSetDraw: { en: 'The current score is {team1}-{team2}. Finalize it with a non-draw score before saving.', vi: 'Set hiện tại đang ở mức {team1} - {team2}. Hãy chốt bằng một tỉ số không hòa trước khi lưu.' },
  noFinalizedSequence: { en: 'No {label} has been finalized. Enter a score for the current {label} before saving.', vi: 'Chưa có {label} nào được chốt. Hãy nhập điểm cho {label} hiện tại trước khi lưu.' },
  sequenceDraw: { en: '{label} cannot be tied. Check the entered score.', vi: '{label} không được hòa. Hãy kiểm tra lại tỉ số đã nhập.' },
  overrideReasonNeeded: { en: 'Override is enabled; enter a reason so the organizer and referee can review it later.', vi: 'Đã bật ngoại lệ, cần nhập lý do để BTC và trọng tài tra cứu lại sau.' },
  shootoutTitle: { en: '⚽ Knockout draw — enter a shootout to decide the winner', vi: '⚽ Trận hòa ở vòng loại trực tiếp — nhập luân lưu để phân định' },
  shootoutLabel: { en: 'shootout', vi: 'luân lưu' },
  winsShootout: { en: 'wins the shootout', vi: 'thắng luân lưu' },
  cancel: { en: 'Cancel', vi: 'Hủy' },
  saveScore: { en: 'Save score', vi: 'Lưu tỷ số' },
};

for (const locale of ['en', 'vi']) {
  const filePath = path.join(root, 'messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  catalog.TournamentDetail = {
    ...catalog.TournamentDetail,
    scorePresentation: Object.fromEntries(Object.entries(scorePresentation).map(([kind, values]) => [
      kind,
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value[locale]])),
    ])),
    scoreWarnings: Object.fromEntries(Object.entries(scoreWarnings).map(([key, value]) => [key, value[locale]])),
    scorePhases: Object.fromEntries(Object.entries(phaseLabels).map(([key, value]) => [key, value[locale]])),
  };
  catalog.OrganizerScoring = Object.fromEntries(Object.entries(scoring).map(([key, value]) => [key, value[locale]]));
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
