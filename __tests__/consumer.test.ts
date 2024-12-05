// deno run -A __tests__/consumer.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";
import { BuyItem } from "../src/processors/buy-item.class.ts";
import { PostTransactionProcessor } from "../src/processors/post-transaction.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const processor = new PostTransactionProcessor();
processor.AddEvent("BuyItem", BuyItem);

const db = new Postgres(url);
const pubSub = new PubSub();
await pubSub.setupConsumer();
const ledger = new Ledger(db);
await pubSub.consume((message) => ledger.process(message));
// will run indefinitely
