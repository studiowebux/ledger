import Logger from "@studiowebux/deno-minilog";
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";

function generateRandomRequests(config: {
  participants: string[];
  minAmount: number;
  maxAmount: number;
  policy_id: string;
  name: string;
  length: number;
  signature: string;
}) {
  const {
    participants, // Array of participant names, e.g., ["alice", "bob", "ron"]
    minAmount, // Minimum amount to randomize
    maxAmount, // Maximum amount to randomize
    policy_id,
    name, // The resource for the transactions, e.g., "gold"
    length, // Number of requests to generate
    signature,
  } = config;

  if (participants.length < 2) {
    throw new Error("At least two participants are required.");
  }

  return Array.from({ length }, () => {
    // Randomly select two different participants
    const from = participants[Math.floor(Math.random() * participants.length)];
    let to;
    do {
      to = participants[Math.floor(Math.random() * participants.length)];
    } while (to === from); // Ensure `to` is different from `from`

    // Randomize the amount
    const amount = BigInt(
      Math.floor(Math.random() * (maxAmount - minAmount + 1)) +
        minAmount,
    );

    return ledger.addRequest(
      from,
      to,
      [{ amount, policy_id, name }],
      signature,
    );
  });
}

async function printBalance(ledger: Ledger) {
  console.table({
    alice: {
      balance: await ledger.getBalance("alice"),
      utxos: (await ledger.getUtxos("alice")).length,
    },
    bob: {
      balance: await ledger.getBalance("bob"),
      utxos: (await ledger.getUtxos("bob")).length,
    },
    ron: {
      balance: await ledger.getBalance("ron"),
      utxos: (await ledger.getUtxos("ron")).length,
    },
  });

  console.log("\n\n");
}

console.time("1013_txs");

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const logger = new Logger();
const db = new Postgres(url, logger);
const pubSub = new PubSub();

await pubSub.setupProducer();

await db.sql`TRUNCATE utxos;`;
await db.sql`TRUNCATE transactions;`;

const ledger = new Ledger({
  db,
  sendMessage: (topic, messages) => pubSub.sendMessage(topic, messages),
  logger,
});

await ledger.addAssets("alice", [
  { amount: BigInt(1000), policy_id: "resource", name: "gold" },
  { amount: BigInt(777), policy_id: "resource", name: "silver" },
  { amount: BigInt(10_000), policy_id: "currency", name: "coin" },
]);
await printBalance(ledger);

await ledger.addAssets("alice", [{
  amount: BigInt(1230),
  policy_id: "resource",
  name: "gold",
}]);
await ledger.addAssets("ron", [{
  amount: BigInt(5550),
  policy_id: "resource",
  name: "gold",
}]);
await ledger.addAssets("bob", [{
  amount: BigInt(345),
  policy_id: "resource",
  name: "gold",
}]);
await printBalance(ledger);

const txId = await ledger.addRequest("alice", "bob", [
  { amount: BigInt(500), policy_id: "resource", name: "gold" },
], "sig-1");

await ledger.waitForTransactions([txId]);
await printBalance(ledger);

const txId1 = await ledger.addRequest("bob", "ron", [
  { amount: BigInt(124), policy_id: "resource", name: "gold" },
], "sig-1");
await ledger.waitForTransactions([txId1]);
await printBalance(ledger);

const requests1 = generateRandomRequests({
  participants: ["alice", "bob", "ron"],
  minAmount: 1,
  maxAmount: 100,
  policy_id: "resource",
  name: "gold",
  length: 10,
  signature: "sig-1",
});

const txs = await Promise.all(requests1);

await ledger.waitForTransactions(txs);
await printBalance(ledger);

await ledger.addAssets("ron", [
  {
    policy_id: "currency",
    name: "coin",
    amount: BigInt(3_333_666_666_999_999),
  },
]);
await printBalance(ledger);

const requests = generateRandomRequests({
  participants: ["alice", "bob", "ron"],
  minAmount: 1,
  maxAmount: 100,
  policy_id: "resource",
  name: "gold",
  length: 1000,
  signature: "sig-1",
});

const txs1 = await Promise.all(requests);
await ledger.waitForTransactions(txs1, 500, 120_000);
await printBalance(ledger);

// Stop when all txs are processed
await db.sql.end();
await pubSub.close();

console.timeEnd("1013_txs");
// 3_333_666_667_009_999 coins
// 777 silver
// 8125 gold
