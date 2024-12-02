// import { assertEquals } from "@std/assert";

import { Ledger } from "../src/ledger.class.ts";
import { LedgerManager } from "../src/manager.class.ts";
import { Database } from "../src/mocks/database.class.ts";
import { BuyItem } from "../src/processors/buy-item.class.ts";
import { PostTransactionProcessor } from "../src/processors/post-transaction.class.ts";

function printBalance(ledger: Ledger) {
  console.table({
    Alice: {
      balance: ledger.getBalance("Alice"),
      utxos: ledger.getUtxos("Alice").length,
    },
    Bob: {
      balance: ledger.getBalance("Bob"),
      utxos: ledger.getUtxos("Bob").length,
    },
    Ron: {
      balance: ledger.getBalance("Ron"),
      utxos: ledger.getUtxos("Ron").length,
    },
  });
}

const processor = new PostTransactionProcessor();
processor.AddEvent("BuyItem", BuyItem);

const db = new Database();
const ledger = new Ledger(db);
const manager = new LedgerManager(ledger, processor);

// Add funds to Alice
ledger.addFunds("Alice", [
  { unit: "coin", amount: BigInt(100) },
  { unit: "gold", amount: BigInt(1_000) },
]);
console.log("Alice's Balance:", ledger.getBalance("Alice"));

console.log("Transfer 30 from Alice to Bob");
manager.transferFunds("Alice", "Bob", [{ unit: "coin", amount: BigInt(30) }]);

printBalance(ledger);

console.log("Exchange 30 from Alice to Bob to Buy a boat_1");
manager.transferFunds(
  "Alice",
  "Bob",
  [{ unit: "coin", amount: BigInt(30) }],
  [{ action: "BuyItem", itemId: "boat_1" }],
);

printBalance(ledger);

console.log("Exchange 5000 from Alice to Bob to Buy a car_1");
const utxo = ledger.addFunds("Alice", [
  { unit: "coin", amount: BigInt(4_960) },
]);
printBalance(ledger);

manager.transferFunds(
  "Alice",
  "Bob",
  [{ unit: "coin", amount: BigInt(5_000) }],
  [{ action: "BuyItem", itemId: "car_1" }],
);

printBalance(ledger);

console.log("Test with empty wallet");
try {
  manager.transferFunds(
    "Alice",
    "Bob",
    [{ unit: "coin", amount: BigInt(5_000) }],
    [{ action: "BuyItem", itemId: "car_1" }],
  );

  printBalance(ledger);
} catch {
  // nothing to do for this test.
}

// console.log("Test Double spending");
// try {
//   ledger.processTransaction({
//     inputs: [utxo.id],
//     outputs: [{ amount: 1, recipient: "Bob" }],
//   });
// } catch (e) {
//   console.error("Catched", (e as Error).message);
// }

printBalance(ledger);

console.log("Send Alice 0 coins to herself");
try {
  manager.transferFunds("Alice", "Alice", [
    { unit: "coin", amount: BigInt(0) },
  ]);
  printBalance(ledger);
} catch {
  // nothing to do.
}

console.log("Send Bob 500 coins to himself");
manager.transferFunds("Bob", "Bob", [{ unit: "coin", amount: BigInt(555) }]);

printBalance(ledger);

console.log("Sharing with Ron");
manager.transferFunds("Bob", "Ron", [{ unit: "coin", amount: BigInt(1) }]);
manager.transferFunds("Bob", "Ron", [{ unit: "coin", amount: BigInt(2) }]);
manager.transferFunds("Bob", "Ron", [{ unit: "coin", amount: BigInt(3) }]);
manager.transferFunds("Bob", "Ron", [{ unit: "coin", amount: BigInt(5) }]);

console.log("Ron gives back to Alice");
manager.transferFunds("Ron", "Alice", [{ unit: "coin", amount: BigInt(1) }]);

printBalance(ledger);

console.log("Testing negative value");
try {
  manager.transferFunds("Ron", "Alice", [
    { unit: "coin", amount: BigInt(-10) },
  ]);

  printBalance(ledger);
} catch {
  // nothing to do.
}

printBalance(ledger);
// console.log(ledger);
