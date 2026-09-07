"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calendar,
  Loader2,
  Trash2,
  MapPin,
  Users,
  Swords,
  Plus,
} from "lucide-react";
import { ClubTournamentsSkeleton } from "@/components/skeletons/ClubTabSkeletons";

import { Button } from "@/components/ui/Button";
import { TournamentTypeChoiceModal } from "@/components/TournamentTypeChoiceModal";
import { communitiesApi } from "@/features/communities/api";
import { tournamentsApi } from "@/features/tournaments/api";
import { clubMatchSessionsApi } from "@/features/club-match-sessions/api";
import { categoriesApi, Category } from "@/features/categories/api";
import { isLiteTournament } from "@/features/tournaments/lite-qr";
import { getSportLogo } from "@/constants/sports";
import BRAND from "@/constants/brand";
import TournamentBannerCover from "@/components/ui/TournamentBannerCover";

import { formatDate, formatDateTime } from "@/utils/format";
import { getTournamentLocationLabel } from "@/utils/tournament-location";
import { Tournament } from "@/types/tournament";
import type { ClubMatchSession } from "@/types/club-match-session";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/utils/error";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  getTournamentStatusClassName,
  getTournamentStatusLabel,
  isTournamentInProgress,
  isTournamentOpenForRegistration,
  isTournamentUpcoming,
  isTournamentCompleted,
  isTournamentDraft,
} from "@/utils/tournament-status";

export default function TournamentsTab({
  communityId,
  isOwnerOrMod,
}: {
  communityId: string;
  isOwnerOrMod: boolean;
}) {
  const router = useRouter();
  const translate = useTranslations("Common");
  const sessionTranslate = useTranslations("ClubMatchSession");
  const locale = useLocale();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [sessions, setSessions] = useState<ClubMatchSession[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "UPCOMING" | "ONGOING" | "COMPLETED"
  >("ALL");
  const [activeTypeFilter, setActiveTypeFilter] = useState<
    "ALL" | "CLUB" | "PUBLIC"
  >("ALL");
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    isGrouped: boolean;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tourneyRes, sessionRes, catRes] = await Promise.all([
        communitiesApi.getTournaments(communityId).catch((err) => {
          console.error("Failed to fetch community tournaments", err);
          return { data: [] as Tournament[] };
        }),
        clubMatchSessionsApi.list(communityId, { limit: 50 }).catch((err) => {
          console.error("Failed to fetch club match sessions", err);
          return { data: [] as ClubMatchSession[], meta: { hasMore: false, nextCursor: null } };
        }),
        categoriesApi.getCategories().catch((err) => {
          console.error("Failed to fetch categories", err);
          return { data: [] as Category[] };
        }),
      ]);

      setTournaments(tourneyRes.data || []);
      setSessions(sessionRes.data || []);
      setCategories(catRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data for tournaments tab", error);
    } finally {
      setIsLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    if (communityId) {
      Promise.resolve().then(() => {
        fetchData();
      });
    }
  }, [communityId, fetchData]);

  const handleDeleteTournament = (
    id: string,
    isGrouped: boolean,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setDeleteTarget({ id, isGrouped });
  };

  const performDeleteTournament = async (id: string, isGrouped: boolean) => {
    try {
      if (isGrouped) {
        await tournamentsApi.deleteParentTournament(id);
      } else {
        await tournamentsApi.deleteTournament(id);
      }
      toast.success(translate("tournamentDeleted"));
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, translate("deleteTournamentFailed")));
    }
  };

  const getStatusBadge = (status: Tournament["status"]) => {
    if (isTournamentDraft(status)) return null;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getTournamentStatusClassName(status)}`}
      >
        {(isTournamentInProgress(status) ||
          isTournamentOpenForRegistration(status) ||
          isTournamentUpcoming(status)) && (
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
        )}
        {isTournamentCompleted(status) && (
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        )}
        {getTournamentStatusLabel(status)}
      </span>
    );
  };

  const getTypeBadge = (type: Tournament["tournamentType"]) => {
    if (type === "CLUB") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white shadow-2xs">
          {translate("communityClubOnlyBadge")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
        {translate("communityOpenBadge")}
      </span>
    );
  };

  const getSessionStatusBadge = (status: ClubMatchSession["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {sessionTranslate("status.OPEN")}
          </span>
        );
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-rose-300 bg-rose-50 text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {sessionTranslate("status.LIVE")}
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-slate-300 bg-slate-100 text-slate-700">
            {sessionTranslate("status.CLOSED")}
          </span>
        );
      case "ENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200 bg-slate-100 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {sessionTranslate("status.ENDED")}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-rose-200 bg-rose-50 text-rose-600">
            {sessionTranslate("status.CANCELLED")}
          </span>
        );
      default:
        return null;
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    // Hide DRAFT tournaments from non-owners/non-moderators
    if (!isOwnerOrMod && t.status === "DRAFT") {
      return false;
    }
    // 1. Filter by Tournament Type
    if (activeTypeFilter !== "ALL" && t.tournamentType !== activeTypeFilter) {
      return false;
    }
    // 2. Filter by Status
    if (activeFilter === "ALL") return true;
    if (activeFilter === "UPCOMING")
      return (
        isTournamentUpcoming(t.status) ||
        isTournamentOpenForRegistration(t.status)
      );
    return t.status === activeFilter;
  });

  const filteredSessions = sessions.filter((s) => {
    // Buổi giao lưu CLB thuộc phạm vi CLUB. Nếu lọc PUBLIC thì ẩn.
    if (activeTypeFilter === "PUBLIC") return false;
    if (activeFilter === "ALL") return true;
    if (activeFilter === "UPCOMING") return s.status === "OPEN";
    if (activeFilter === "ONGOING") return s.status === "LIVE";
    if (activeFilter === "COMPLETED") return s.status === "CLOSED" || s.status === "ENDED";
    return true;
  });

  const getFormatLabel = (
    matchType?: string,
    genderRestriction?: string | null,
  ) => {
    const mt = matchType || "";
    const gr = genderRestriction || "";
    if (mt === "SINGLES") {
      if (gr === "FEMALE") return translate("communitySinglesFemale");
      if (gr === "MALE") return translate("communitySinglesMale");
      return translate("communitySingles");
    }
    if (mt === "DOUBLES") {
      if (gr === "FEMALE") return translate("communityDoublesFemale");
      if (gr === "MALE") return translate("communityDoublesMale");
      if (gr === "MIXED") return translate("communityMixedDoubles");
      return translate("communityDoubles");
    }
    if (mt === "MIXED_DOUBLES" || mt === "MIXED" || gr === "MIXED") {
      return translate("communityMixedDoubles");
    }
    return mt === "DOUBLES"
      ? translate("communityDoubles")
      : mt === "SINGLES"
        ? translate("communitySingles")
        : translate("communityMixedDoubles");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Scope Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "ALL", label: translate("allTournaments") },
              { key: "CLUB", label: translate("clubTournaments") },
              { key: "PUBLIC", label: translate("publicTournaments") },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveTypeFilter(opt.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTypeFilter === opt.key
                  ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                  : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isOwnerOrMod && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() =>
                router.push(`/communities/${communityId}/manage/tournaments`)
              }
              variant="outline"
              className="w-full sm:w-auto border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold shadow-sm transition-all"
            >
              {translate("communityTournamentManageTitle")}
            </Button>
            <Button
              onClick={() => setIsChoiceModalOpen(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> {translate("communityTournamentCreateButton")}
            </Button>
          </div>
        )}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "ALL", label: translate("allStatuses") },
            { key: "UPCOMING", label: translate("upcoming") },
            { key: "ONGOING", label: translate("ongoing") },
            { key: "COMPLETED", label: translate("completed") },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              activeFilter === opt.key
                ? "border-blue-600 text-blue-700 bg-blue-50 shadow-sm"
                : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ClubTournamentsSkeleton />
      ) : filteredTournaments.length === 0 && filteredSessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 border-dashed p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium text-lg">
            {translate("noTournaments")}
          </p>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
            {translate("communityTournamentFilterEmpty")}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Buổi giao lưu CLB */}
          {filteredSessions.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    {sessionTranslate("listTitle")}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                    {filteredSessions.length}
                  </span>
                </div>
                {isOwnerOrMod && (
                  <button
                    onClick={() => router.push(`/communities/${communityId}/match-sessions/create`)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1"
                  >
                    + {sessionTranslate("create")}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSessions.map((s) => {
                  const cat = categories.find((c) => c.id === s.categoryId);
                  const sportLogo = getSportLogo(cat?.name);
                  const timeLabel = s.startAt
                    ? formatDateTime(s.startAt)
                    : s.endAt
                      ? formatDateTime(s.endAt)
                      : null;

                  return (
                    <div
                      key={s.id}
                      onClick={() =>
                        router.push(`/communities/${communityId}/match-sessions/${s.id}`)
                      }
                      className="group cursor-pointer bg-white border border-slate-200/90 hover:border-teal-500/80 rounded-xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
                    >
                      {/* Banner / Header Area */}
                      <div className="relative h-32 w-full bg-slate-800 overflow-hidden shrink-0">
                        <TournamentBannerCover
                          tournamentName={s.resolvedName}
                          categoryName={cat?.name || "Cầu lông"}
                          isCompleted={s.status === "CLOSED" || s.status === "ENDED"}
                        >
                          {/* Top Badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getSessionStatusBadge(s.status)}
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white shadow-2xs">
                                GIAO LƯU CLB
                              </span>
                            </div>
                          </div>

                          {/* Sport badge on banner bottom */}
                          <div className="absolute left-3 bottom-2.5 right-3 flex items-center justify-between gap-2 z-10">
                            {cat?.name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/15 shadow-sm">
                                {sportLogo ? (
                                  <img
                                    src={sportLogo}
                                    alt=""
                                    className="w-3 h-3 object-contain"
                                  />
                                ) : null}
                                {cat.name}
                              </span>
                            )}
                          </div>
                        </TournamentBannerCover>
                      </div>

                      {/* Body Info */}
                      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors text-sm sm:text-base line-clamp-1">
                            {s.resolvedName}
                          </h4>

                          {/* Tag chips */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {s.isRanked ? (
                              <span className="bg-sky-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs">
                                {sessionTranslate("rankedShort")}
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                {sessionTranslate("unrankedShort")}
                              </span>
                            )}

                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                              Ghép tự do
                            </span>

                            {s.isRecurring && (
                              <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-teal-200">
                                Lặp định kỳ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meta info: Thời gian & người tham gia */}
                        <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                          {timeLabel ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{timeLabel}</span>
                            </div>
                          ) : null}

                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {s.participantCount ?? 0}
                              {s.maxParticipants ? ` / ${s.maxParticipants}` : ""}{" "}
                              {translate("participants") || "người"} ·{" "}
                              {s.matchCount ?? 0} {translate("matches") || "trận"}
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="font-bold text-slate-900">
                            {translate("free")}
                          </span>

                          <span className="text-xs font-bold text-teal-700 group-hover:text-teal-800 group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                            Vào buổi giao lưu →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Giải đấu */}
          {filteredTournaments.length > 0 && (
            <div>
              {filteredSessions.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    {translate("tournamentsTab") || "Giải đấu"}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {filteredTournaments.length}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTournaments.map((t) => {
                  const sportLogo = getSportLogo(t.category?.name);
                  const locationLabel =
                    getTournamentLocationLabel(t) ||
                    t.venue?.name ||
                    t.city ||
                    t.locationAddress;
                  const formatLabel = getFormatLabel(
                    t.matchType,
                    t.genderRestriction,
                  );

                  return (
                    <div
                      key={t.id}
                      onClick={() => router.push(`/tournaments/${t.id}`)}
                      className="group cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500/80 rounded-xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
                    >
                      {/* Compact Card Banner */}
                      <div className="relative h-36 w-full bg-slate-100 overflow-hidden shrink-0">
                        <TournamentBannerCover
                          bannerUrl={t.bannerUrl}
                          tournamentName={t.name}
                          categoryName={t.category?.name}
                          isCompleted={isTournamentCompleted(t.status)}
                        >
                          {/* Top Badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getStatusBadge(t.status)}
                              {getTypeBadge(t.tournamentType)}
                            </div>
                            {isOwnerOrMod && (
                              <button
                                onClick={(e) =>
                                  handleDeleteTournament(t.id, Boolean(t.parent), e)
                                }
                                className="p-1.5 bg-black/40 hover:bg-rose-600 text-white/90 hover:text-white rounded-lg backdrop-blur-md transition-all active:scale-95 shadow-sm"
                                title={translate("communityTournamentDeleteTitle")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Bottom Chips on Banner */}
                          <div className="absolute left-3 bottom-2.5 right-3 flex items-center justify-between gap-2 z-10">
                            {t.category?.name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/15 shadow-sm">
                                {sportLogo ? (
                                  <img
                                    src={sportLogo}
                                    alt=""
                                    className="w-3 h-3 object-contain"
                                  />
                                ) : null}
                                {t.category.name}
                              </span>
                            )}
                          </div>
                        </TournamentBannerCover>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base line-clamp-1">
                            {t.name}
                          </h3>

                          {/* Format / Division tags */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {formatLabel && (
                              <span className="bg-slate-100/80 px-2 py-0.5 rounded text-slate-600 text-[10px] font-semibold border border-slate-200/70">
                                {formatLabel}
                              </span>
                            )}

                            {t.isRanked && (
                              <span className="bg-sky-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs">
                                {translate("eloCounted")}
                              </span>
                            )}

                            {isLiteTournament(t) && (
                              <span className="bg-amber-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs">
                                {translate("quickCreateLite")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Info Meta */}
                        <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {t.startDate
                                ? `${formatDate(t.startDate)}${
                                    t.endDate ? ` - ${formatDate(t.endDate)}` : ""
                                  }`
                                : translate("dateNotSet")}
                            </span>
                          </div>

                          {locationLabel && (
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span
                                className="truncate"
                                title={locationLabel}
                              >
                                {locationLabel}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer Strip */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="font-bold text-slate-900">
                            {t.entryFee && t.entryFee > 0
                              ? `${t.entryFee.toLocaleString(
                                  locale === "vi" ? "vi-VN" : "en-US",
                                )} ${translate("currencyVnd")}`
                              : translate("free")}
                          </span>

                          <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                            {translate("viewDetails")} →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <TournamentTypeChoiceModal
        communityId={communityId}
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
      />

      {/* Delete Tournament Confirmation Modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={translate("deleteTournamentTitle")}
        description={translate("deleteTournamentDescription")}
        confirmLabel={translate("deleteTournamentConfirm")}
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            const target = deleteTarget;
            setDeleteTarget(null);
            performDeleteTournament(target.id, target.isGrouped);
          }
        }}
      />
    </div>
  );
}
