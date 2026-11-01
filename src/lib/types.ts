export type Status = "PLANNED" | "IN_PROGRESS" | "IN_REVIEW" | "SHIPPED" | "ROLLED_BACK";
export type EventKind =
  | "CREATED"
  | "STATUS"
  | "CHECKED"
  | "UNCHECKED"
  | "ITEM_ADDED"
  | "OWNER"
  | "TARGET_DATE"
  | "ATTACHMENT"
  | "NOTE";

export const STATUSES: Status[] = ["PLANNED", "IN_PROGRESS", "IN_REVIEW", "SHIPPED", "ROLLED_BACK"];

export const STATUS_LABEL: Record<Status, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  SHIPPED: "Shipped",
  ROLLED_BACK: "Rolled back",
};

/** Allowed status moves. Shipping is further gated on the checklist. */
export const TRANSITIONS: Record<Status, Status[]> = {
  PLANNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW", "PLANNED"],
  IN_REVIEW: ["SHIPPED", "IN_PROGRESS"],
  SHIPPED: ["ROLLED_BACK"],
  ROLLED_BACK: ["IN_PROGRESS"],
};

export interface Product {
  id: number;
  slug: string;
  name: string;
  tagline: string;
}

export interface Release {
  id: number;
  product_id: number;
  product_slug: string;
  product_name: string;
  version: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  status: Status;
  owner: string;
  target_date: string | null;
  updated_at: string;
  items_total: number;
  items_done: number;
  file_count: number;
  cover_file_id: number | null;
  started_at: string | null;
  first_shipped_at: string | null;
  shipped_at: string | null;
  target_at_ship: string | null;
  rollback_count: number;
}

export interface ChecklistItem {
  id: number;
  release_id: number;
  label: string;
  created_at: string;
  done: boolean;
  toggled_by: string | null;
  toggled_at: string | null;
}

export interface ReleaseEvent {
  id: number;
  release_id: number;
  kind: EventKind;
  actor: string;
  status: Status;
  owner: string;
  target_date: string | null;
  from_value: string | null;
  item_id: number | null;
  item_label: string | null;
  note: string | null;
  created_at: string;
  files: FileMeta[];
}

export interface FileMeta {
  id: number;
  name: string;
  mime: string;
  size: number;
}
