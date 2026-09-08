export const BUDGET_CATEGORIES = [
  "flights",
  "lodging",
  "food",
  "activities",
  "transit",
  "other",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const BUDGET_CATEGORY_LABEL: Record<BudgetCategory, string> = {
  flights: "Flights",
  lodging: "Lodging",
  food: "Food & drink",
  activities: "Activities",
  transit: "Local transit",
  other: "Other",
};
