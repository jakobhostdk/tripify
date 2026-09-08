export type Participant = {
  id: string;
  displayName: string;
  joinedAt: string;
};

export const PROPOSAL_KINDS = [
  "destination",
  "date_range",
  "activity",
  "accommodation",
  "restaurant",
  "other",
] as const;

export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

export const PROPOSAL_KIND_LABEL: Record<ProposalKind, string> = {
  destination: "Place",
  date_range: "Date range",
  activity: "Activity",
  accommodation: "Logi",
  restaurant: "Restaurant",
  other: "Other",
};

/** Structured booking data attached to an accommodation/activity proposal — when
 * the source has structured fields the extension (or server-side enrichment)
 * was able to extract. Dates are ISO YYYY-MM-DD; counts are non-negative
 * integers; lat/lon are WGS-84 decimal degrees. */
export type ProposalBooking = {
  provider?: string;       // "airbnb" | "booking.com" | etc.
  listingId?: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  currency?: string;       // ISO 4217 3-letter
  /** Server-enriched: hero image URL extracted from the listing page. */
  imageUrl?: string;
  /** Server-enriched: lat/lon of the listing, parsed from JSON-LD. */
  lat?: number;
  lon?: number;
};

/** Shape of the JSON encoded in Proposal.payload */
export type ProposalPayload = {
  title: string;
  notes?: string;
  url?: string;
  booking?: ProposalBooking;
};

export type Proposal = {
  id: string;
  kind: ProposalKind;
  payload: ProposalPayload;
  createdBy: string;
  createdAt: string;
};

export type TripSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  participants: Participant[];
  proposals: Proposal[];
};
