import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const vi = /[À-ỹĐđ]/u;
const protectedSuffixes = [
  'LanguageSwitcher.tsx',
  'SettingsTab.tsx',
  'QuickTournamentCreate.tsx',
  'useManageState.ts',
  'ScheduleTab.tsx',
  'OpsMatches.tsx',
];
const ignoredDirs = new Set(['node_modules', '.next', 'dist', 'build']);

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (/\.(ts|tsx)$/.test(entry.name)) output.push(full);
  }
  return output;
}

for (const file of walk(src)) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (protectedSuffixes.some((suffix) => rel.endsWith(suffix))) continue;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const hits = lines.flatMap((line, index) => vi.test(line) ? [{ line: index + 1, text: line.trim() }] : []);
  if (hits.length) {
    console.log(JSON.stringify({ file: rel, count: hits.length, hits }));
  }
}
