import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const values = {
  en: 'Community Moderator',
  vi: 'Quản trị viên CLB',
};
for (const locale of ['en', 'vi']) {
  const file = path.join(root, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8'));
  messages.Match ??= {};
  messages.Match.communityRoleModerator = values[locale];
  fs.writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`, 'utf8');
}
