const fs = require('fs');
const path = require('path');

const file = 'd:/Duancanhan/Project_QuanLyGiaiDau/frontend-web_qlgiaidau/src/app/organizer/tournaments/[id]/manage/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace imports
const importTarget = "import toast from 'react-hot-toast';\r\nimport { getErrorMessage } from '@/utils/error';";
const importReplacement = "import toast from 'react-hot-toast';\r\nimport { getErrorMessage } from '@/utils/error';\r\nimport BracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';";

if (content.includes(importTarget)) {
  content = content.replace(importTarget, importReplacement);
  console.log("Import added successfully.");
} else {
  console.log("Warning: Import target not found.");
}

// Find bracket block start and end
const startMarker = "            ) : (\r\n              <div className=\"space-y-8\">\r\n                {bracket.stages.map((stage) => (";
const endMarker = "                ))}\r\n              </div>\r\n            )}";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = "            ) : (\r\n              <BracketTab tournament={tournament!} onScheduleMatch={handleOpenScheduling} />\r\n            )}";
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx + endMarker.length);
  fs.writeFileSync(file, content, 'utf8');
  console.log("BracketTab component replacement successful.");
} else {
  console.log("Error: could not find match markers. startIdx:", startIdx, "endIdx:", endIdx);
}
