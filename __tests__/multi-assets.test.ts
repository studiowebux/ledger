import { Ledger } from "../src/ledger.class.ts";
import { Database } from "../src/mocks/database.class.ts";

const db = new Database();
const ledger = new Ledger(db);

ledger.addFunds("wallet_1", [
  { amount: BigInt(1000), unit: "gold" },
  { amount: BigInt(777), unit: "silver" },
  { amount: BigInt(10_000), unit: "coin" },
]);
ledger.addFunds("wallet_1", [{ amount: BigInt(123), unit: "gold" }]);

ledger.processTransaction("wallet_1", "wallet_2", [
  { amount: BigInt(500), unit: "gold" },
]);

ledger.processTransaction("wallet_1", "wallet_2", [
  { amount: BigInt(124), unit: "gold" },
]);

console.log(ledger.getBalance("wallet_1"), ledger.getUtxos("wallet_1"));
console.log(ledger.getBalance("wallet_2"), ledger.getUtxos("wallet_2"));

console.log(
  JSON.stringify(
    ledger,
    (_, value) => (typeof value === "bigint" ? Number(value) : value),
    2,
  ),
);
