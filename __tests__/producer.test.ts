// deno run -A __tests__/queue.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";
import { LedgerManager } from "../src/manager.class.ts";
import { BuyItem } from "../src/processors/buy-item.class.ts";
import { PostTransactionProcessor } from "../src/processors/post-transaction.class.ts";

function generateRandomRequests(config: {
  participants: string[];
  minAmount: number;
  maxAmount: number;
  unit: string;
  length: number;
}) {
  const {
    participants, // Array of participant names, e.g., ["alice", "bob", "ron"]
    minAmount, // Minimum amount to randomize
    maxAmount, // Maximum amount to randomize
    unit, // The unit for the transactions, e.g., "gold"
    length, // Number of requests to generate
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
      Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount,
    );

    return ledger.addRequest(from, to, [{ amount, unit }]);
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

const processor = new PostTransactionProcessor();
processor.AddEvent("BuyItem", BuyItem);

const db = new Postgres(url);
const pubSub = new PubSub();

await pubSub.setupProducer();

await db.sql`TRUNCATE utxos;`;
await db.sql`TRUNCATE transactions;`;

const ledger = new Ledger(db, pubSub);
const manager = new LedgerManager(ledger, processor);

await ledger.addFunds("alice", [
  { amount: BigInt(1000), unit: "gold" },
  { amount: BigInt(777), unit: "silver" },
  { amount: BigInt(10_000), unit: "coin" },
]);
await printBalance(ledger);

await ledger.addFunds("alice", [{ amount: BigInt(1230), unit: "gold" }]);
await ledger.addFunds("ron", [{ amount: BigInt(5550), unit: "gold" }]);
await ledger.addFunds("bob", [{ amount: BigInt(345), unit: "gold" }]);
await printBalance(ledger);

const txId = await ledger.addRequest("alice", "bob", [
  { amount: BigInt(500), unit: "gold" },
]);

await ledger.waitForTransactions([txId]);
await printBalance(ledger);

const txId1 = await ledger.addRequest("bob", "ron", [
  { amount: BigInt(124), unit: "gold" },
]);
await ledger.waitForTransactions([txId1]);
await printBalance(ledger);

const requests1 = generateRandomRequests({
  participants: ["alice", "bob", "ron"],
  minAmount: 1,
  maxAmount: 100,
  unit: "gold",
  length: 10,
});

const txs = await Promise.all(requests1);

await ledger.waitForTransactions(txs);
await printBalance(ledger);

const txId2 = await manager.transferFunds(
  "alice",
  "bob",
  [{ unit: "coin", amount: BigInt(5_000) }],
  [{ action: "BuyItem", itemId: "car_1" }],
);

await ledger.waitForTransactions([txId2]);
await printBalance(ledger);

await ledger.addFunds("ron", [
  { unit: "coin", amount: BigInt(3_333_666_666_999_999) },
]);
await printBalance(ledger);

const requests = generateRandomRequests({
  participants: ["alice", "bob", "ron"],
  minAmount: 1,
  maxAmount: 100,
  unit: "gold",
  length: 1000,
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
