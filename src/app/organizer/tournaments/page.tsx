"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  tournamentsApi,
  OrganizerTournamentDivisionPreview,
  OrganizerTournamentListItem,
} from "@/features/tournaments/api";
import { isClubLiteTournament } from "@/features/tournaments/lite-qr";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Plus,
  Eye,
  Settings,
  Trash2,
  RotateCw,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/utils/error";
import { Tournament } from "@/types/tournament";
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
} from "@/utils/tournament-status";
import { BRAND } from "@/constants/brand";
import TournamentBannerCover from "@/components/ui/TournamentBannerCover";
import { useAuthStore } from "@/lib/zustand/authStore";
import { OrganizerVerificationBanner } from "@/components/organizer/OrganizerVerificationBanner";

interface ParentWithDivisions {
  id: string;
  name: string;
  createdAt?: string | null;
  description?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  communityId?: string | null;
  isLite?: boolean;
  tournamentConfig?: Tournament["tournamentConfig"];
  divisions: Tournament[];
  isStandalone?: boolean;
  status?: Tournament["status"];
}

type OrganizerTournamentFilter = "ALL" | "COMPLETED";

const ORGANIZER_TOURNAMENT_PAGE_SIZE = 9;

const getFormatLabel = (
  matchType: string,
  genderRestriction?: string | null,
  translate?: (key: string) => string,
) => {
  const mt = matchType || "";
  const gr = genderRestriction || "";
  if (mt === "SINGLES") {
    return gr === "FEMALE"
      ? (translate?.("formatSinglesWomen") ?? "Women’s singles")
      : (translate?.("formatSinglesMen") ?? "Men’s singles");
  }
  if (mt === "DOUBLES") {
    return gr === "FEMALE"
      ? (translate?.("formatDoublesWomen") ?? "Women’s doubles")
      : (translate?.("formatDoublesMen") ?? "Men’s doubles");
  }
  if (mt === "MIXED_DOUBLES" || mt === "MIXED" || gr === "MIXED") {
    return translate?.("formatMixedDoubles") ?? "Mixed doubles";
  }
  return mt;
};

const normalizeCardDivision = (
  division: unknown,
  tournament: Tournament,
): Tournament => {
  const source = division as Partial<Tournament> &
    Partial<OrganizerTournamentDivisionPreview>;
  const bracketType =
    source.bracketType || source.tournamentConfig?.bracketType;
  const inheritedConfig =
    source.tournamentConfig || tournament.tournamentConfig || {};

  return {
    ...source,
    tournamentConfig: {
      ...inheritedConfig,
      bracketType: bracketType || undefined,
      roundConfig: source.roundConfig || undefined,
    },
    format: source.format || bracketType || "",
    currency: source.currency || tournament.currency || "VND",
    organizerId: source.organizerId || tournament.organizerId || "",
  } as Tournament;
};

const TournamentCardSkeleton = () => (
  <div
    className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    aria-hidden="true"
  >
    <div className="h-44 animate-pulse bg-slate-200" />
    <div className="space-y-4 p-4 md:p-5">
      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="flex gap-2">
        <div className="h-7 w-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-7 w-20 animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
    <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-3 md:p-4">
      <div className="h-10 flex-1 animate-pulse rounded bg-slate-200" />
      <div className="h-10 flex-1 animate-pulse rounded bg-slate-200" />
    </div>
  </div>
);

export default function MyTournamentsPage() {
  const router = useRouter();
  const translate = useTranslations("OrganizerTournaments");
  const locale = useLocale();
  const [parents, setParents] = useState<ParentWithDivisions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [filter, setFilter] = useState<OrganizerTournamentFilter>("ALL");
  const parentsRef = useRef<ParentWithDivisions[]>([]);
  const listRequestRef = useRef<Promise<void> | null>(null);
  const requestGenerationRef = useRef(0);

  const fetchTournaments = useCallback(
    async (pageToLoad: number) => {
      if (listRequestRef.current) return listRequestRef.current;

      const requestGeneration = requestGenerationRef.current;

      const request = (async () => {
        try {
          setIsLoading(true);
          setHasLoadError(false);

          const response = await tournamentsApi.getMyManagementTournaments({
            limit: ORGANIZER_TOURNAMENT_PAGE_SIZE,
            offset: (pageToLoad - 1) * ORGANIZER_TOURNAMENT_PAGE_SIZE,
            ...(filter === "COMPLETED" ? { status: "COMPLETED" } : {}),
          });
          const pageItems = response.data ?? [];
          const loadedParents: ParentWithDivisions[] = pageItems.map(
            (item: OrganizerTournamentListItem) => {
              if (item.itemType === "PARENT") {
                const childDivisions = Array.isArray(item.divisions)
                  ? item.divisions.map((division) =>
                      normalizeCardDivision(
                        division as unknown as OrganizerTournamentDivisionPreview,
                        division as Tournament,
                      ),
                    )
                  : [];
                return {
                  ...item,
                  divisions: childDivisions,
                  isStandalone: false,
                } as ParentWithDivisions;
              }

              const tournament = item as Tournament & {
                divisions?: OrganizerTournamentDivisionPreview[];
              };
              const rawDivisions =
                Array.isArray(tournament.divisions) &&
                tournament.divisions.length > 0
                  ? tournament.divisions
                  : [tournament];
              const divisions = rawDivisions.map((division) =>
                normalizeCardDivision(division, tournament),
              );

              return {
                ...tournament,
                divisions,
                isStandalone: true,
                status: tournament.status,
              } as ParentWithDivisions;
            },
          );

          // A filter change starts a new request generation. Never let a slower
          // response from the previous filter mix into the current list.
          if (requestGeneration !== requestGenerationRef.current) return;

          const sortedParents = loadedParents.sort((a, b) => {
            const aDate =
              a.createdAt ??
              a.divisions.find((division) => division.createdAt)?.createdAt;
            const bDate =
              b.createdAt ??
              b.divisions.find((division) => division.createdAt)?.createdAt;
            const aTime = aDate
              ? new Date(aDate).getTime()
              : Number.NEGATIVE_INFINITY;
            const bTime = bDate
              ? new Date(bDate).getTime()
              : Number.NEGATIVE_INFINITY;
            if (bTime !== aTime) return bTime - aTime;
            return b.id === a.id ? 0 : b.id > a.id ? 1 : -1;
          });
          parentsRef.current = sortedParents;
          setParents(sortedParents);
          setTotalCount(response.meta?.total ?? sortedParents.length);
          setTotalPages(
            Math.max(
              1,
              response.meta?.totalPages ??
                Math.ceil(
                  (response.meta?.total ?? sortedParents.length) /
                    ORGANIZER_TOURNAMENT_PAGE_SIZE,
                ),
            ),
          );
        } catch {
          // Keep the last successful cards visible during transient 429/network errors.
          if (requestGeneration === requestGenerationRef.current) {
            setHasLoadError(true);
            toast.error(translate("loadError"));
          }
        } finally {
          if (requestGeneration === requestGenerationRef.current) {
            setIsLoading(false);
          }
        }
      })();

      listRequestRef.current = request;
      try {
        await request;
      } finally {
        if (listRequestRef.current === request) listRequestRef.current = null;
      }
    },
    [filter, translate],
  );

  useEffect(() => {
    void fetchTournaments(page);
  }, [fetchTournaments, page]);

  const handlePageChange = (nextPage: number) => {
    if (isLoading || nextPage < 1 || nextPage > totalPages || nextPage === page)
      return;
    parentsRef.current = [];
    setParents([]);
    setPage(nextPage);
  };

  const handleFilterChange = (nextFilter: OrganizerTournamentFilter) => {
    if (nextFilter === filter) return;

    requestGenerationRef.current += 1;
    // Allow the new filter request to start immediately even if enrichment for
    // the previous filter is still in flight.
    listRequestRef.current = null;
    parentsRef.current = [];
    setFilter(nextFilter);
    setParents([]);
    setPage(1);
    setTotalPages(1);
    setTotalCount(0);
    setIsLoading(true);
  };

  const handleDeleteParent = async (
    id: string,
    isStandalone: boolean,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    if (!confirm(translate("deleteConfirm"))) return;
    try {
      let res;
      if (isStandalone) {
        res = await tournamentsApi.deleteTournament(id);
      } else {
        res = await tournamentsApi.deleteParentTournament(id);
      }

      // Check if delete is pending review
      const resData = res?.data as unknown as
        { pendingDelete?: boolean; message?: string } | undefined;
      if (resData?.pendingDelete) {
        toast.success(resData.message || translate("pendingDeleteSuccess"));
        void fetchTournaments(page);
      } else {
        setParents((current) => {
          const next = current.filter((p) => p.id !== id);
          parentsRef.current = next;
          return next;
        });
        toast.success(translate("deleteSuccess"));
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      // Hiện rõ lý do từ backend (vd: chưa hoàn tiền, đang chờ hoàn tiền)
      toast.error(msg || translate("deleteError"));
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "PENDING_DELETE") {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-slate-200">
          {translate("statusPendingDelete")}
        </Badge>
      );
    }

    return (
      <Badge className={getTournamentStatusClassName(status)}>
        {getTournamentStatusLabel(status, {
          DRAFT: translate("statusDraft"),
          PENDING_APPROVAL: translate("statusPendingApproval"),
          PENDING_DELETE: translate("statusPendingDelete"),
          UPCOMING: translate("statusUpcoming"),
          REGISTRATION_OPEN: translate("statusRegistrationOpen"),
          REGISTRATION_CLOSED: translate("statusRegistrationClosed"),
          IN_PROGRESS: translate("statusInProgress"),
          ONGOING: translate("statusInProgress"),
          COMPLETED: translate("statusCompleted"),
          CANCELLED: translate("statusCancelled"),
        })}
      </Badge>
    );
  };

  const user = useAuthStore((state) => state.user);

  if (isLoading && parents.length === 0) {
    return (
      <div
        className="min-h-screen bg-slate-50 py-8 px-3 md:py-12 md:px-8"
        aria-busy="true"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
            <div className="space-y-2">
              <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, index) => (
              <TournamentCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasLoadError && parents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-8 md:px-8 md:py-12">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-lg border border-rose-100 bg-white p-6 text-center shadow-sm md:p-12">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-500"
            aria-hidden="true"
          >
            !
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {translate("loadErrorTitle")}
          </h3>
          <p className="mt-2 max-w-sm font-medium text-slate-500">
            {translate("loadErrorDescription")}
          </p>
          <Button
            type="button"
            onClick={() => void fetchTournaments(page)}
            className="mt-6 bg-blue-600 px-6 text-white hover:bg-blue-700"
          >
            {translate("retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-3 md:py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Verification Status & Onboarding Banner */}
        <OrganizerVerificationBanner
          isEmailVerified={user?.isEmailVerified}
          email={user?.email}
        />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900">
              {translate("title")}
            </h1>
            <p className="text-slate-500 mt-1 text-xs md:text-sm font-medium">
              {translate("subtitle")}
            </p>
          </div>
          <Link href="/organizer/tournaments/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm shadow-md shadow-blue-500/20 h-auto">
              <Plus className="w-4 h-4 md:w-5 md:h-5" /> {translate("create")}
            </Button>
          </Link>
        </div>

        <div
          className="mb-6 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label={translate("filterLabel")}
        >
          {(
            [
              ["ALL", translate("filterAll")],
              ["COMPLETED", translate("filterCompleted")],
            ] as const
          ).map(([value, label]) => {
            const isSelected = filter === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleFilterChange(value)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {parents.length === 0 ? (
          <div className="bg-white rounded-lg p-6 md:p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center max-w-xl mx-auto">
            <div className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND.assets.logoIcon}
                alt={BRAND.name}
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900">
              {filter === "COMPLETED"
                ? translate("emptyCompletedTitle")
                : translate("emptyTitle")}
            </h3>
            <p className="text-slate-500 mt-2 font-medium max-w-sm">
              {filter === "COMPLETED"
                ? translate("emptyCompletedDescription")
                : translate("emptyDescription")}
            </p>
            {filter === "COMPLETED" ? (
              <Button
                type="button"
                onClick={() => handleFilterChange("ALL")}
                className="mt-6 bg-blue-600 px-6 text-white hover:bg-blue-700"
              >
                {translate("filterAll")}
              </Button>
            ) : (
              <Link href="/organizer/tournaments/create" className="mt-6">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  {translate("createFirst")}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parents.map((parent) => {
              const divisions = parent.divisions || [];
              const firstDivision = divisions[0];
              const participantCounts = divisions.map((div: Tournament) => {
                const summaryCount = div._summary?.participantCount;
                if (
                  typeof summaryCount === "number" &&
                  Number.isFinite(summaryCount)
                )
                  return summaryCount;
                const count = div._count?.participants;
                return typeof count === "number" && Number.isFinite(count)
                  ? count
                  : null;
              });
              const totalParticipants = participantCounts.some(
                (count) => count === null,
              )
                ? null
                : participantCounts.reduce(
                    (acc: number, count) => acc + (count ?? 0),
                    0,
                  );
              const participantCountLabel =
                totalParticipants === null
                  ? translate("participantCountUnavailable")
                  : translate("participantCount", { count: totalParticipants });
              const managementTournamentId = parent.isStandalone
                ? parent.id
                : firstDivision?.id || parent.id;
              const isClubLite =
                isClubLiteTournament(parent) ||
                isClubLiteTournament(firstDivision);
              const publicHref = `/tournaments/${managementTournamentId}`;
              const manageHref = `/organizer/tournaments/${managementTournamentId}/manage`;
              const opsHref = `/organizer/tournaments/${managementTournamentId}/ops`;

              return (
                <div
                  key={parent.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Visual Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    <Link href={manageHref} className="block w-full h-full">
                      <TournamentBannerCover
                        bannerUrl={parent.bannerUrl || firstDivision?.bannerUrl}
                        tournamentName={parent.name}
                        categoryName={
                          firstDivision?.category?.name || parent.name
                        }
                      />
                    </Link>

                    {/* Scope & Rank Badges (Top-Left) */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit ${
                          firstDivision?.tournamentType === "CLUB"
                            ? "bg-amber-600/90"
                            : "bg-blue-600/90"
                        }`}
                      >
                        {firstDivision?.tournamentType === "CLUB"
                          ? translate("scopeClub")
                          : translate("scopeOpen")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit ${
                          firstDivision?.isRanked
                            ? "bg-amber-500/90"
                            : "bg-slate-600/90"
                        }`}
                      >
                        {firstDivision?.isRanked
                          ? translate("ranked")
                          : translate("unranked")}
                      </span>
                      {divisions.some((div) => {
                        const cfg = div.tournamentConfig;
                        return Boolean(
                          cfg?.recurring?.enabled || cfg?.recurring?.frequency,
                        );
                      }) && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm w-fit bg-purple-600/95 flex items-center gap-1">
                          <RotateCw className="w-2.5 h-2.5" />{" "}
                          {translate("recurring")}
                        </span>
                      )}
                    </div>

                    {/* Status & Action Badges */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
                      <div className="flex items-center gap-1.5">
                        {firstDivision &&
                          getStatusBadge(
                            parent.status ||
                              divisions.find(
                                (d: Tournament) =>
                                  d.status && d.status !== "DRAFT",
                              )?.status ||
                              // The parent endpoint only returns published divisions.
                              "REGISTRATION_OPEN",
                          )}
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap">
                          {divisions.length}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={(e) =>
                          handleDeleteParent(
                            parent.id,
                            parent.isStandalone || false,
                            e,
                          )
                        }
                        title={translate("deleteTitle")}
                        className="w-6 h-6 rounded-full shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 md:p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2 md:mb-3">
                        <h3
                          className="text-base md:text-lg font-bold text-slate-900 line-clamp-1"
                          title={parent.name}
                        >
                          {parent.name}
                        </h3>
                        <Link
                          href={publicHref}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-blue-700 underline underline-offset-2"
                        >
                          {translate("viewPublic")}
                        </Link>
                      </div>

                      {/* Division Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3 md:mb-4">
                        {divisions.slice(0, 3).map((div: Tournament) => {
                          const displayDivName =
                            div.name &&
                            div.name.toLowerCase() !== parent.name.toLowerCase()
                              ? div.name
                              : getFormatLabel(
                                  div.matchType || "",
                                  div.genderRestriction,
                                  translate,
                                );

                          return (
                            <button
                              key={div.id}
                              onClick={() => {
                                const targetTournamentId = parent.isStandalone ? parent.id : div.id;
                                const divisionHref = parent.isStandalone
                                  ? `/tournaments/${parent.id}?divisionId=${div.id}`
                                  : `/tournaments/${div.id}`;
                                router.push(divisionHref);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-[11px] md:text-xs font-semibold border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all cursor-pointer active:scale-95"
                            >
                              {div.tournamentConfig?.bracketType && (
                                <span className="text-slate-400 mr-0.5">
                                  {div.tournamentConfig.bracketType ===
                                  "SINGLE_ELIMINATION"
                                    ? translate("bracketSingle")
                                    : div.tournamentConfig.bracketType ===
                                        "DOUBLE_ELIMINATION"
                                      ? translate("bracketDouble")
                                      : div.tournamentConfig.bracketType ===
                                          "ROUND_ROBIN"
                                        ? translate("bracketRoundRobin")
                                        : translate("bracketGroup")}
                                </span>
                              )}
                              <span>{displayDivName}</span>
                            </button>
                          );
                        })}
                        {divisions.length > 3 && (
                          <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[11px] font-bold border border-slate-200">
                            +{divisions.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-3 pt-2.5 md:pt-3 border-t border-slate-100 text-slate-500 text-[11px] md:text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">
                          {firstDivision?.startDate
                            ? new Intl.DateTimeFormat(locale).format(
                                new Date(firstDivision.startDate),
                              )
                            : translate("notScheduled")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">
                          {participantCountLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="bg-slate-50 border-t border-slate-100 p-3 md:p-4">
                    {firstDivision ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Link href={manageHref}>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 font-bold shadow-sm text-[11px] md:text-sm h-9 md:h-10 active:scale-95 transition-transform px-0">
                            <Settings className="w-3.5 h-3.5" />{" "}
                            {translate("manage")}
                          </Button>
                        </Link>
                        <Link href={opsHref}>
                          <Button
                            variant="outline"
                            className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1 font-bold text-[11px] md:text-sm h-9 md:h-10 active:scale-95 transition-transform px-0"
                          >
                            <Eye className="w-3.5 h-3.5" />{" "}
                            {translate("operations")}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Button
                        disabled
                        className="w-full bg-slate-300 text-white font-bold h-9 md:h-10 text-sm"
                      >
                        {translate("noRounds")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {parents.length > 0 && totalPages > 1 && (
          <nav
            className="mt-8 flex flex-col items-center gap-3"
            aria-label={translate("paginationLabel")}
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePageChange(page - 1)}
                disabled={isLoading || page <= 1}
                aria-label={translate("previousPage")}
                className="h-9 gap-1 border-slate-200 bg-white px-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {translate("previousPage")}
                </span>
              </Button>
              <span
                className="min-w-24 text-center text-sm font-semibold text-slate-700"
                aria-live="polite"
              >
                {translate("pageOf", { page, total: totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePageChange(page + 1)}
                disabled={isLoading || page >= totalPages}
                aria-label={translate("nextPage")}
                className="h-9 gap-1 border-slate-200 bg-white px-3 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="hidden sm:inline">
                  {translate("nextPage")}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs font-medium text-slate-400">
              {translate("showingRange", {
                from: (page - 1) * ORGANIZER_TOURNAMENT_PAGE_SIZE + 1,
                to: Math.min(page * ORGANIZER_TOURNAMENT_PAGE_SIZE, totalCount),
                total: totalCount,
              })}
            </p>
          </nav>
        )}
      </div>
    </div>
  );
}
