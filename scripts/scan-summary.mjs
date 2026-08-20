import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const src = path.join(root, 'src');
const vi = /[À-ỹĐđ]/u;
const protectedPaths = new Set([
  'src/app/organizer/tournaments/[id]/manage/page.tsx',
  'src/app/(public)/communities/[id]/components/SettingsTab.tsx',
]);
const protectedSuffixes = ['LanguageSwitcher.tsx','QuickTournamentCreate.tsx','Step4Fees.tsx','useManageState.ts','ScheduleTab.tsx','OpsMatches.tsx'];
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.next','dist','build'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(file);
  }
  return out;
}
const rows = [];
for (const file of walk(src)) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (protectedPaths.has(rel) || protectedSuffixes.some((suffix) => rel.endsWith(suffix))) continue;
  const count = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => vi.test(line)).length;
  if (count) rows.push({ rel, count });
}
rows.sort((a,b) => b.count - a.count || a.rel.localeCompare(b.rel));
console.log(`FILES=${rows.length}`);
for (const row of rows) console.log(`${row.count}\t${row.rel}`);
