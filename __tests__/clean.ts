// deno run -A __tests__/clean.ts
import { kafkaAdmin } from "../src/kafka.ts";

await kafkaAdmin.admin().connect();
console.log(await kafkaAdmin.admin().listTopics());
console.log(
  await kafkaAdmin.admin().fetchTopicMetadata({ topics: ["transactions"] }),
);

await kafkaAdmin.admin().deleteTopics({
  topics: ["transactions"],
});

await kafkaAdmin.admin().disconnect();
