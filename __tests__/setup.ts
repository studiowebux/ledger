// deno run -A __tests__/setup.ts
import { kafkaAdmin } from "../src/kafka.ts";

await kafkaAdmin.admin().connect();

await kafkaAdmin.admin().createTopics({
  topics: [{ topic: "transactions", numPartitions: 6 }],
  waitForLeaders: true,
});

await kafkaAdmin.admin().disconnect();
