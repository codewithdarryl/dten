export type SimpleStatus = "pending" | "approved" | "rejected";

/** Collapse legacy statuses (reviewed, shortlisted, accepted) into the three shown to people. */
export const simpleStatus = (s?: string | null): SimpleStatus => {
  if (s === "approved" || s === "accepted") return "approved";
  if (s === "rejected") return "rejected";
  return "pending";
};

export const statusLabel: Record<SimpleStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const statusClass: Record<SimpleStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};
