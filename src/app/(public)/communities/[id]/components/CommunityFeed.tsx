"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  communitiesApi,
  type CommunityMemberRecord,
} from "@/features/communities/api";
import { uploadApi } from "@/features/upload/api";
import { useAuthStore } from "@/lib/zustand/authStore";
import type { CommunityPost } from "@/types/community-social";
import { getErrorMessage } from "@/utils/error";
import {
  CommunityFeedEmpty,
  CommunityFeedError,
  CommunityFeedSkeleton,
} from "./CommunityFeedStates";
import CommunityPostComposer from "./CommunityPostComposer";
import CommunityPostList from "./CommunityPostList";
import TagAssignModal from "./TagAssignModal";
import { useCommunityMentions } from "./useCommunityMentions";

const postSchema = z.object({
  content: z
    .string()
    .trim()
    .max(5000, "Bài viết tối đa 5000 ký tự.")
    .optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

interface CommunityFeedProps {
  communityId: string;
  canManageTags?: boolean;
}

export default function CommunityFeed({
  communityId,
  canManageTags = false,
}: CommunityFeedProps) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [tagTarget, setTagTarget] = useState<CommunityMemberRecord | null>(
    null,
  );
  const [isTagSaving, setIsTagSaving] = useState(false);

  // Poll state
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(true);
  const [pollAllowAddOptions, setPollAllowAddOptions] = useState(true);
  const [pollExpiresInDays, setPollExpiresInDays] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "" },
  });
  const content = useWatch({ control, name: "content" }) ?? "";
  const contentRegistration = register("content");
  const {
    setEntries: setMentionEntries,
    query: mentionQuery,
    suggestions,
    activeIndex: mentionIndex,
    textareaRef: composerRef,
    select: selectMention,
    onKeyDown: handleComposerKeyDown,
    validIds,
  } = useCommunityMentions({
    communityId,
    content,
    setContent: (value) => setValue("content", value, { shouldDirty: true }),
    onLimitReached: () =>
      toast.error("Bạn chỉ có thể nhắc tối đa 20 thành viên."),
    onAmbiguousName: () =>
      toast.error(
        "CLB có hai thành viên trùng tên. Không thể gắn cả hai trong cùng một bài.",
      ),
  });

  const loadPosts = useCallback(
    async (cursor?: string) => {
      if (cursor) setIsLoadingMore(true);
      else setIsLoading(true);
      try {
        const response = await communitiesApi.getPosts(communityId, {
          cursor,
          limit: 10,
          sort: "LATEST",
        });
        const page = response.data;
        setPosts((current) => {
          const rows = cursor ? [...current, ...page.items] : page.items;
          return Array.from(
            new Map(rows.map((item) => [item.id, item])).values(),
          );
        });
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setErrorMessage(null);
      } catch (error: unknown) {
        if (!cursor) {
          setErrorMessage(getErrorMessage(error, "Feed chưa sẵn sàng."));
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [communityId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPosts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  // Auto scroll to target post if hash matches #post-[id] or query ?postId=[id]
  useEffect(() => {
    if (isLoading || posts.length === 0) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetPostId = params?.get('postId') || (hash.startsWith('#post-') ? hash.replace('#post-', '') : null);
    if (targetPostId) {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isLoading, posts]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const onFilesSelected = (files: FileList | null) => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const nextFiles = Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 10);
    setSelectedFiles(nextFiles);
    setPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index: number) => {
    const removedUrl = previewUrls[index];
    if (removedUrl) URL.revokeObjectURL(removedUrl);
    setSelectedFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setPreviewUrls((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const onSubmit = async (values: PostFormValues) => {
    try {
      const imageUrls = await Promise.all(
        selectedFiles.map((file) =>
          uploadApi.uploadImage(file).then((result) => result.url),
        ),
      );

      const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      let expiresAt: string | undefined;
      if (pollExpiresInDays && pollExpiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + pollExpiresInDays);
        expiresAt = d.toISOString();
      }

      const pollPayload = isPollOpen && pollQuestion.trim() && validPollOptions.length >= 2
        ? {
            question: pollQuestion.trim(),
            options: validPollOptions,
            allowMultipleAnswers: pollAllowMultiple,
            allowAddOptions: pollAllowAddOptions,
            expiresAt,
          }
        : undefined;

      const response = await communitiesApi.createPost(
        communityId,
        {
          content: values.content?.trim() ?? "",
          imageUrls,
          topics: [],
          mentions: validIds,
          poll: pollPayload,
        },
        crypto.randomUUID(),
      );
      const postWithAuthor = {
        ...response.data,
        author: response.data.author?.fullName && response.data.author.fullName !== "Thành viên CLB"
          ? response.data.author
          : {
              id: user?.id || response.data.author.id,
              fullName: user?.fullName || response.data.author.fullName,
              avatarUrl: user?.avatarUrl || response.data.author.avatarUrl,
            },
      };
      setPosts((current) => [
        postWithAuthor,
        ...current.filter((post) => post.id !== postWithAuthor.id),
      ]);
      reset();
      setSelectedFiles([]);
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setMentionEntries([]);

      // Reset poll
      setIsPollOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollAllowMultiple(true);
      setPollAllowAddOptions(true);
      setPollExpiresInDays(null);

      toast.success(
        response.data.status === "PENDING"
          ? "Bài viết đang chờ duyệt."
          : "Đã đăng lên câu lạc bộ.",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể đăng bài lúc này."));
    }
  };

  const saveTags = async (tags: string[]) => {
    if (!tagTarget?.user?.id || !canManageTags) return;
    setIsTagSaving(true);
    try {
      await communitiesApi.updateMemberTags(
        communityId,
        tagTarget.user.id,
        tags,
      );
      setTagTarget(null);
      toast.success("Đã cập nhật tag thành viên.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể cập nhật tag."));
    } finally {
      setIsTagSaving(false);
    }
  };

  return (
    <>
      <section className="space-y-5">
        <CommunityPostComposer
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          contentRegistration={contentRegistration}
          contentError={errors.content?.message}
          isSubmitting={isSubmitting}
          composerRef={composerRef}
          onComposerKeyDown={handleComposerKeyDown}
          mentionQuery={mentionQuery}
          suggestions={suggestions}
          mentionIndex={mentionIndex}
          onSelectMention={selectMention}
          canManageTags={canManageTags}
          onManageTags={setTagTarget}
          previewUrls={previewUrls}
          onRemoveImage={removeImage}
          fileInputRef={fileInputRef}
          onFilesSelected={onFilesSelected}
          isPollOpen={isPollOpen}
          onTogglePoll={() => setIsPollOpen((prev) => !prev)}
          pollQuestion={pollQuestion}
          onChangePollQuestion={setPollQuestion}
          pollOptions={pollOptions}
          onChangePollOption={(index, val) => {
            setPollOptions((prev) => {
              const next = [...prev];
              next[index] = val;
              return next;
            });
          }}
          onAddPollOptionField={() => setPollOptions((prev) => [...prev, ""])}
          onRemovePollOptionField={(index) => {
            setPollOptions((prev) => prev.filter((_, i) => i !== index));
          }}
          pollAllowMultiple={pollAllowMultiple}
          onTogglePollAllowMultiple={() => setPollAllowMultiple((prev) => !prev)}
          pollAllowAddOptions={pollAllowAddOptions}
          onTogglePollAllowAddOptions={() => setPollAllowAddOptions((prev) => !prev)}
          pollExpiresInDays={pollExpiresInDays}
          onChangePollExpiresInDays={setPollExpiresInDays}
        />

        {isLoading ? (
          <CommunityFeedSkeleton />
        ) : errorMessage ? (
          <CommunityFeedError
            message={errorMessage}
            onRetry={() => void loadPosts()}
          />
        ) : posts.length === 0 ? (
          <CommunityFeedEmpty />
        ) : (
          <CommunityPostList
            communityId={communityId}
            posts={posts}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => void loadPosts(nextCursor ?? undefined)}
            onReactionUpdated={(postId, reactionType, count) =>
              setPosts((current) =>
                current.map((post) =>
                  post.id === postId
                    ? {
                        ...post,
                        viewerReaction: reactionType,
                        reactionCount: count,
                      }
                    : post,
                ),
              )
            }
            onCommentUpdated={(postId, newCount) =>
              setPosts((current) =>
                current.map((post) =>
                  post.id === postId
                    ? { ...post, commentCount: newCount }
                    : post,
                ),
              )
            }
            canManage={canManageTags}
            onDeletePost={(deletedPostId) =>
              setPosts((current) =>
                current.filter((post) => post.id !== deletedPostId),
              )
            }
          />
        )}
      </section>
      <TagAssignModal
        open={tagTarget !== null}
        onOpenChange={(open) => {
          if (!open) setTagTarget(null);
        }}
        memberName={tagTarget?.user?.fullName}
        currentTags={tagTarget?.member?.tags ?? []}
        isSaving={isTagSaving}
        onSave={(tags) => void saveTags(tags)}
      />
    </>
  );
}
