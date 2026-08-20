export interface TournamentLocationInput {
  city?: string | null;
  locationAddress?: string | null;
  venue?: {
    name?: string | null;
    locationAddress?: string | null;
  } | null;
  tournamentConfig?: {
    location?: {
      venueName?: string | null;
      address?: string | null;
      province?: string | null;
      district?: string | null;
      ward?: string | null;
      display?: string | null;
    } | null;
  } | null;
}

export interface MatchLocationInput {
  city?: string | null;
  courtName?: string | null;
  courtAddress?: string | null;
  tournament?: {
    venueName?: string | null;
    venueAddress?: string | null;
  } | null;
}

const uniqueParts = (values: Array<string | null | undefined>): string[] => {
  const parts = values
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Map(parts.map((value) => [value.toLocaleLowerCase(), value])).values());
};

export const getTournamentLocationParts = (input: TournamentLocationInput): string[] => {
  const legacyLocation = input.tournamentConfig?.location;
  return uniqueParts([
    input.venue?.name,
    input.venue?.locationAddress,
    input.locationAddress,
    legacyLocation?.display,
    legacyLocation?.venueName,
    legacyLocation?.address,
    legacyLocation?.ward,
    legacyLocation?.district,
    legacyLocation?.province,
    input.city,
  ]);
};

export const getTournamentLocationLabel = (input: TournamentLocationInput): string =>
  getTournamentLocationParts(input).join(', ');

export const getMatchLocationParts = (input: MatchLocationInput): string[] =>
  uniqueParts([
    input.courtName,
    input.courtAddress,
    input.tournament?.venueName,
    input.tournament?.venueAddress,
    input.city,
  ]);

export const getMatchLocationLabel = (input: MatchLocationInput): string =>
  getMatchLocationParts(input).join(', ');
