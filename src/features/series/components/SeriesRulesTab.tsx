import React from 'react';
import { TournamentSeries } from '@/types/series';
import { Award, AlertTriangle, HelpCircle, Trophy } from 'lucide-react';

interface SeriesRulesTabProps {
  series: TournamentSeries;
}

export const SeriesRulesTab: React.FC<SeriesRulesTabProps> = ({ series }) => {
  const { rules } = series;
  
  // Format rank labels
  const getRankName = (rankKey: string) => {
    const rank = parseInt(rankKey);
    if (rank === 1) return '🥇 Quán Quân (Hạng 1)';
    if (rank === 2) return '🥈 Á Quân (Hạng 2)';
    if (rank === 3) return '🥉 Đồng Hạng 3-4';
    if (rank === 5) return '🎖️ Hạng 5-8';
    if (rank === 9) return '🎖️ Hạng 9-16';
    return `🎖️ Hạng ${rankKey}+`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Point Table System (7 columns) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Bảng Điểm Tích Lũy PSR
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Mỗi VĐV hoặc Đội thi đấu tại các giải đấu thành viên thuộc Chuỗi giải đấu sẽ tích lũy điểm Player Series Rating (PSR) dựa trên thành tích xếp hạng chung cuộc tại giải đấu đó. Điểm này dùng để xếp hạng chặng và xét vé vớt.
          </p>

          <div className="border border-slate-150 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Thứ Hạng Đạt Được</th>
                  <th className="py-3.5 px-6 text-right">Điểm PSR Nhận Được</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700">
                {Object.entries(rules.pointsByRank)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([rankKey, points]) => (
                    <tr key={rankKey} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-sm">
                        {getRankName(rankKey)}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-blue-600 text-sm">
                        +{points} pts
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rules Explanations (5 columns) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Exclusion Rule Explainer */}
        {rules.exclusionRule && (
          <div className="bg-amber-50/60 p-6 rounded-lg border border-amber-200/60 shadow-sm relative overflow-hidden">
            <h3 className="text-base font-bold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Luật Khóa Suất (Exclusion Rule)
            </h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              Nhằm tăng tính hấp dẫn và trao cơ hội cọ xát bình đẳng cho toàn bộ cộng đồng VĐV:
            </p>
            <ul className="list-disc list-inside text-sm text-amber-700/90 mt-2 space-y-1.5 leading-relaxed pl-1">
              <li>VĐV/Đội đạt thứ hạng <strong>Hạng {rules.directEntryThreshold} trở lên</strong> (Vô địch/Á quân) tại bất cứ giải đấu nào sẽ nhận ngay <strong>Vé Thẳng</strong> vào Vòng Chung Kết.</li>
              <li>Khi đã nhận Vé Thẳng, VĐV/Đội đó <strong>sẽ bị khóa (Locked-out)</strong> khỏi việc đăng ký các giải đấu vòng loại tiếp theo trong chặng (Leg) hiện tại.</li>
              <li>Phạm vi áp dụng: Khóa theo {rules.exclusionScope === 'CATEGORY' ? 'nội dung thi đấu đạt vé' : 'toàn bộ các nội dung thuộc chuỗi'}.</li>
            </ul>
          </div>
        )}

        {/* Qualification Process */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" /> Cơ Chế Vé Vớt (Wildcard)
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-3">
            Những VĐV kiên trì thi đấu nhiều chặng đấu và tích lũy được điểm số PSR cao nhưng chưa may mắn đoạt vé thẳng (chưa từng vô địch hay á quân) vẫn còn cơ hội lớn:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 leading-relaxed pl-1">
            <li>Cuối chặng đấu, Ban tổ chức sẽ lọc danh sách Bảng xếp hạng PSR.</li>
            <li><strong>Top {rules.wildcardCount} VĐV/Đội</strong> có điểm tích lũy cao nhất (không tính các VĐV đã đoạt vé thẳng trước đó) sẽ nhận <strong>Vé Vớt</strong> để tham gia tranh tài tại Vòng Chung Kết toàn quốc.</li>
          </ul>
        </div>

        {/* FAQ/Support Info */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-150 shadow-sm flex items-start gap-4">
          <HelpCircle className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">Cần hỗ trợ về luật lệ?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nếu có bất kỳ thắc mắc nào về cách tính điểm, phân chia hạt giống hoặc luật khóa chặng, vui lòng liên hệ trực tiếp với Ban tổ chức thông qua mục thông tin liên hệ của chuỗi giải.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
