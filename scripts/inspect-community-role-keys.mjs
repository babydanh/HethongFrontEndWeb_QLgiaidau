import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
for (const locale of ['en', 'vi']) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, 'messages', `${locale}.json`), 'utf8'));
  const common = messages.Common ?? {};
  const match = messages.Match ?? {};
  const keys = Object.keys(common).filter((key) => /role|tagSuggestion|memberSince|owner|moderator|member/i.test(key));
  console.log(locale, 'Common:', keys.sort().join(', '));
  console.log(locale, 'Match:', Object.keys(match).filter((key) => /role|owner|moderator|member/i.test(key)).sort().join(', '));
}
