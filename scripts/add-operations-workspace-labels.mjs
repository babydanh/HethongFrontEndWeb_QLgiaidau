import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entries = {
  operationsPanelTitle: ['Tournament operations panel', 'Panel vận hành giải đấu'],
  operationsPanelDescription: ['Use this screen to monitor the tournament in real time: matches ready to call, blocked matches, unresolved issues, and rosters needing technical attention.', 'Màn hình này dùng để theo dõi nhịp chạy thực tế của giải: trận nào sắp gọi vào sân, trận nào đang nghẽn, vấn đề nào chưa chốt và roster nào cần xử lý kỹ thuật.'],
  draftModeTitle: ['Draft testing mode', 'Chế độ thử nghiệm Draft'],
  draftModeDescription: ['You can test the bracket, schedule, scores, and workflows with {count} mock participants/teams. When the tournament is published, the system removes all mock participants and test brackets before accepting real competition data.', 'Bạn có thể thử bracket, lịch, tỷ số và nghiệp vụ với {count} VĐV/đội ảo. Khi công bố giải, hệ thống xóa toàn bộ participant mock và bracket thử trước khi nhận dữ liệu thi đấu thật.'],
  mockOutsideDraft: ['Detected {count} mock participants outside Draft status. Clean up test data before continuing live operations.', 'Phát hiện {count} participant mock ngoài trạng thái Draft. Cần dọn dữ liệu thử trước khi tiếp tục vận hành thật.'],
  readyToCall: ['Ready to call', 'Sẵn sàng gọi vào sân'],
  readyToCallDescription: ['Matches have a court and referee and can move to in-progress now.', 'Trận đã có sân và trọng tài, có thể chuyển sang trạng thái thi đấu ngay.'],
  missingCoordination: ['Needs coordination', 'Thiếu điều phối'],
  missingCoordinationDescription: ['Matches are missing a court or referee assignment.', 'Trận chưa gán đủ sân hoặc trọng tài.'],
  overdueStart: ['Overdue start', 'Quá giờ chưa start'],
  overdueStartDescription: ['The scheduled time has passed, but the match has not started.', 'Trận đã qua giờ dự kiến nhưng vẫn chưa bắt đầu.'],
  exceptionsDiscipline: ['Exceptions & discipline', 'Ngoại lệ & kỷ luật'],
  exceptionsDisciplineDescription: ['{matches} matches have decisions/exceptions · {penalties} cards or penalties.', '{matches} trận có quyết định/ngoại lệ · {penalties} thẻ hoặc hình phạt.'],
  matchesTab: ['Matches', 'Trận đấu'],
  participantsTab: ['Participants', 'Thành viên'],
  activityTab: ['Activity log', 'Nhật ký'],
};

for (const locale of ['en', 'vi']) {
  const file = path.join(root, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8'));
  const namespace = messages.OrganizerOps ??= {};
  for (const [key, [en, vi]] of Object.entries(entries)) namespace[key] = locale === 'en' ? en : vi;
  fs.writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
}
console.log(`Added ${Object.keys(entries).length} OperationsWorkspace keys to EN and VI.`);
