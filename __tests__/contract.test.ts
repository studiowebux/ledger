// deno run -A __tests__/contract.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const db = new Postgres(url);
const ledger = new Ledger(db, async () => {});

await db.sql`TRUNCATE utxos;`;
await db.sql`TRUNCATE transactions;`;
await db.sql`TRUNCATE contracts;`;

//
// Setup Assets and wallets
//

await ledger.addAssets("customer_1", [
  { amount: BigInt(10), unit: "coin" },
  { amount: BigInt(1), unit: "iron" },
]);
await ledger.addAssets("customer_2", [{ amount: BigInt(20), unit: "coin" }]);
await ledger.addAssets("store_1", [
  { amount: BigInt(10), unit: "gold" },
  { amount: BigInt(1_000_000), unit: "iron" },
]);

console.table({
  customer_1: {
    balance: await ledger.getBalance("customer_1"),
    utxos: (await ledger.getUtxos("customer_1")).length,
  },
  customer_2: {
    balance: await ledger.getBalance("customer_2"),
    utxos: (await ledger.getUtxos("customer_2")).length,
  },
  store_1: {
    balance: await ledger.getBalance("store_1"),
    utxos: (await ledger.getUtxos("store_1")).length,
  },
});

// ---

//
// Setup Contract
//

const contractId = await ledger.createContract("store_1", {
  outputs: [{ unit: "gold", amount: BigInt(1) }],
  inputs: [{ unit: "coin", amount: BigInt(10) }],
});

console.log("Contract ID", contractId);

console.table({
  customer_1: {
    balance: await ledger.getBalance("customer_1"),
    utxos: (await ledger.getUtxos("customer_1")).length,
  },
  customer_2: {
    balance: await ledger.getBalance("customer_2"),
    utxos: (await ledger.getUtxos("customer_2")).length,
  },
  store_1: {
    balance: await ledger.getBalance("store_1"),
    utxos: (await ledger.getUtxos("store_1")).length,
  },
  [contractId]: {
    balance: await ledger.getBalance(contractId),
    utxos: (await ledger.getUtxos(contractId)).length,
  },
});

//
// Execute contract
//

const txId = await db
  .createTransaction("test_buy_gold", "customer_1", "contract")
  .catch(() => {
    //ignore error
  });
await ledger.processContract(txId!, "customer_1", contractId);

console.table({
  customer_1: {
    balance: await ledger.getBalance("customer_1"),
    utxos: (await ledger.getUtxos("customer_1")).length,
  },
  customer_2: {
    balance: await ledger.getBalance("customer_2"),
    utxos: (await ledger.getUtxos("customer_2")).length,
  },
  store_1: {
    balance: await ledger.getBalance("store_1"),
    utxos: (await ledger.getUtxos("store_1")).length,
  },
  [contractId]: {
    balance: await ledger.getBalance(contractId),
    utxos: (await ledger.getUtxos(contractId)).length,
  },
});

// Not allowed.
// const c1 = await ledger.createContract("store_1", {
//   outputs: [{ unit: "gold", amount: BigInt(-1) }],
//   inputs: [{ unit: "coin", amount: BigInt(10) }],
// });

// FIXME: this is a hack, we need a step that regroup to avoid skipping
// const c2 = await ledger.createContract("store_1", {
//   outputs: [
//     { unit: "gold", amount: BigInt(1) },
//     { unit: "gold", amount: BigInt(1) },
//     { unit: "gold", amount: BigInt(1) },
//   ],
//   inputs: [{ unit: "coin", amount: BigInt(10) }],
// });

// console.table({
//   store_1: {
//     balance: await ledger.getBalance("store_1"),
//     utxos: (await ledger.getUtxos("store_1")).length,
//   },
//   [c2]: {
//     balance: await ledger.getBalance(c2),
//     utxos: (await ledger.getUtxos(c2)).length,
//   },
// });

// throws error as expected.
// const c3 = await ledger.createContract("store_1", {
//   outputs: [{ unit: "gold", amount: BigInt(20) }],
//   inputs: [{ unit: "coin", amount: BigInt(10) }],
// });

const c4 = await ledger.createContract("store_1", {
  outputs: [
    { unit: "gold", amount: BigInt(1) },
    { unit: "iron", amount: BigInt(100) },
  ],
  inputs: [{ unit: "coin", amount: BigInt(10) }],
});

console.table({
  store_1: {
    balance: await ledger.getBalance("store_1"),
    utxos: (await ledger.getUtxos("store_1")).length,
  },
  [c4]: {
    balance: await ledger.getBalance(c4),
    utxos: (await ledger.getUtxos(c4)).length,
  },
});

await db.sql.end();

// TODO: write a bunch of tests
// TODO: cancel a contracts and refund the owner wallet
