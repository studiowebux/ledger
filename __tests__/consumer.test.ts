// deno run -A __tests__/consumer.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const db = new Postgres(url);
const pubSub = new PubSub();
await pubSub.setupConsumer();
const ledger = new Ledger({ db });
await pubSub.consume((message) => ledger.process(message));
// will run indefinitely
