import Logger from "@studiowebux/deno-minilog";
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const logger = new Logger();
const db = new Postgres(url, logger);
const pubSub = new PubSub();
await pubSub.setupProducer();

const ledger = new Ledger({
  db,
  sendMessage: (topic, messages) => pubSub.sendMessage(topic, messages),
  logger,
});

const response = await ledger.addAssets(
  Deno.readTextFileSync("./sender/public.key").trim(),
  [{
    policy_id: "currency",
    name: "aether",
    amount: 100_000_000n, // 100 Aether
  }],
);

logger.info(response);
