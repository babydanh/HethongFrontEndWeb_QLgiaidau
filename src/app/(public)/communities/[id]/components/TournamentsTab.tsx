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
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { TournamentTypeChoiceModal } from "@/components/TournamentTypeChoiceModal";
import { communitiesApi } from "@/features/communities/api";
import { tournamentsApi } from "@/features/tournaments/api";
import { isLiteTournament } from "@/features/tournaments/lite-qr";
import { getSportLogo } from "@/constants/sports";
import BRAND from "@/constants/brand";

import { formatDate } from "@/utils/format";
import { Tournament } from "@/types/tournament";
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
  const locale = useLocale();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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

  const fetchTournaments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await communitiesApi.getTournaments(communityId);
      const data = res.data || [];
      setTournaments(data);
    } catch (error) {
      console.error("Failed to fetch community tournaments", error);
    } finally {
      setIsLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    if (communityId) {
      Promise.resolve().then(() => {
        fetchTournaments();
      });
    }
  }, [communityId, fetchTournaments]);

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
      fetchTournaments();
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
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {translate("communityClubOnlyBadge")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        {translate("communityOpenBadge")}
      </span>
    );
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

  // Group divisions under parentId
  const groupedTournaments = (() => {
    const groups: Record<string, Tournament[]> = {};
    const standalones: Tournament[] = [];

    filteredTournaments.forEach((t) => {
      if (t.parentId) {
        if (!groups[t.parentId]) {
          groups[t.parentId] = [];
        }
        groups[t.parentId].push(t);
      } else {
        standalones.push(t);
      }
    });

    interface GroupedItem {
      id: string;
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      entryFee?: number;
      tournamentType?: "CLUB" | "PUBLIC";
      status: Tournament["status"];
      bannerUrl?: string | null;
      logoUrl?: string | null;
      category?: Tournament["category"];
      venue?: Tournament["venue"];
      city?: string | null;
      locationAddress?: string;
      maxParticipants?: number;
      isRanked?: boolean;
      parent?: Tournament["parent"];
      divisions: Tournament[];
    }

    const result: GroupedItem[] = [];

    Object.entries(groups).forEach(([parentId, divs]) => {
      // Sort divisions so representation is consistent
      divs.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      );
      const representative = divs[0];

      // Determine overall status
      let overallStatus: Tournament["status"] = representative.status;
      if (divs.some((d) => isTournamentInProgress(d.status))) {
        overallStatus = "ONGOING";
      } else if (divs.some((d) => isTournamentOpenForRegistration(d.status))) {
        overallStatus = "REGISTRATION_OPEN";
      } else if (divs.every((d) => isTournamentCompleted(d.status))) {
        overallStatus = "COMPLETED";
      }

      result.push({
        id: parentId,
        name: representative.parent?.name || representative.name,
        description:
          representative.parent?.description || representative.description,

        startDate: representative.startDate,
        endDate: representative.endDate,
        entryFee: Number(representative.entryFee),
        tournamentType: representative.tournamentType,
        status: overallStatus,
        bannerUrl:
          representative.bannerUrl || representative.parent?.bannerUrl || null,
        logoUrl:
          representative.logoUrl || representative.parent?.logoUrl || null,
        category: representative.category,
        venue: representative.venue,
        city: representative.city,
        locationAddress: representative.locationAddress,
        maxParticipants: representative.maxParticipants,
        isRanked: representative.isRanked,
        parent: representative.parent,
        divisions: divs,
      });
    });

    standalones.forEach((t) => {
      result.push({
        id: t.id,
        name: t.parent?.name || t.name,
        description: t.parent?.description || t.description,

        startDate: t.startDate,
        endDate: t.endDate,
        entryFee: Number(t.entryFee),
        tournamentType: t.tournamentType,
        status: t.status,
        bannerUrl: t.bannerUrl || t.parent?.bannerUrl || null,
        logoUrl: t.logoUrl || t.parent?.logoUrl || null,
        category: t.category,
        venue: t.venue,
        city: t.city,
        locationAddress: t.locationAddress,
        maxParticipants: t.maxParticipants,
        isRanked: t.isRanked,
        parent: t.parent,
        divisions: [t],
      });
    });

    return result;
  })();

  const getFormatLabel = (
    matchType?: string,
    genderRestriction?: string | null,
  ) => {
    const mt = matchType || "";
    const gr = genderRestriction || "";
    if (mt === "SINGLES") {
      return gr === "FEMALE"
        ? translate("communitySinglesFemale")
        : translate("communitySinglesMale");
    }
    if (mt === "DOUBLES") {
      return gr === "FEMALE"
        ? translate("communityDoublesFemale")
        : translate("communityDoublesMale");
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
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all"
            >
              + {translate("communityTournamentCreateButton")}
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
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-slate-500 text-sm">
            {translate("loadingTournaments")}
          </p>
        </div>
      ) : groupedTournaments.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groupedTournaments.map((t) => {
            const representative = t.divisions[0];
            const sportLogo = getSportLogo(t.category?.name);
            const locationLabel = t.venue?.name || t.city || t.locationAddress;
            const divisionCount = t.divisions.length;
            const hasMultipleDivisions = divisionCount > 1;

            const divisionLabels = t.divisions.map((d) =>
              getFormatLabel(d.matchType, d.genderRestriction),
            );
            const uniqueLabels = Array.from(new Set(divisionLabels)).filter(
              Boolean,
            );

            return (
              <div
                key={t.id}
                onClick={() => router.push(`/tournaments/${representative.id}`)}
                className="group cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Compact Card Banner */}
                <div className="relative h-36 w-full bg-slate-900 overflow-hidden shrink-0">
                  <img
                    src={t.bannerUrl || BRAND.assets.defaultFallback}
                    alt={t.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = BRAND.assets.defaultFallback;
                      event.currentTarget.classList.remove("object-cover");
                      event.currentTarget.classList.add(
                        "object-contain",
                        "p-4",
                        "bg-slate-900",
                      );
                    }}
                    className={`absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105 ${
                      t.bannerUrl
                        ? "object-cover"
                        : "object-contain p-4 bg-slate-900"
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

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

                    {hasMultipleDivisions && (
                      <span className="px-2 py-0.5 bg-blue-600/90 text-white rounded-md text-[10px] font-bold backdrop-blur-md shadow-sm ml-auto">
                        {translate("divisionCount", { count: divisionCount })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base line-clamp-1">
                      {t.name}
                    </h3>

                    {/* Format / Division tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {uniqueLabels.slice(0, 2).map((label, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100/80 px-2 py-0.5 rounded text-slate-600 text-[10px] font-semibold border border-slate-200/70"
                        >
                          {label}
                        </span>
                      ))}
                      {uniqueLabels.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{uniqueLabels.length - 2}
                        </span>
                      )}

                      {t.isRanked && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {translate("eloCounted")}
                        </span>
                      )}

                      {t.divisions.some((d) => isLiteTournament(d)) && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-300/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
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
                          title={t.locationAddress || locationLabel}
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
