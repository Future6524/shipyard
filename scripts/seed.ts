/**
 * Wipes and re-seeds the database with the demo products and releases.
 *   npm run db:seed                         -> ./data/shipyard.db
 *   TURSO_DATABASE_URL=... npm run db:seed  -> hosted database (destroys its data!)
 */
import { createClient } from "@libsql/client";
import { DROP_ALL, SCHEMA } from "../src/lib/db";
import { seed } from "../src/lib/seed";

async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? "file:data/shipyard.db";
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  // DROP bypasses the append-only triggers; this is the one deliberate escape hatch.
  if (process.argv.includes("--reset")) await client.executeMultiple(DROP_ALL);
  await client.executeMultiple(SCHEMA);
  await seed(client);
  const { rows } = await client.execute(
    "SELECT product_name AS product, status, COUNT(*) AS n FROM release_state GROUP BY 1, 2 ORDER BY 1, 2",
  );
  console.log(`Seeded ${url}`);
  console.table(rows.map((r) => ({ product: r.product, status: r.status, releases: Number(r.n) })));
  const ev = await client.execute("SELECT COUNT(*) n FROM release_events");
  console.log(`${ev.rows[0].n} audit entries`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
