'use client';

import { Tournament } from '@/features/tournaments/api';

interface Props {
  tournament: Tournament;
}

export default function BracketTab({ tournament }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900">Sơ đồ thi đấu</h3>
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold border border-slate-200">
          {tournament.format}
        </span>
      </div>

      <div className="overflow-x-auto pb-8 min-h-[400px]">
        {/* Placeholder for complex Bracket view */}
        {tournament.format === 'SINGLE_ELIMINATION' || tournament.format === 'DOUBLE_ELIMINATION' ? (
          <div className="flex min-w-max">
            {/* Round 1 */}
            <div className="flex flex-col justify-around px-4">
              <h4 className="text-center font-bold text-slate-500 mb-6 uppercase text-xs tracking-widest">Tứ kết</h4>
              {[1, 2, 3, 4].map(match => (
                <div key={`r1-${match}`} className="mb-8 relative">
                  <div className="w-48 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center p-2 border-b border-slate-100">
                      <span className="font-semibold text-slate-900 text-sm truncate">Team A</span>
                      <span className="font-bold text-slate-400">0</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50">
                      <span className="font-semibold text-slate-900 text-sm truncate">Team B</span>
                      <span className="font-bold text-slate-400">0</span>
                    </div>
                  </div>
                  {/* Connecting lines */}
                  <div className="absolute top-1/2 -right-4 w-4 h-px bg-slate-300"></div>
                  {match % 2 !== 0 && <div className="absolute top-1/2 -right-4 w-px h-[calc(50%+1rem)] bg-slate-300"></div>}
                  {match % 2 === 0 && <div className="absolute bottom-1/2 -right-4 w-px h-[calc(50%+1rem)] bg-slate-300"></div>}
                </div>
              ))}
            </div>

            {/* Round 2 */}
            <div className="flex flex-col justify-around px-4">
              <h4 className="text-center font-bold text-slate-500 mb-6 uppercase text-xs tracking-widest">Bán kết</h4>
              {[1, 2].map(match => (
                <div key={`r2-${match}`} className="mb-16 relative">
                  <div className="w-48 bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col relative">
                     {/* Incoming line */}
                     <div className="absolute top-1/2 -left-4 w-4 h-px bg-slate-300"></div>
                    <div className="flex justify-between items-center p-2 border-b border-slate-100">
                      <span className="font-semibold text-slate-900 text-sm truncate">TBD</span>
                      <span className="font-bold text-slate-400">-</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50">
                      <span className="font-semibold text-slate-900 text-sm truncate">TBD</span>
                      <span className="font-bold text-slate-400">-</span>
                    </div>
                  </div>
                  <div className="absolute top-1/2 -right-4 w-4 h-px bg-slate-300"></div>
                  {match % 2 !== 0 && <div className="absolute top-1/2 -right-4 w-px h-[calc(50%+2rem)] bg-slate-300"></div>}
                  {match % 2 === 0 && <div className="absolute bottom-1/2 -right-4 w-px h-[calc(50%+2rem)] bg-slate-300"></div>}
                </div>
              ))}
            </div>

            {/* Final */}
            <div className="flex flex-col justify-around px-4">
              <h4 className="text-center font-bold text-amber-500 mb-6 uppercase text-xs tracking-widest flex items-center justify-center gap-1">Chung kết</h4>
              <div className="relative">
                <div className="w-56 bg-white border-2 border-amber-400 shadow-md rounded-lg overflow-hidden flex flex-col relative">
                   {/* Incoming line */}
                   <div className="absolute top-1/2 -left-4 w-4 h-px bg-slate-300"></div>
                  <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-amber-50/30">
                    <span className="font-bold text-slate-900 text-sm truncate">TBD</span>
                    <span className="font-black text-amber-600">-</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50/30">
                    <span className="font-bold text-slate-900 text-sm truncate">TBD</span>
                    <span className="font-black text-amber-600">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500">
            Sơ đồ thi đấu sẽ được tạo sau khi vòng bảng kết thúc.
          </div>
        )}
      </div>
    </div>
  );
}
