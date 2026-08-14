"use client";

import Image from "next/image";
import type { FormEventHandler, KeyboardEventHandler, RefObject } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { CommunityMemberRecord } from "@/features/communities/api";
import { cn } from "@/utils/cn";
import CommunityAvatar from "./CommunityAvatar";

interface CommunityPostComposerProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  contentRegistration: UseFormRegisterReturn<"content">;
  topicsRegistration: UseFormRegisterReturn<"topics">;
  topicsValue: string;
  onTopicsChange: (value: string) => void;
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
  topicsValue,
  onTopicsChange,
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
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
    >
      <div className="text-sm font-bold text-slate-800">Chia sẻ cùng câu lạc bộ</div>

      <div className="relative">
        <textarea
          {...contentRegistration}
          ref={(element) => {
            contentRegistration.ref(element);
            composerRef.current = element;
          }}
          onKeyDown={onComposerKeyDown}
          placeholder="Bạn đang nghĩ gì về trận đấu hôm nay? Gõ @ để nhắc thành viên"
          className="mt-4 min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-800 placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
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

      {/* Gợi ý chủ đề nhanh (Topic Chips) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-600 mr-1">Chủ đề:</span>
        {["GiaoLuu", "TimDoiThu", "GiaiDau", "ChiaSeKyThuat", "ThongBao"].map((chip) => {
          const isSelected = (topicsValue || "").includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => {
                const current = (topicsValue || "")
                  .split(/[\s,]+/)
                  .map((t: string) => t.replace(/^#/, "").trim())
                  .filter(Boolean);
                const next = current.includes(chip)
                  ? current.filter((t: string) => t !== chip)
                  : [...current, chip].slice(0, 4);
                onTopicsChange(next.map((t: string) => `#${t}`).join(" "));
              }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all select-none",
                isSelected
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60",
              )}
            >
              #{chip}
            </button>
          );
        })}
      </div>

      {previewUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt="Ảnh xem trước"
                width={96}
                height={72}
                unoptimized
                className="h-18 w-24 rounded-lg object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                aria-label={`Xóa ảnh ${index + 1}`}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700 transition"
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
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition"
          >
            <ImagePlus className="h-4 w-4 text-emerald-600" />
            Đính kèm ảnh
          </button>

          <button
            type="button"
            onClick={() => {
              if (composerRef.current) {
                const el = composerRef.current;
                const pos = el.selectionStart || el.value.length;
                const nextVal = el.value.slice(0, pos) + "@" + el.value.slice(pos);
                contentRegistration.onChange({ target: { value: nextVal } });
                el.focus();
                setTimeout(() => el.setSelectionRange(pos + 1, pos + 1), 0);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span className="font-bold text-blue-600">@</span>
            Nhắc thành viên
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
