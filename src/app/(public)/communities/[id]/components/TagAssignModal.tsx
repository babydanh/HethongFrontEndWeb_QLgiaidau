"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, Tag } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { getCommunityTagDisplayName } from './tag-display';

const MAX_TAGS = 3;
const MAX_TAG_LENGTH = 15;
// Khớp backend UpdateMemberTagsDto: chữ/số/khoảng trắng/_/-, không emoji/ký tự đặc biệt.
const TAG_PATTERN = /^[\p{L}\p{N} _-]+$/u;


interface TagAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string;
  currentTags?: string[];
  presets?: Array<{ name: string; color: string }>;
  isSaving?: boolean;
  onSave: (tags: string[]) => void;
}

/**
 * P2C.4 — Modal gán tag BQT cho thành viên (OWNER/MODERATOR).
 * Replace toàn bộ tag khi lưu; mảng rỗng = xoá hết. Tối đa 3 tag, mỗi tag ≤ 15 ký tự.
 */
export default function TagAssignModal({
  open,
  onOpenChange,
  memberName,
  currentTags = [],
  presets,
  isSaving = false,
  onSave,
}: TagAssignModalProps) {
  const translate = useTranslations('Common');
  const defaultPresets = [
    { name: translate('tagSuggestionFunny'), color: '#E2E8F0' },
    { name: translate('tagSuggestionGoodMatch'), color: '#E2E8F0' },
    { name: translate('tagSuggestionWeeklyMvp'), color: '#E2E8F0' },
    { name: translate('tagSuggestionRising'), color: '#E2E8F0' },
    { name: translate('tagSuggestionToughMatch'), color: '#E2E8F0' },
  ];
  const availablePresets = presets?.length ? presets : defaultPresets;
  const [tags, setTags] = useState<string[]>(currentTags);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset state mỗi khi modal mở — pattern "adjust state during render"
  // (tránh setState trong effect — react-hooks/set-state-in-effect).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTags(currentTags);
      setInput("");
      setError(null);
    }
  }

  const addTag = () => {
    const value = input.trim();
    if (!value) return;

    if (tags.length >= MAX_TAGS) {
      setError(translate('tagMaxCountError', { count: MAX_TAGS }));
      return;
    }
    if (value.length > MAX_TAG_LENGTH) {
      setError(translate('tagMaxLengthError', { count: MAX_TAG_LENGTH }));
      return;
    }
    if (!TAG_PATTERN.test(value)) {
      setError(
        translate('tagInvalidCharactersError'),
      );
      return;
    }
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setError(translate('tagExistsError'));
      return;
    }

    setTags((prev) => [...prev, value]);
    setInput("");
    setError(null);
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setError(null);
  };

  const handleSave = () => {
    onSave(tags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md rounded-lg border border-slate-200">
        <ModalHeader className="text-left">
          <ModalTitle className="flex items-center gap-2 text-base text-slate-900">
            <Tag className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
            {translate('assignTagModalTitle')}
          </ModalTitle>
          <ModalDescription>
            {memberName ? translate('assigningTagTo', { name: memberName }) : ''}
            {translate('tagDescription', { count: MAX_TAGS })}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-2">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {getCommunityTagDisplayName(tag, translate)}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={isSaving}
                    aria-label={translate('tagRemoveAria', { tag: getCommunityTagDisplayName(tag, translate) })}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {translate('noTagsDescription')}
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSaving || tags.length >= MAX_TAGS}
              maxLength={MAX_TAG_LENGTH}
              placeholder={
                tags.length >= MAX_TAGS
                  ? translate('maxTagsReached', { count: MAX_TAGS })
                  : translate('newTagPlaceholder')
              }
              className={cn(
                "flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "disabled:bg-slate-50 disabled:text-slate-400",
              )}
            />
            <Button
              type="button"
              size="sm"
              onClick={addTag}
              disabled={isSaving || !input.trim() || tags.length >= MAX_TAGS}
              className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} />
              {translate('addTagAction')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {availablePresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setInput(preset.name);
                  setError(null);
                }}
                disabled={isSaving || tags.length >= MAX_TAGS}
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                style={{ backgroundColor: `${preset.color}26`, borderColor: `${preset.color}66` }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : (
            <p className="text-xs text-slate-400">
              {translate('tagsUsed', { used: tags.length, count: MAX_TAGS })}
            </p>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs"
          >
            {translate('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
          >
            {isSaving ? translate('saving') : translate('saveTagAction')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
