import { createClient, type Client } from "@libsql/client";
import { seed } from "./seed";

/**
 * Database resolution:
 *  - TURSO_DATABASE_URL set  -> hosted libSQL (SQLite) database. Use this on Vercel.
 *  - running on Vercel        -> /tmp/shipyard.db (ephemeral, re-seeded on cold start; demo only)
 *  - otherwise                -> ./data/shipyard.db
 */
function resolveUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) return "file:/tmp/shipyard.db";
  return "file:data/shipyard.db";
}

export const isEphemeralDb = () => !process.env.TURSO_DATABASE_URL && !!process.env.VERCEL;

// Every table is insert-only: triggers reject UPDATE and DELETE, so the audit log
// (release_events) is the single source of truth for status, owner, target date
// and checklist state. Current values are read through the views below.
const TABLES = ["products", "releases", "checklist_items", "release_events", "files"];

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  tagline    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  version     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  UNIQUE (product_id, version)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id),
  label      TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS release_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id  INTEGER NOT NULL REFERENCES releases(id),
  kind        TEXT NOT NULL CHECK (kind IN
                ('CREATED','STATUS','CHECKED','UNCHECKED','ITEM_ADDED','OWNER','TARGET_DATE','ATTACHMENT','NOTE')),
  actor       TEXT NOT NULL,
  -- snapshot of the release after this event
  status      TEXT NOT NULL CHECK (status IN ('PLANNED','IN_PROGRESS','IN_REVIEW','SHIPPED','ROLLED_BACK')),
  owner       TEXT NOT NULL,
  target_date TEXT,              -- YYYY-MM-DD
  -- what changed
  from_value  TEXT,              -- previous status / owner / date
  item_id     INTEGER REFERENCES checklist_items(id),
  note        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_release ON release_events(release_id, id);
CREATE INDEX IF NOT EXISTS idx_events_item ON release_events(item_id, id);

CREATE TABLE IF NOT EXISTS files (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id),
  event_id   INTEGER NOT NULL REFERENCES release_events(id),
  name       TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  data       BLOB NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_release ON files(release_id, id);

${TABLES.map(
  (t) => `
CREATE TRIGGER IF NOT EXISTS ${t}_no_update BEFORE UPDATE ON ${t}
BEGIN SELECT RAISE(ABORT, '${t} is append-only'); END;
CREATE TRIGGER IF NOT EXISTS ${t}_no_delete BEFORE DELETE ON ${t}
BEGIN SELECT RAISE(ABORT, '${t} is append-only'); END;`,
).join("")}

-- A checklist item is done when its most recent CHECKED/UNCHECKED event is CHECKED.
CREATE VIEW IF NOT EXISTS checklist_state AS
SELECT c.*,
  COALESCE(t.kind = 'CHECKED', 0) AS done,
  t.actor      AS toggled_by,
  t.created_at AS toggled_at
FROM checklist_items c
LEFT JOIN release_events t ON t.id = (
  SELECT MAX(id) FROM release_events WHERE item_id = c.id AND kind IN ('CHECKED','UNCHECKED')
);

CREATE VIEW IF NOT EXISTS release_state AS
SELECT r.*,
  p.slug AS product_slug,
  p.name AS product_name,
  last.status,
  last.owner,
  last.target_date,
  last.created_at AS updated_at,
  (SELECT COUNT(*) FROM checklist_items c WHERE c.release_id = r.id)            AS items_total,
  (SELECT COUNT(*) FROM checklist_state c WHERE c.release_id = r.id AND c.done) AS items_done,
  (SELECT COUNT(*) FROM files f WHERE f.release_id = r.id)                       AS file_count,
  (SELECT MIN(id) FROM files f WHERE f.release_id = r.id AND f.mime LIKE 'image/%') AS cover_file_id,
  (SELECT MIN(created_at) FROM release_events x WHERE x.release_id = r.id AND x.kind = 'STATUS' AND x.status = 'IN_PROGRESS') AS started_at,
  (SELECT MIN(created_at) FROM release_events x WHERE x.release_id = r.id AND x.kind = 'STATUS' AND x.status = 'SHIPPED')     AS first_shipped_at,
  (SELECT MAX(created_at) FROM release_events x WHERE x.release_id = r.id AND x.kind = 'STATUS' AND x.status = 'SHIPPED')     AS shipped_at,
  -- target date that applied at the moment it first shipped (for on-time stats)
  (SELECT x.target_date FROM release_events x WHERE x.release_id = r.id AND x.kind = 'STATUS' AND x.status = 'SHIPPED' ORDER BY x.id LIMIT 1) AS target_at_ship,
  (SELECT COUNT(*) FROM release_events x WHERE x.release_id = r.id AND x.kind = 'STATUS' AND x.status = 'ROLLED_BACK') AS rollback_count
FROM releases r
JOIN products p ON p.id = r.product_id
JOIN release_events last ON last.id = (SELECT MAX(id) FROM release_events WHERE release_id = r.id);
`;

export const DROP_ALL = `
DROP VIEW IF EXISTS release_state;
DROP VIEW IF EXISTS checklist_state;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS release_events;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS releases;
DROP TABLE IF EXISTS products;
`;

const globalForDb = globalThis as unknown as { __shipyardDb?: Promise<Client> };

async function init(): Promise<Client> {
  const client = createClient({ url: resolveUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
  await client.executeMultiple(SCHEMA);
  // Seed demo data into an empty local/ephemeral database. Hosted databases are
  // seeded explicitly with `npm run db:seed` so production never gets demo rows.
  if (!process.env.TURSO_DATABASE_URL || process.env.SEED_ON_EMPTY === "1") {
    const { rows } = await client.execute("SELECT COUNT(*) AS n FROM products");
    if (Number(rows[0].n) === 0) await seed(client);
  }
  return client;
}

export function db(): Promise<Client> {
  if (!globalForDb.__shipyardDb) {
    globalForDb.__shipyardDb = init().catch((err) => {
      globalForDb.__shipyardDb = undefined;
      throw err;
    });
  }
  return globalForDb.__shipyardDb;
}
