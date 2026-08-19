"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { FormEventHandler, KeyboardEventHandler, RefObject } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { CommunityMemberRecord } from "@/features/communities/api";
import { cn } from "@/utils/cn";
import CommunityAvatar from "./CommunityAvatar";

interface CommunityPostComposerProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  contentRegistration: UseFormRegisterReturn<"content">;
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
  isPollOpen: boolean;
  onTogglePoll: () => void;
  pollQuestion: string;
  onChangePollQuestion: (val: string) => void;
  pollOptions: string[];
  onChangePollOption: (index: number, val: string) => void;
  onAddPollOptionField: () => void;
  onRemovePollOptionField: (index: number) => void;
  pollAllowMultiple: boolean;
  onTogglePollAllowMultiple: () => void;
  pollAllowAddOptions: boolean;
  onTogglePollAllowAddOptions: () => void;
  pollExpiresInDays: number | null;
  onChangePollExpiresInDays: (days: number | null) => void;
}

export default function CommunityPostComposer({
  onSubmit,
  contentRegistration,
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
  isPollOpen,
  onTogglePoll,
  pollQuestion,
  onChangePollQuestion,
  pollOptions,
  onChangePollOption,
  onAddPollOptionField,
  onRemovePollOptionField,
  pollAllowMultiple,
  onTogglePollAllowMultiple,
  pollAllowAddOptions,
  onTogglePollAllowAddOptions,
  pollExpiresInDays,
  onChangePollExpiresInDays,
}: CommunityPostComposerProps) {
  const translate = useTranslations('Common');
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
    >
      <div className="text-sm font-bold text-slate-800">{translate('communityPostComposerHeading')}</div>

      <div className="relative">
        <textarea
          {...contentRegistration}
          ref={(element) => {
            contentRegistration.ref(element);
            composerRef.current = element;
          }}
          onKeyDown={onComposerKeyDown}
          placeholder="{translate('communityPostComposerPlaceholder')}"
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
        />

        {mentionQuery !== null && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {suggestions.map((item, index) => {
              const active = index === mentionIndex;
              return (
                <div
                  key={item.member.id}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-xs transition",
                    active ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-slate-50",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelectMention(item);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CommunityAvatar
                      name={item.user.fullName}
                      src={item.user.avatarUrl}
                      size={32}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {item.user.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.member.role === "OWNER"
                          ? translate('communityRoleOwner')
                          : item.member.role === "MODERATOR"
                            ? translate('communityRoleAdmin')
                            : translate('member')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contentError && (
        <div className="mt-1 text-xs text-rose-500">{contentError}</div>
      )}

      {isPollOpen && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              📊 {translate('communityCreatePoll')}
            </span>
            <button
              type="button"
              onClick={onTogglePoll}
              className="text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
            >
              {translate('communityPollCancel')}
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {translate('communityPollQuestion')}
            </label>
            <input
              type="text"
              placeholder={translate('communityPollQuestionPlaceholder')}
              value={pollQuestion}
              onChange={(e) => onChangePollQuestion(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 block">
              {translate('communityPollOptions')}
            </label>
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 w-4 text-center">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={translate('communityPollOptionPlaceholder', { index: idx + 1 })}
                  value={opt}
                  onChange={(e) => onChangePollOption(idx, e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemovePollOptionField(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            {pollOptions.length < 10 && (
              <button
                type="button"
                onClick={onAddPollOptionField}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-1"
              >
                + {translate('communityPollAddOption')}
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-blue-100 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={onTogglePollAllowMultiple}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{translate('communityPollMultipleAnswers')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollAllowAddOptions}
                  onChange={onTogglePollAllowAddOptions}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{translate('communityPollAllowNewOptions')}</span>
              </label>
            </div>

            {/* Poll Expiration Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">{translate('communityPollExpiry')}</span>
              <select
                value={pollExpiresInDays ?? ''}
                onChange={(e) => onChangePollExpiresInDays(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">{translate('communityPollNoExpiry')}</option>
                <option value="1">{translate('communityPollDays', { count: 1 })}</option>
                <option value="3">{translate('communityPollDays', { count: 3 })}</option>
                <option value="7">{translate('communityPollDays', { count: 7 })}</option>
                <option value="14">{translate('communityPollDays', { count: 14 })}</option>
                <option value="30">{translate('communityPollDays', { count: 30 })}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {previewUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2.5">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative group">
              <Image
                src={url}
                alt={translate('communityPreviewImageAlt', { index: index + 1 })}
                width={96}
                height={72}
                unoptimized
                className="h-18 w-24 rounded-lg object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                aria-label={translate('communityRemoveImageAria', { index: index + 1 })}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
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
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition cursor-pointer"
          >
            <ImagePlus className="h-4 w-4 text-blue-600" />
            {translate('communityAttachImage')}
          </button>

          <button
            type="button"
            onClick={onTogglePoll}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer",
              isPollOpen
                ? "bg-blue-100/70 text-blue-700 font-bold"
                : "text-slate-700 hover:bg-slate-100 hover:text-blue-700"
            )}
          >
            <span>📊</span>
            {translate('communityCreatePoll')}
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
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition cursor-pointer"
          >
            <span className="font-bold text-blue-600">@</span>
            {translate('communityMentionMember')}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {translate('communityPublishPost')}
        </button>
      </div>
    </form>
  );
}
