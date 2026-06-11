'use client';

import { Tournament } from '@/features/tournaments/api';

interface Props {
  tournament: Tournament;
}

export default function OverviewTab({ tournament }: Props) {
  const description = tournament.description || tournament.parent?.description;
  return (
    <div className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed editorjs-content-view">
      {description ? (
        <div dangerouslySetInnerHTML={{ __html: description }} />
      ) : (
        <p className="italic text-slate-400 text-center">
          Ban tổ chức chưa cập nhật thông tin giới thiệu cho giải đấu này.
        </p>
      )}
    </div>
  );
}
