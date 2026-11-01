import type { InArgs, Row, Transaction } from "@libsql/client";
import { db } from "./db";
import {
  STATUS_LABEL,
  TRANSITIONS,
  type ChecklistItem,
  type FileMeta,
  type Product,
  type Release,
  type ReleaseEvent,
  type Status,
} from "./types";

/** A rule violation the admin can fix (bad input, illegal transition, ...). */
export class DomainError extends Error {}

const str = (v: unknown) => (v == null ? null : String(v));

function toRelease(r: Row): Release {
  return {
    id: Number(r.id),
    product_id: Number(r.product_id),
    product_slug: String(r.product_slug),
    product_name: String(r.product_name),
    version: String(r.version),
    title: String(r.title),
    description: String(r.description),
    created_by: String(r.created_by),
    created_at: String(r.created_at),
    status: r.status as Status,
    owner: String(r.owner),
    target_date: str(r.target_date),
    updated_at: String(r.updated_at),
    items_total: Number(r.items_total),
    items_done: Number(r.items_done),
    file_count: Number(r.file_count),
    cover_file_id: r.cover_file_id == null ? null : Number(r.cover_file_id),
    started_at: str(r.started_at),
    first_shipped_at: str(r.first_shipped_at),
    shipped_at: str(r.shipped_at),
    target_at_ship: str(r.target_at_ship),
    rollback_count: Number(r.rollback_count),
  };
}

// ---------------------------------------------------------------- queries

export async function listProducts(): Promise<Product[]> {
  const c = await db();
  const { rows } = await c.execute("SELECT id, slug, name, tagline FROM products ORDER BY id");
  return rows.map((r) => ({ id: Number(r.id), slug: String(r.slug), name: String(r.name), tagline: String(r.tagline) }));
}

/** Work in flight, plus recent ships and rollbacks so the roadmap shows what just happened. */
export async function listRoadmap(): Promise<Release[]> {
  const c = await db();
  const { rows } = await c.execute(`
    SELECT * FROM release_state
    WHERE status IN ('PLANNED','IN_PROGRESS','IN_REVIEW')
       OR (status = 'SHIPPED' AND shipped_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-21 days'))
       OR (status = 'ROLLED_BACK' AND updated_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'))
    ORDER BY target_date IS NULL, target_date, id`);
  return rows.map(toRelease);
}

export async function listAllReleases(): Promise<Release[]> {
  const c = await db();
  const { rows } = await c.execute(
    `SELECT * FROM release_state
     ORDER BY CASE status WHEN 'ROLLED_BACK' THEN 0 WHEN 'IN_REVIEW' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'PLANNED' THEN 3 ELSE 4 END,
              updated_at DESC`,
  );
  return rows.map(toRelease);
}

export interface ChangelogFilters {
  q?: string;
  product?: string; // slug
  status?: "SHIPPED" | "ROLLED_BACK" | "ALL";
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
}

export async function listChangelog(f: ChangelogFilters): Promise<Release[]> {
  const where = [
    f.status === "ROLLED_BACK"
      ? "status = 'ROLLED_BACK'"
      : f.status === "ALL"
        ? "first_shipped_at IS NOT NULL"
        : "status = 'SHIPPED'",
  ];
  const args: InArgs = [];
  if (f.q) {
    where.push("(title LIKE ? OR description LIKE ? OR version LIKE ? OR product_name LIKE ?)");
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    args.push(like, like, like, like);
  }
  if (f.product) {
    where.push("product_slug = ?");
    args.push(f.product);
  }
  if (f.from) {
    where.push("shipped_at >= ?");
    args.push(f.from);
  }
  if (f.to) {
    where.push("shipped_at < date(?, '+1 day')");
    args.push(f.to);
  }
  const c = await db();
  const { rows } = await c.execute({
    sql: `SELECT * FROM release_state WHERE ${where.join(" AND ")} ORDER BY shipped_at ${f.sort === "oldest" ? "ASC" : "DESC"}`,
    args,
  });
  return rows.map(toRelease);
}

/** Every release that has shipped at least once, for the stats page. */
export async function listShippedForStats(): Promise<Release[]> {
  const c = await db();
  const { rows } = await c.execute("SELECT * FROM release_state WHERE first_shipped_at IS NOT NULL ORDER BY first_shipped_at");
  return rows.map(toRelease);
}

export async function getRelease(id: number) {
  if (!Number.isInteger(id)) return null;
  const c = await db();
  const [rel, items, events, files] = await c.batch(
    [
      { sql: "SELECT * FROM release_state WHERE id = ?", args: [id] },
      { sql: "SELECT * FROM checklist_state WHERE release_id = ? ORDER BY id", args: [id] },
      {
        sql: `SELECT e.*, c.label AS item_label FROM release_events e
              LEFT JOIN checklist_items c ON c.id = e.item_id
              WHERE e.release_id = ? ORDER BY e.id`,
        args: [id],
      },
      { sql: "SELECT id, event_id, name, mime, size FROM files WHERE release_id = ? ORDER BY id", args: [id] },
    ],
    "read",
  );
  if (!rel.rows.length) return null;

  const filesByEvent = new Map<number, FileMeta[]>();
  const allFiles: FileMeta[] = [];
  for (const f of files.rows) {
    const meta = { id: Number(f.id), name: String(f.name), mime: String(f.mime), size: Number(f.size) };
    allFiles.push(meta);
    const list = filesByEvent.get(Number(f.event_id)) ?? [];
    list.push(meta);
    filesByEvent.set(Number(f.event_id), list);
  }

  return {
    release: toRelease(rel.rows[0]),
    checklist: items.rows.map(
      (r): ChecklistItem => ({
        id: Number(r.id),
        release_id: Number(r.release_id),
        label: String(r.label),
        created_at: String(r.created_at),
        done: Boolean(Number(r.done)),
        toggled_by: str(r.toggled_by),
        toggled_at: str(r.toggled_at),
      }),
    ),
    events: events.rows.map(
      (r): ReleaseEvent => ({
        id: Number(r.id),
        release_id: Number(r.release_id),
        kind: r.kind as ReleaseEvent["kind"],
        actor: String(r.actor),
        status: r.status as Status,
        owner: String(r.owner),
        target_date: str(r.target_date),
        from_value: str(r.from_value),
        item_id: r.item_id == null ? null : Number(r.item_id),
        item_label: str(r.item_label),
        note: str(r.note),
        created_at: String(r.created_at),
        files: filesByEvent.get(Number(r.id)) ?? [],
      }),
    ),
    files: allFiles,
  };
}

export async function getFile(id: number) {
  const c = await db();
  const { rows } = await c.execute({ sql: "SELECT name, mime, data FROM files WHERE id = ?", args: [id] });
  if (!rows.length) return null;
  return { name: String(rows[0].name), mime: String(rows[0].mime), data: rows[0].data as ArrayBuffer };
}

export async function recentActivity(limit = 12) {
  const c = await db();
  const { rows } = await c.execute({
    sql: `SELECT e.id, e.kind, e.actor, e.status, e.from_value, e.created_at, e.release_id,
                 r.version, p.name AS product_name, c.label AS item_label
          FROM release_events e
          JOIN releases r ON r.id = e.release_id
          JOIN products p ON p.id = r.product_id
          LEFT JOIN checklist_items c ON c.id = e.item_id
          ORDER BY e.created_at DESC, e.id DESC LIMIT ?`,
    args: [limit],
  });
  return rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind as ReleaseEvent["kind"],
    actor: String(r.actor),
    status: r.status as Status,
    from_value: str(r.from_value),
    created_at: String(r.created_at),
    release_id: Number(r.release_id),
    version: String(r.version),
    product_name: String(r.product_name),
    item_label: str(r.item_label),
  }));
}

// -------------------------------------------------------------- mutations

export interface FileInput {
  name: string;
  mime: string;
  data: Uint8Array;
}

const now = () => new Date().toISOString();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkDate(d: string | null | undefined) {
  if (!d) return null;
  // Round-trip check rejects impossible dates such as 2026-02-30, which Date.parse rolls over.
  const parsed = Date.parse(d);
  if (!DATE_RE.test(d) || Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== d)
    throw new DomainError("Target date must be a valid date.");
  return d;
}

function checkName(v: string, what: string) {
  const s = v.trim();
  if (!s) throw new DomainError(`${what} is required.`);
  if (s.length > 60) throw new DomainError(`${what} must be 60 characters or fewer.`);
  return s;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

interface Snapshot {
  status: Status;
  owner: string;
  target_date: string | null;
}

async function insertEvent(
  tx: Transaction,
  releaseId: number,
  kind: ReleaseEvent["kind"],
  actor: string,
  snap: Snapshot,
  extra: { from?: string | null; itemId?: number | null; note?: string | null; at?: string } = {},
) {
  const r = await tx.execute({
    sql: `INSERT INTO release_events (release_id, kind, actor, status, owner, target_date, from_value, item_id, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [releaseId, kind, actor, snap.status, snap.owner, snap.target_date, extra.from ?? null, extra.itemId ?? null, extra.note ?? null, extra.at ?? now()],
  });
  return Number(r.lastInsertRowid);
}

async function insertFiles(tx: Transaction, releaseId: number, eventId: number, files: FileInput[], at = now()) {
  for (const f of files) {
    await tx.execute({
      sql: "INSERT INTO files (release_id, event_id, name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [releaseId, eventId, f.name, f.mime, f.data.byteLength, f.data, at],
    });
  }
}

export interface NewReleaseInput {
  productId?: number;
  newProductName?: string;
  version: string;
  title: string;
  description: string;
  owner: string;
  targetDate?: string | null;
  items: string[];
  files: FileInput[];
}

export async function createRelease(input: NewReleaseInput, actor: string): Promise<number> {
  const version = input.version.trim().replace(/^v/i, "");
  if (!/^[0-9A-Za-z][0-9A-Za-z.\-+]{0,31}$/.test(version)) throw new DomainError("Version must look like 1.4.0 (letters, digits, . - +).");
  const title = checkName(input.title, "Title");
  const owner = checkName(input.owner, "Owner");
  const description = input.description.trim();
  if (!description) throw new DomainError("Description is required.");
  const targetDate = checkDate(input.targetDate);
  const items = input.items.map((s) => s.trim()).filter(Boolean);
  if (items.some((s) => s.length > 140)) throw new DomainError("Checklist items must be 140 characters or fewer.");

  const c = await db();
  const tx = await c.transaction("write");
  try {
    const at = now();
    let productId = input.productId;
    if (input.newProductName?.trim()) {
      const name = checkName(input.newProductName, "Product name");
      const slug = slugify(name);
      if (!slug) throw new DomainError("Product name needs letters or digits.");
      const existing = await tx.execute({ sql: "SELECT id FROM products WHERE slug = ?", args: [slug] });
      productId = existing.rows.length
        ? Number(existing.rows[0].id)
        : Number((await tx.execute({ sql: "INSERT INTO products (slug, name, created_at) VALUES (?, ?, ?)", args: [slug, name, at] })).lastInsertRowid);
    }
    if (!productId) throw new DomainError("Choose a product.");
    const dup = await tx.execute({ sql: "SELECT id FROM releases WHERE product_id = ? AND version = ?", args: [productId, version] });
    if (dup.rows.length) throw new DomainError(`Version ${version} already exists for this product.`);

    const id = Number(
      (
        await tx.execute({
          sql: "INSERT INTO releases (product_id, version, title, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [productId, version, title, description, actor, at],
        })
      ).lastInsertRowid,
    );
    for (const label of items) {
      await tx.execute({ sql: "INSERT INTO checklist_items (release_id, label, created_at) VALUES (?, ?, ?)", args: [id, label, at] });
    }
    const eventId = await insertEvent(tx, id, "CREATED", actor, { status: "PLANNED", owner, target_date: targetDate }, { at });
    await insertFiles(tx, id, eventId, input.files, at);
    await tx.commit();
    return id;
  } finally {
    tx.close();
  }
}

export type ChangeInput =
  | { kind: "STATUS"; to: Status; note?: string; override?: boolean }
  | { kind: "TOGGLE"; itemId: number; done: boolean }
  | { kind: "ITEM_ADDED"; label: string }
  | { kind: "OWNER"; owner: string; note?: string }
  | { kind: "TARGET_DATE"; date: string | null; note?: string }
  | { kind: "NOTE"; note: string; files: FileInput[] };

/**
 * Appends one audit entry. Current state is read inside the same write transaction
 * so concurrent edits can't produce an invalid sequence.
 */
export async function recordChange(releaseId: number, input: ChangeInput, actor: string): Promise<void> {
  const c = await db();
  const tx = await c.transaction("write");
  try {
    const rel = await tx.execute({ sql: "SELECT * FROM release_state WHERE id = ?", args: [releaseId] });
    if (!rel.rows.length) throw new DomainError("Release not found.");
    const r = toRelease(rel.rows[0]);
    const snap: Snapshot = { status: r.status, owner: r.owner, target_date: r.target_date };
    const note = "note" in input ? input.note?.trim() || null : null;
    const frozen = r.status === "SHIPPED";

    switch (input.kind) {
      case "STATUS": {
        if (!TRANSITIONS[r.status].includes(input.to))
          throw new DomainError(`Can't move from ${STATUS_LABEL[r.status]} to ${STATUS_LABEL[input.to]}.`);
        let finalNote = note;
        if (input.to === "SHIPPED" && r.items_done < r.items_total) {
          const open = r.items_total - r.items_done;
          if (!input.override)
            throw new DomainError(`${open} checklist item${open === 1 ? " is" : "s are"} still open. Tick them off or confirm shipping anyway.`);
          finalNote = `Shipped with ${open} open checklist item${open === 1 ? "" : "s"}.${note ? " " + note : ""}`;
        }
        if (input.to === "ROLLED_BACK" && !note) throw new DomainError("Explain why the release was rolled back.");
        await insertEvent(tx, releaseId, "STATUS", actor, { ...snap, status: input.to }, { from: r.status, note: finalNote });
        break;
      }
      case "TOGGLE": {
        if (frozen) throw new DomainError("The checklist is locked once a release has shipped.");
        const item = await tx.execute({ sql: "SELECT done FROM checklist_state WHERE id = ? AND release_id = ?", args: [input.itemId, releaseId] });
        if (!item.rows.length) throw new DomainError("Checklist item not found.");
        if (Boolean(Number(item.rows[0].done)) === input.done) return; // already in that state; nothing to record
        await insertEvent(tx, releaseId, input.done ? "CHECKED" : "UNCHECKED", actor, snap, { itemId: input.itemId });
        break;
      }
      case "ITEM_ADDED": {
        if (frozen) throw new DomainError("The checklist is locked once a release has shipped.");
        const label = input.label.trim();
        if (!label || label.length > 140) throw new DomainError("Checklist item must be 1–140 characters.");
        const at = now();
        const itemId = Number(
          (await tx.execute({ sql: "INSERT INTO checklist_items (release_id, label, created_at) VALUES (?, ?, ?)", args: [releaseId, label, at] }))
            .lastInsertRowid,
        );
        await insertEvent(tx, releaseId, "ITEM_ADDED", actor, snap, { itemId, at });
        break;
      }
      case "OWNER": {
        const owner = checkName(input.owner, "Owner");
        if (owner === r.owner) throw new DomainError(`${owner} already owns this release.`);
        await insertEvent(tx, releaseId, "OWNER", actor, { ...snap, owner }, { from: r.owner, note });
        break;
      }
      case "TARGET_DATE": {
        const date = checkDate(input.date);
        if (date === r.target_date) throw new DomainError("That's already the target date.");
        await insertEvent(tx, releaseId, "TARGET_DATE", actor, { ...snap, target_date: date }, { from: r.target_date, note });
        break;
      }
      case "NOTE": {
        if (!note && !input.files.length) throw new DomainError("Add a comment or attach a file.");
        const at = now();
        const eventId = await insertEvent(tx, releaseId, input.files.length ? "ATTACHMENT" : "NOTE", actor, snap, { note, at });
        await insertFiles(tx, releaseId, eventId, input.files, at);
        break;
      }
    }
    await tx.commit();
  } finally {
    tx.close();
  }
}
