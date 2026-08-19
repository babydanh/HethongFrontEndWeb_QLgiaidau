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
const sourceExtensions = new Set(['.ts', '.tsx']);
const results = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (sourceExtensions.has(path.extname(entry.name))) {
      const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
      if (protectedFiles.has(relative)) continue;
      const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
      const hits = lines
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => vietnamese.test(line));
      if (hits.length) results.push({ relative, hits });
    }
  }
}

walk(srcRoot);
results.sort((a, b) => b.hits.length - a.hits.length || a.relative.localeCompare(b.relative));
console.log(`Files with Vietnamese-character lines: ${results.length}`);
console.log(`Total matching lines: ${results.reduce((sum, item) => sum + item.hits.length, 0)}`);
for (const item of results.slice(0, 80)) {
  console.log(`\n[${item.hits.length}] ${item.relative}`);
  for (const hit of item.hits.slice(0, 80)) console.log(`  ${hit.number}: ${hit.line.trim()}`);
}
