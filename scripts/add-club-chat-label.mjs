import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const values = {
  en: { clubChatSchedulePrompt: 'Chat and schedule matches' },
  vi: { clubChatSchedulePrompt: 'Giao lưu & hẹn lịch thi đấu' },
};
for (const locale of ['en', 'vi']) {
  const filePath = path.join(root, 'messages', `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  catalog.Common = { ...catalog.Common, ...values[locale] };
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}
