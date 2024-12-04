// deno run -A __tests__/queue.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";
import { LedgerManager } from "../src/manager.class.ts";
import { BuyItem } from "../src/processors/buy-item.class.ts";
import { PostTransactionProcessor } from "../src/processors/post-transaction.class.ts";

function generateRandomRequests(config) {
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

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const processor = new PostTransactionProcessor();
processor.AddEvent("BuyItem", BuyItem);

const db = new Postgres(url);

await db.sql`TRUNCATE utxos;`;
await db.sql`TRUNCATE transactions;`;

const ledger = new Ledger(db);
await ledger.setupProducer();
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

const txs = await Promise.all([
  ledger.addRequest("alice", "bob", [{ amount: BigInt(1), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(2), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(3), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(4), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(5), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(6), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(7), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(8), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(9), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(10), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(11), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(12), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(13), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(14), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(15), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(16), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(17), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(18), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(19), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(20), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(21), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(22), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(23), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(24), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(25), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(26), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(27), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(28), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(29), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(30), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(31), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(32), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(33), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(34), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(35), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(36), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(37), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(38), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(39), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(40), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(41), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(42), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(43), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(44), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(45), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(46), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(47), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(48), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(49), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(50), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(51), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(52), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(53), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(54), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(55), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(56), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(57), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(58), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(59), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(60), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(61), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(62), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(63), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(64), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(65), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(66), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(67), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(68), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(69), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(70), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(71), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(72), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(73), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(74), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(75), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(76), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(77), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(78), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(79), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(80), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(81), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(82), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(83), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(84), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(85), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(86), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(87), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(88), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(89), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(90), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(91), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(92), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(93), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(94), unit: "gold" }]),
  ledger.addRequest("bob", "alice", [{ amount: BigInt(95), unit: "gold" }]),
  ledger.addRequest("ron", "bob", [{ amount: BigInt(96), unit: "gold" }]),
  ledger.addRequest("alice", "bob", [{ amount: BigInt(97), unit: "gold" }]),
  ledger.addRequest("bob", "ron", [{ amount: BigInt(98), unit: "gold" }]),
  ledger.addRequest("ron", "alice", [{ amount: BigInt(99), unit: "gold" }]),
  ledger.addRequest("alice", "ron", [{ amount: BigInt(100), unit: "gold" }]),
]);

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
await ledger.close();
