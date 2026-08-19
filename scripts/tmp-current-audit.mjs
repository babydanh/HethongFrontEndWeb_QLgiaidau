import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'src');
const protectedNames = new Set([
  'LanguageSwitcher.tsx', 'SettingsTab.tsx', 'QuickTournamentCreate.tsx', 'Step4Fees.tsx',
  'useManageState.ts', 'ScheduleTab.tsx', 'OpsMatches.tsx',
]);
const domainOnly = [
  `${path.sep}features${path.sep}matches${path.sep}penalty-schema.ts`,
  `${path.sep}features${path.sep}notifications${path.sep}constants.ts`,
];
const re = /[À-ỹĐđ]/;
const commentOnly = /^(\/\/|\/\*|\*|\*\/)/;
const files = new Map();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !protectedNames.has(entry.name) && !domainOnly.some((suffix) => full.endsWith(suffix))) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      const hits = [];
      for (const [index, raw] of lines.entries()) {
        const text = raw.trim();
        if (re.test(text) && !commentOnly.test(text)) hits.push({ line: index + 1, text });
      }
      if (hits.length) files.set(path.relative(process.cwd(), full), hits);
    }
  }
}
walk(root);
for (const [file, hits] of [...files.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n## ${hits.length} hits - ${file}`);
  for (const hit of hits) console.log(`${hit.line}: ${hit.text}`);
}
