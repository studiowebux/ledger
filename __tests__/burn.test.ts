// deno run -A __tests__/burn.test.ts
import { Postgres } from "../src/db/postgres.class.ts";
import { PubSub } from "../src/kafka.ts";
import { Ledger } from "../src/ledger.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

const db = new Postgres(url);
const pubSub = new PubSub();
await pubSub.setupConsumer();
const ledger = new Ledger(db, pubSub);

await ledger.addFunds("test_wallet", [
  { amount: BigInt(600), unit: "tcoin" },
  { amount: BigInt(100), unit: "gold" },
]);

console.table({
  test_wallet: {
    balance: await ledger.getBalance("test_wallet"),
    utxos: (await ledger.getUtxos("test_wallet")).length,
  },
  test_wallet_1: {
    balance: await ledger.getBalance("test_wallet_1"),
    utxos: (await ledger.getUtxos("test_wallet_1")).length,
  },
});

await ledger.processRequest("test_tx", "test_wallet", "test_wallet_1", [
  { unit: "tcoin", amount: BigInt(500) },
]);
await ledger.waitForTransactions(["test_tx"]);
console.table({
  test_wallet: {
    balance: await ledger.getBalance("test_wallet"),
    utxos: (await ledger.getUtxos("test_wallet")).length,
  },
  test_wallet_1: {
    balance: await ledger.getBalance("test_wallet_1"),
    utxos: (await ledger.getUtxos("test_wallet_1")).length,
  },
});

await ledger.processRequest("test_tx_1", "test_wallet", "test_wallet", [
  { unit: "gold", amount: BigInt(-100) },
]);

await ledger.waitForTransactions(["test_tx_1"]);
console.table({
  test_wallet: {
    balance: await ledger.getBalance("test_wallet"),
    utxos: (await ledger.getUtxos("test_wallet")).length,
  },
  test_wallet_1: {
    balance: await ledger.getBalance("test_wallet_1"),
    utxos: (await ledger.getUtxos("test_wallet_1")).length,
  },
});

console.debug("Done.");
