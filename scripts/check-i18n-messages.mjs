import { readFile } from 'node:fs/promises';

const localeFiles = ['vi', 'en'];

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      nestedValue !== null &&
      typeof nestedValue === 'object' &&
      !Array.isArray(nestedValue)
    ) {
      return flattenKeys(nestedValue, path);
    }

    return path;
  });
}

const dictionaries = await Promise.all(
  localeFiles.map(async (locale) => {
    const content = await readFile(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8');
    return [locale, new Set(flattenKeys(JSON.parse(content)))];
  }),
);

const allKeys = new Set(dictionaries.flatMap(([, keys]) => [...keys]));
let hasMismatch = false;

for (const [locale, keys] of dictionaries) {
  const missingKeys = [...allKeys].filter((key) => !keys.has(key));

  if (missingKeys.length > 0) {
    hasMismatch = true;
    console.error(`[i18n] ${locale}.json is missing:`);
    missingKeys.forEach((key) => console.error(`  - ${key}`));
  }
}

if (hasMismatch) {
  process.exitCode = 1;
} else {
  console.log(`[i18n] ${allKeys.size} message keys match across ${localeFiles.join(', ')}.`);
}
