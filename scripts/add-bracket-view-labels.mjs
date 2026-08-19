import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const values = {
  en: {
    BracketView: {
      upperTab: 'Winners bracket',
      lowerTab: 'Losers bracket',
      grandFinal: 'Grand final',
      upperFinal: 'Winners bracket final',
      upperSemifinal: 'Winners bracket semifinal',
      upperQuarterfinal: 'Winners bracket quarterfinal',
      upperRound16: 'Round of 16 · Winners bracket',
      upperRound32: 'Round of 32 · Winners bracket',
      upperRound64: 'Round of 64 · Winners bracket',
      upperRound128: 'Round of 128 · Winners bracket',
      upperRound: 'Round {number} · Winners bracket',
      lowerFinal: 'Losers bracket final',
      lowerSemifinal: 'Losers bracket semifinal',
      lowerQuarterfinal: 'Losers bracket quarterfinal',
      lowerRound16: 'Round of 16 · Losers bracket',
      lowerRound32: 'Round of 32 · Losers bracket',
      lowerRound64: 'Round of 64 · Losers bracket',
      lowerRound128: 'Round of 128 · Losers bracket',
      lowerRound: 'Round {number} · Losers bracket',
      roundProgress: 'Round {current} / {total}',
      previousMobile: 'Previous',
      previous: 'Previous round',
      nextMobile: 'Next',
      next: 'Next round',
      zoomOut: 'Zoom out',
      zoomIn: 'Zoom in',
      exitFullscreen: 'Exit fullscreen',
      fullscreen: 'Fullscreen',
    },
  },
  vi: {
    BracketView: {
      upperTab: 'Nhánh Thắng',
      lowerTab: 'Nhánh Thua',
      grandFinal: 'Chung kết Tổng',
      upperFinal: 'Chung kết Nhánh thắng',
      upperSemifinal: 'Bán kết Nhánh thắng',
      upperQuarterfinal: 'Tứ kết Nhánh thắng',
      upperRound16: 'Vòng 16 Nhánh thắng',
      upperRound32: 'Vòng 32 Nhánh thắng',
      upperRound64: 'Vòng 64 Nhánh thắng',
      upperRound128: 'Vòng 128 Nhánh thắng',
      upperRound: 'Vòng {number} Nhánh thắng',
      lowerFinal: 'Chung kết Nhánh thua',
      lowerSemifinal: 'Bán kết Nhánh thua',
      lowerQuarterfinal: 'Tứ kết Nhánh thua',
      lowerRound16: 'Vòng 16 Nhánh thua',
      lowerRound32: 'Vòng 32 Nhánh thua',
      lowerRound64: 'Vòng 64 Nhánh thua',
      lowerRound128: 'Vòng 128 Nhánh thua',
      lowerRound: 'Vòng {number} Nhánh thua',
      roundProgress: 'Vòng {current} / {total}',
      previousMobile: 'Trước',
      previous: 'Vòng trước',
      nextMobile: 'Sau',
      next: 'Vòng tiếp',
      zoomOut: 'Thu nhỏ',
      zoomIn: 'Phóng to',
      exitFullscreen: 'Thoát toàn màn hình',
      fullscreen: 'Toàn màn hình',
    },
  },
};

for (const [locale, localeValues] of Object.entries(values)) {
  const file = path.join(root, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8'));
  messages.BracketView = { ...(messages.BracketView ?? {}), ...localeValues.BracketView };
  fs.writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
}
