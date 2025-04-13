// deno run -A scripts/policy.ts
import { Postgres } from "../src/db/postgres.class.ts";
import Logger from "@studiowebux/deno-minilog";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const logger = new Logger();
const db = new Postgres(url, logger);

const genesis =
  "2d2d2d2d2d424547494e205055424c4943204b45592d2d2d2d2d0a4d436f77425159444b3256774179454153546e314537414f6539366348422b537946593236487154436d7239413358424f553035476c4a6e38366b3d0a2d2d2d2d2d454e44205055424c4943204b45592d2d2d2d2d0a";

// Capped and immutable asset
await db.createPolicy("tcoin", [genesis]);
await db.createPolicy("coin", [genesis]);

// Resources that can be transform to something else
await db.createPolicy("resource", [genesis], false);

await db.sql.end();
