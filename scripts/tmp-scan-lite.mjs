import fs from 'node:fs';
const file = 'src/app/lite/tournaments/[id]/manage/page.tsx';
const text = fs.readFileSync(file, 'utf8');
const re = /[À-ỹ]/;
for (const [index, line] of text.split(/\r?\n/).entries()) {
  if (re.test(line)) console.log(`${index + 1}: ${line}`);
}
