// 2025-02-02: this is not an order book, That was my initial goal...
// but seems to require a lot more layers.

// deno run -A direct_listing.ts
import Logger from "@studiowebux/deno-minilog";
import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const logger = new Logger();
const db = new Postgres(url, logger);
const ledger = new Ledger({ db, logger });

await db.sql`TRUNCATE utxos;`;
await db.sql`TRUNCATE transactions;`;
await db.sql`TRUNCATE contracts;`;

// Add 10 coins and 1000 irons to customer_1 ledger
await ledger.addAssets("customer_1", [
  { amount: 10, unit: "coin" },
  { amount: 1000, unit: "iron" },
]);

// Add 1000 coins to customer_2 ledger
await ledger.addAssets("customer_2", [{ amount: 1000, unit: "coin" }]);

// { coin: 10n, iron: 1000n }
console.log(await ledger.getBalance("customer_1"));
// { coin: 1000n }
console.log(await ledger.getBalance("customer_2"));

// Create a contract to "sell" 500 irons for the price of 100 coins, the contract is created by "customer_1" wallet
const contractId = await ledger.createContract("customer_1", {
  inputs: [{ unit: "coin", amount: 1000 }],
  outputs: [{ unit: "iron", amount: 500 }],
});

console.log(contractId);

// Create another contract to "sell" 500 irons for the price of 200 coins, the contract is created by "customer_1" wallet
const contractId2 = await ledger.createContract("customer_1", {
  inputs: [{ unit: "coin", amount: 200 }],
  outputs: [{ unit: "iron", amount: 500 }],
});

console.log(contractId2);

// At this point customer 1 has 10 coins and 2 contracts
// customer_2 has 1000 coins.
// { coin: 10n }
console.log(await ledger.getBalance("customer_1"));
// { coin: 1000n }
console.log(await ledger.getBalance("customer_2"));

// ---

// Prepare a trancsaction to buy 500 irons (using the first contract) by customer 2
const txId = await db
  .createTransaction("buy_iron_partial", "customer_2", "exchange")
  .catch(() => {
    //ignore error
  });

await ledger.processContract(txId!, "customer_2", contractId, [
  { amount: 4, unit: "coin" }, // should do a partial buy of 2 irons in exchange of 4 coins
]);

// { coin: 60n }
console.log(await ledger.getBalance("customer_1"));
// { coin: 950n, iron: 250n }
console.log(await ledger.getBalance("customer_2"));
// { iron: 250n }
console.log(await ledger.getBalance(contractId));
// { iron: 500n }
console.log(await ledger.getBalance(contractId2));

// ---

await db.sql.end();
