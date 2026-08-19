import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'src', 'app', '(player)', 'payments');
const re = /[À-ỹĐđ]/;
const ignored = /^(\/\/|\/\*|\*|\*\/)/;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      for (const [index, raw] of lines.entries()) {
        const text = raw.trim();
        if (re.test(text) && !ignored.test(text)) console.log(`${path.relative(process.cwd(), full)}:${index + 1}: ${text}`);
      }
    }
  }
}
walk(root);
