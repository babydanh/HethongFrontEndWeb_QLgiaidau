'use client';

import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 24;
// Khớp backend UpdateMemberTagsDto: chữ/số/khoảng trắng/_/-, không emoji/ký tự đặc biệt.
const TAG_PATTERN = /^[\p{L}\p{N} _-]+$/u;

interface TagAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string;
  currentTags?: string[];
  isSaving?: boolean;
  onSave: (tags: string[]) => void;
}

/**
 * P2C.4 — Modal gán tag BQT cho thành viên (OWNER/MODERATOR).
 * Replace toàn bộ tag khi lưu; mảng rỗng = xoá hết. Tối đa 5 tag, mỗi tag ≤ 24 ký tự.
 */
export default function TagAssignModal({
  open,
  onOpenChange,
  memberName,
  currentTags = [],
  isSaving = false,
  onSave,
}: TagAssignModalProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state mỗi khi modal mở — pattern "adjust state during render"
  // (tránh setState trong effect — react-hooks/set-state-in-effect).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTags(currentTags);
      setInput('');
      setError(null);
    }
  }

  const addTag = () => {
    const value = input.trim();
    if (!value) return;

    if (tags.length >= MAX_TAGS) {
      setError(`Tối đa ${MAX_TAGS} tag cho mỗi thành viên.`);
      return;
    }
    if (value.length > MAX_TAG_LENGTH) {
      setError(`Mỗi tag tối đa ${MAX_TAG_LENGTH} ký tự.`);
      return;
    }
    if (!TAG_PATTERN.test(value)) {
      setError('Tag chỉ được chứa chữ cái, số, khoảng trắng, gạch dưới (_) và gạch ngang (-).');
      return;
    }
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setError('Tag này đã tồn tại.');
      return;
    }

    setTags((prev) => [...prev, value]);
    setInput('');
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
    if (e.key === 'Enter') {
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
            Gán tag cho thành viên
          </ModalTitle>
          <ModalDescription>
            {memberName ? `Đang gán tag cho "${memberName}". ` : ''}
            Tag hiển thị cạnh tên trong danh sách thành viên (tối đa {MAX_TAGS} tag).
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
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={isSaving}
                    aria-label={`Xoá tag ${tag}`}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Chưa có tag nào. Thêm tag bên dưới để bắt đầu.</p>
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
              maxLength={MAX_TAG_LENGTH + 8}
              placeholder={
                tags.length >= MAX_TAGS
                  ? `Đã đạt tối đa ${MAX_TAGS} tag`
                  : 'Nhập tag mới...'
              }
              className={cn(
                'flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all',
                'focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                'disabled:bg-slate-50 disabled:text-slate-400'
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
              Thêm
            </Button>
          </div>

          {error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : (
            <p className="text-xs text-slate-400">
              Đã dùng {tags.length}/{MAX_TAGS} tag.
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
            Hủy bỏ
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu tag'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
