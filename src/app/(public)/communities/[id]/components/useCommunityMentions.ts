import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  communitiesApi,
  type CommunityMemberRecord,
} from "@/features/communities/api";

export interface MentionEntry {
  userId: string;
  displayName: string;
}
interface UseCommunityMentionsOptions {
  communityId: string;
  content: string;
  setContent: (value: string) => void;
  maxMentions?: number;
  onLimitReached?: () => void;
  onAmbiguousName?: () => void;
}

interface ActiveMention {
  start: number;
  end: number;
  query: string;
}

function findActiveMention(
  content: string,
  caret: number,
): ActiveMention | null {
  const safeCaret = Math.min(Math.max(caret, 0), content.length);
  const beforeCaret = content.slice(0, safeCaret);
  const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);
  if (!match) return null;
  return {
    start: beforeCaret.lastIndexOf("@"),
    end: safeCaret,
    query: match[1] ?? "",
  };
}

function hasMentionToken(content: string, displayName: string): boolean {
  const escapedName = displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)@${escapedName}(?=\\s|[.,!?;:)]|$)`, "iu").test(
    content,
  );
}

export function useCommunityMentions({
  communityId,
  content,
  setContent,
  maxMentions = 20,
  onLimitReached,
  onAmbiguousName,
}: UseCommunityMentionsOptions) {
  const [members, setMembers] = useState<CommunityMemberRecord[]>([]);
  const [entries, setEntries] = useState<MentionEntry[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sequence = useRef(0);
  const skipNextContentEffect = useRef(false);

  useEffect(() => {
    if (skipNextContentEffect.current) {
      skipNextContentEffect.current = false;
      sequence.current += 1;
      return;
    }
    const activeMention = findActiveMention(
      content,
      textareaRef.current?.selectionStart ?? content.length,
    );
    if (!activeMention) {
      sequence.current += 1;
      const timer = window.setTimeout(() => {
        setQuery(null);
        setActiveIndex(0);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const search = activeMention.query;
    const requestId = ++sequence.current;
    const timer = window.setTimeout(() => {
      setQuery(search);
      setActiveIndex(0);
      void communitiesApi
        .getMembers(communityId, { mentionable: true, search, limit: 20 })
        .then((response) => {
          if (requestId === sequence.current) setMembers(response.data ?? []);
        })
        .catch(() => {
          if (requestId === sequence.current) setMembers([]);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      sequence.current += 1;
    };
  }, [communityId, content]);

  const suggestions = useMemo(
    () => (query === null ? [] : members.slice(0, 8)),
    [members, query],
  );
  const select = (member: CommunityMemberRecord) => {
    const displayName = member.user?.fullName?.trim();
    const userId = member.user?.id ?? member.member?.userId;
    if (!displayName || !userId) return;
    if (
      !entries.some((entry) => entry.userId === userId) &&
      entries.length >= maxMentions
    ) {
      onLimitReached?.();
      return;
    }
    if (
      entries.some(
        (entry) =>
          entry.userId !== userId &&
          entry.displayName.localeCompare(displayName, "vi", {
            sensitivity: "accent",
          }) === 0,
      )
    ) {
      onAmbiguousName?.();
      return;
    }
    const activeMention = findActiveMention(
      content,
      textareaRef.current?.selectionStart ?? content.length,
    );
    if (!activeMention) return;
    const replacement = `@${displayName} `;
    const nextContent = `${content.slice(0, activeMention.start)}${replacement}${content.slice(activeMention.end)}`;
    const nextCaret = activeMention.start + replacement.length;
    skipNextContentEffect.current = true;
    setContent(nextContent);
    setEntries((current) =>
      current.some((entry) => entry.userId === userId)
        ? current
        : [...current, { userId, displayName }],
    );
    setQuery(null);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (query === null || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      select(suggestions[activeIndex] ?? suggestions[0]);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery(null);
    }
  };
  const validIds = entries
    .filter((entry) => hasMentionToken(content, entry.displayName))
    .map((entry) => entry.userId);
  return {
    members,
    entries,
    setEntries,
    query,
    suggestions,
    activeIndex,
    textareaRef,
    select,
    onKeyDown,
    validIds,
  };
}
