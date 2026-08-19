import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const src = path.join(root, 'src');
const vi = /[\u00C0-\u024F\u1E00-\u1EFF]/;
const skip = ['manage/page.tsx', 'SettingsTab.tsx', 'QuickTournamentCreate.tsx', 'useManageState.ts', 'ScheduleTab.tsx', 'OpsMatches.tsx', 'LanguageSwitcher.tsx', 'Step4Fees.tsx'];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
const results = [];
for (const file of walk(src)) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (skip.some((suffix) => relative.endsWith(suffix))) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const affected = lines.filter((line) => vi.test(line));
  if (affected.length) {
    const likelyUi = affected.filter((line) => /["'`]([^"'`]*[\u00C0-\u024F\u1E00-\u1EFF])/.test(line)).length;
    results.push({ relative, lines: affected.length, likelyUi });
  }
}
results.sort((a, b) => b.likelyUi - a.likelyUi || b.lines - a.lines || a.relative.localeCompare(b.relative));
for (const result of results) console.log(`${result.likelyUi}\t${result.lines}\t${result.relative}`);
