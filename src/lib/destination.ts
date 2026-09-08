import Anthropic from "@anthropic-ai/sdk";

export type LandmarkKind =
  | "monument"
  | "nature"
  | "square"
  | "museum"
  | "religious"
  | "cityscape"
  | "water";

export type DestinationLandmark = {
  name: string;
  lat: number;
  lon: number;
  kind: LandmarkKind;
};

export type DestinationData = {
  destination_name: string;
  country: string;
  country_code: string; // ISO-3166-1 alpha-2
  lat: number;
  lon: number;
  region_radius_deg: number; // suggested half-width of the regional view
  landmarks: DestinationLandmark[];
  mood: string;
  accent_hex: string; // 6-digit hex with leading '#'
  ambiguous: boolean;
  /** Trip name at the time this data was generated — used to detect staleness. */
  generated_for_name: string;
  /** Wall-clock timestamp the API call returned. */
  generated_at: string;
};

const SYSTEM_PROMPT = `You are a cartography assistant for a trip-planning app called Tripify. Users give you a trip title that loosely hints at a destination; you extract structured geographic metadata so the app can render a stylized regional map.

Be confident about well-known places. If the title is ambiguous (no clear destination), set "ambiguous": true, pick the most evocative interpretation, and proceed — never refuse, never call multiple tools.

Coordinate guidance:
- Use WGS-84 decimal degrees. Latitude in [-90, 90], longitude in [-180, 180].
- "lat"/"lon" point at the most iconic center of the destination (downtown for a city, capital for a country, central reference point for a region).
- "region_radius_deg" controls map zoom — pick the smallest value that comfortably frames the destination:
  - Single landmark/neighborhood: 0.05
  - City: 0.6
  - Metropolitan area / island: 1.5
  - Province / small country: 4
  - Large country: 10
  - Continental region: 20

Landmark guidance:
- Always include 4–6 landmarks, real, distinctive, and recognizable.
- Spread them geographically across the region you've framed.
- "kind" hints at the icon glyph: monument, nature, square, museum, religious, cityscape, water.

Aesthetic guidance:
- "mood" is a short evocative phrase (≤ 8 words) — e.g. "winter market lights, mulled wine air".
- "accent_hex" is a 6-digit hex with leading '#', tuned to the destination's character (cool blues for arctic, terracotta for desert, jade for jungle, oxblood for old-world cities). Avoid pure black/white. Default if unsure: "#8a2828".`;

const TOOL_SCHEMA: Anthropic.Tool = {
  name: "record_destination",
  description:
    "Record the extracted destination metadata. Always call this exactly once.",
  input_schema: {
    type: "object",
    properties: {
      destination_name: { type: "string" },
      country: { type: "string" },
      country_code: {
        type: "string",
        description: "ISO 3166-1 alpha-2 country code, uppercase.",
      },
      lat: { type: "number", minimum: -90, maximum: 90 },
      lon: { type: "number", minimum: -180, maximum: 180 },
      region_radius_deg: { type: "number", minimum: 0.05, maximum: 60 },
      landmarks: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            lat: { type: "number", minimum: -90, maximum: 90 },
            lon: { type: "number", minimum: -180, maximum: 180 },
            kind: {
              type: "string",
              enum: [
                "monument",
                "nature",
                "square",
                "museum",
                "religious",
                "cityscape",
                "water",
              ],
            },
          },
          required: ["name", "lat", "lon", "kind"],
        },
      },
      mood: { type: "string" },
      accent_hex: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
      },
      ambiguous: { type: "boolean" },
    },
    required: [
      "destination_name",
      "country",
      "country_code",
      "lat",
      "lon",
      "region_radius_deg",
      "landmarks",
      "mood",
      "accent_hex",
      "ambiguous",
    ],
  },
};

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

/**
 * Ask Claude to extract a structured destination from the trip name.
 * Returns null if no API key is configured or the model fails to comply.
 * Caches the system prompt across calls.
 */
export async function extractDestination(
  tripName: string,
): Promise<DestinationData | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      // Prompt caching: the system prompt is identical across every trip,
      // so cache it once and pay 0.1x on subsequent reads instead of 1x.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "record_destination" },
      messages: [
        {
          role: "user",
          content: `Trip title: ${JSON.stringify(tripName)}`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;
    const raw = toolUse.input as Omit<DestinationData, "generated_for_name" | "generated_at">;

    // Sanity-check the most load-bearing fields before persisting.
    if (
      typeof raw.lat !== "number" ||
      typeof raw.lon !== "number" ||
      !Array.isArray(raw.landmarks) ||
      raw.landmarks.length < 1
    ) {
      return null;
    }

    return {
      ...raw,
      generated_for_name: tripName,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[destination] extraction failed:", err);
    return null;
  }
}

export function parseDestinationData(raw: string | null): DestinationData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DestinationData;
  } catch {
    return null;
  }
}
