// deno run -A __tests__/clean.ts
import { kafkaAdmin } from "../src/kafka.ts";

await kafkaAdmin.admin().connect();
console.log(await kafkaAdmin.admin().listTopics());

await kafkaAdmin.admin().deleteTopics({
  topics: ["transactions"],
});

await kafkaAdmin.admin().disconnect();
