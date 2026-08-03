export type RequestStatus = "sent" | "reviewing" | "accepted" | "rejected";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  sent: "مُرسل",
  reviewing: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

export const REQUEST_STATUS_CLASS: Record<RequestStatus, string> = {
  sent: "bg-muted text-muted-foreground",
  reviewing: "bg-secondary text-secondary-foreground",
  accepted: "bg-primary text-primary-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export const REQUEST_STEPS: RequestStatus[] = ["sent", "reviewing", "accepted"];
