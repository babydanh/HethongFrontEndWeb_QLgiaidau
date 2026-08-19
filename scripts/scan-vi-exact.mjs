import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const vi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/u;
const protectedSuffixes = new Set([
  'SettingsTab.tsx',
  'QuickTournamentCreate.tsx',
  'useManageState.ts',
  'ScheduleTab.tsx',
  'OpsMatches.tsx',
]);
const ignoredDirs = new Set(['node_modules', '.next']);
const results = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      if ([...protectedSuffixes].some((suffix) => rel.endsWith(suffix))) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      const hits = lines.filter((line) => vi.test(line));
      if (hits.length) results.push({ rel, count: hits.length, sample: hits.slice(0, 3).map((line) => line.trim()) });
    }
  }
}
walk(src);
results.sort((a, b) => b.count - a.count || a.rel.localeCompare(b.rel));
for (const item of results) {
  console.log(`${item.count}\t${item.rel}`);
  for (const sample of item.sample) console.log(`  ${sample}`);
}
