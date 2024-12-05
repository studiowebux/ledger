// deno run -A __tests__/policy.test.ts
import { Postgres } from "../src/db/postgres.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const db = new Postgres(url);

// Capped and immutable asset
await db.createPolicy("tcoin");
await db.createPolicy("coin");

// Resources that can be transform to something else
await db.createPolicy("gold", false);
await db.createPolicy("silver", false);
await db.createPolicy("iron", false);

await db.sql.end();
