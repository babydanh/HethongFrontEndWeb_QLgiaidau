'use client';

import { Tournament } from '@/features/tournaments/api';

interface Props {
  tournament: Tournament;
}

export default function OverviewTab({ tournament }: Props) {
  const description = tournament.description || tournament.parent?.description;
  const prizeDescription = tournament.prizeDescription;

  return (
    <div className="space-y-8">
      <section className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed editorjs-content-view">
        {description ? (
          <div dangerouslySetInnerHTML={{ __html: description }} />
        ) : (
          <p className="italic text-slate-400 text-center">
            Ban tổ chức chưa cập nhật thông tin giới thiệu cho giải đấu này.
          </p>
        )}
      </section>

      <section className="border-t border-slate-100 pt-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-900">
          Giải thưởng
        </h3>
        <div className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed editorjs-content-view">
          {prizeDescription ? (
            <div dangerouslySetInnerHTML={{ __html: prizeDescription }} />
          ) : (
            <p className="italic text-slate-400">
              Ban tổ chức chưa cập nhật cơ cấu giải thưởng cho giải đấu này.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
