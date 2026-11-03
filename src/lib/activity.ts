import type { recentActivity } from "./releases";
import { STATUS_LABEL, type Status } from "./types";

export type Activity = Awaited<ReturnType<typeof recentActivity>>[number];

/** One-line, past-tense description of an audit entry (without the actor or release). */
export function describeActivity(a: Activity) {
  switch (a.kind) {
    case "CREATED":
      return "created";
    case "STATUS":
      return `moved ${a.from_value ? STATUS_LABEL[a.from_value as Status] + " → " : ""}${STATUS_LABEL[a.status]}`;
    case "CHECKED":
      return `ticked “${a.item_label}”`;
    case "UNCHECKED":
      return `reopened “${a.item_label}”`;
    case "ITEM_ADDED":
      return `added “${a.item_label}”`;
    case "OWNER":
      return "reassigned";
    case "TARGET_DATE":
      return "rescheduled";
    case "ATTACHMENT":
      return "attached files to";
    case "NOTE":
      return "commented on";
  }
}
