// docker run -it -p 5432:5432 --name ledger -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ledger postgres
// deno run -A __tests__/pg.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";
import { BuyItem } from "../src/processors/buy-item.class.ts";
import { PostTransactionProcessor } from "../src/processors/post-transaction.class.ts";
import { LedgerManager } from "../src/manager.class.ts";

async function printBalance(ledger: Ledger) {
  console.table({
    Alice: {
      balance: await ledger.getBalance("Alice"),
      utxos: (await ledger.getUtxos("Alice")).length,
    },
    Bob: {
      balance: await ledger.getBalance("Bob"),
      utxos: (await ledger.getUtxos("Bob")).length,
    },
    Ron: {
      balance: await ledger.getBalance("Ron"),
      utxos: (await ledger.getUtxos("Ron")).length,
    },
  });

  console.log("\n\n");
}

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const processor = new PostTransactionProcessor();
processor.AddEvent("BuyItem", BuyItem);

const db = new Postgres(url);

await db.sql`TRUNCATE utxos;`;

const ledger = new Ledger(db);
const manager = new LedgerManager(ledger, processor);

await ledger.addFunds("Alice", [
  { amount: BigInt(1000), unit: "gold" },
  { amount: BigInt(777), unit: "silver" },
  { amount: BigInt(10_000), unit: "coin" },
]);
await printBalance(ledger);
await ledger.addFunds("Alice", [{ amount: BigInt(123), unit: "gold" }]);
await printBalance(ledger);
ledger.addRequest("Alice", "Bob", [{ amount: BigInt(500), unit: "gold" }]);
printBalance(ledger);
ledger.addRequest("Alice", "Bob", [{ amount: BigInt(124), unit: "gold" }]);
await printBalance(ledger);

// send 55 gold from alice to bob (expect 679 gold to bob)
// Throw an error if already spent.
await Promise.all([
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(1), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(2), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(3), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(4), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(5), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(6), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(7), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(8), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(9), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(10), unit: "gold" }]),
]);
// console.log(ledger.getQueue().getItems("Alice"));
await printBalance(ledger);

// console.log(await ledger.getBalance("Alice"), await ledger.getUtxos("Alice"));
// console.log(await ledger.getBalance("Bob"), await ledger.getUtxos("Bob"));

console.log("Exchange 5000 from Alice to Bob to Buy a car_1");

await manager.transferFunds(
  "Alice",
  "Bob",
  [{ unit: "coin", amount: BigInt(5_000) }],
  [{ action: "BuyItem", itemId: "car_1" }],
);
await printBalance(ledger);

await ledger.addFunds("Ron", [
  { unit: "coin", amount: BigInt(3_333_666_666_999_999) },
]);
await printBalance(ledger);

await ledger.getQueue().waitForAllCompletion();

await Promise.all([
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(1), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(1), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(2), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(2), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(3), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(3), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(4), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(4), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(5), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(5), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(6), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(6), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(7), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(7), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(8), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(8), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(9), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(9), unit: "gold" }]),
  ledger.addRequest("Bob", "Alice", [{ amount: BigInt(10), unit: "gold" }]),
  ledger.addRequest("Alice", "Bob", [{ amount: BigInt(10), unit: "gold" }]),
]);

await ledger.getQueue().waitForAllCompletion();
await printBalance(ledger);

console.log("DLQ", ledger.getQueue().getDeadLetterQueue());

await db.sql.end();
