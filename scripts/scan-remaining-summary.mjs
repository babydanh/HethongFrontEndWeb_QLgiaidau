import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const srcRoot = path.join(root, 'src');
const protectedFiles = new Set([
  'src/app/organizer/tournaments/[id]/manage/page.tsx',
  'src/app/(public)/communities/[id]/components/SettingsTab.tsx',
  'src/app/organizer/tournaments/create/QuickTournamentCreate.tsx',
  'src/app/organizer/tournaments/[id]/manage/components/useManageState.ts',
  'src/app/organizer/tournaments/[id]/manage/components/ScheduleTab.tsx',
  'src/app/organizer/tournaments/[id]/ops/components/OpsMatches.tsx',
  'src/app/organizer/tournaments/create/page.tsx',
  'src/app/organizer/tournaments/create/components/Step4Fees.tsx',
  'src/components/shared/LanguageSwitcher.tsx',
]);
const vietnamese = /[\u00C0-\u024F\u1E00-\u1EFF]/;
const results = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
      if (protectedFiles.has(relative)) continue;
      const hits = fs.readFileSync(absolute, 'utf8').split(/\r?\n/).filter((line) => vietnamese.test(line)).length;
      if (hits) results.push({ relative, hits });
    }
  }
}
walk(srcRoot);
results.sort((a, b) => b.hits - a.hits || a.relative.localeCompare(b.relative));
for (const item of results) console.log(`${item.hits}\t${item.relative}`);
