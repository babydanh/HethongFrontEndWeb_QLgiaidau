"use client";

import Image from "next/image";
import type { FormEventHandler, KeyboardEventHandler, RefObject } from "react";
import { ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { CommunityMemberRecord } from "@/features/communities/api";
import { cn } from "@/utils/cn";
import CommunityAvatar from "./CommunityAvatar";

interface CommunityPostComposerProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  contentRegistration: UseFormRegisterReturn<"content">;
  topicsRegistration: UseFormRegisterReturn<"topics">;
  contentError?: string;
  isSubmitting: boolean;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onComposerKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  mentionQuery: string | null;
  suggestions: CommunityMemberRecord[];
  mentionIndex: number;
  onSelectMention: (member: CommunityMemberRecord) => void;
  canManageTags: boolean;
  onManageTags: (member: CommunityMemberRecord) => void;
  previewUrls: string[];
  onRemoveImage: (index: number) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
}

export default function CommunityPostComposer({
  onSubmit,
  contentRegistration,
  topicsRegistration,
  contentError,
  isSubmitting,
  composerRef,
  onComposerKeyDown,
  mentionQuery,
  suggestions,
  mentionIndex,
  onSelectMention,
  canManageTags,
  onManageTags,
  previewUrls,
  onRemoveImage,
  fileInputRef,
  onFilesSelected,
}: CommunityPostComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        Chia sẻ cùng câu lạc bộ
      </div>

      <div className="relative">
        <textarea
          {...contentRegistration}
          ref={(element) => {
            contentRegistration.ref(element);
            composerRef.current = element;
          }}
          onKeyDown={onComposerKeyDown}
          placeholder="Bạn đang nghĩ gì về trận đấu hôm nay? Gõ @ để nhắc thành viên"
          className="mt-4 min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          disabled={isSubmitting}
        />

        {mentionQuery !== null && suggestions.length > 0 && (
          <div
            role="listbox"
            aria-label="Gợi ý thành viên"
            className="absolute left-2 right-2 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
          >
            {suggestions.map((member, index) => (
              <div
                key={member.user?.id ?? member.member?.userId}
                role="option"
                aria-selected={index === mentionIndex}
                onMouseDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  onSelectMention(member);
                }}
                onContextMenu={(event) => {
                  if (!canManageTags) return;
                  event.preventDefault();
                  onManageTags(member);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2",
                  index === mentionIndex
                    ? "bg-emerald-50"
                    : "hover:bg-slate-50",
                )}
              >
                <CommunityAvatar
                  src={member.user?.avatarUrl}
                  name={member.user?.fullName ?? "M"}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">
                    {member.user?.fullName}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(member.member?.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {canManageTags && (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onManageTags(member);
                    }}
                    className="rounded border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Gán tag
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {contentError && (
        <p className="mt-1 text-xs text-rose-600">{contentError}</p>
      )}
      <input
        {...topicsRegistration}
        placeholder="#pickleball #giaoluu"
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
        disabled={isSubmitting}
      />

      {previewUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative">
              <Image
                src={url}
                alt="Ảnh xem trước"
                width={96}
                height={72}
                unoptimized
                className="h-18 w-24 rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                aria-label={`Xóa ảnh ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => onFilesSelected(event.target.files)}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600"
        >
          <ImagePlus className="h-4 w-4" />
          Thêm ảnh
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Đăng bài
        </button>
      </div>
    </form>
  );
}
