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
ledger.addFunds("Alice", 100);
console.log("Alice's Balance:", ledger.getBalance("Alice"));

console.log("Transfer 30 from Alice to Bob");
manager.transferFunds("Alice", "Bob", 30);

printBalance(ledger);

console.log("Exchange 30 from Alice to Bob to Buy a boat_1");
manager.transferFunds("Alice", "Bob", 30, [
  { action: "BuyItem", itemId: "boat_1" },
]);

printBalance(ledger);

console.log("Exchange 5000 from Alice to Bob to Buy a car_1");
const utxo = ledger.addFunds("Alice", 4960);
printBalance(ledger);

manager.transferFunds("Alice", "Bob", 5000, [
  { action: "BuyItem", itemId: "car_1" },
]);

printBalance(ledger);

console.log("Test with empty wallet");
try {
  manager.transferFunds("Alice", "Bob", 5000, [
    { action: "BuyItem", itemId: "car_1" },
  ]);

  printBalance(ledger);
} catch {
  // nothing to do for this test.
}

console.log("Test Double spending");
try {
  ledger.processTransaction({
    inputs: [utxo.id],
    outputs: [{ amount: 1, recipient: "Bob" }],
  });
} catch (e) {
  console.error("Catched", (e as Error).message);
}

printBalance(ledger);

console.log("Send Alice 0 coins to herself");
manager.transferFunds("Alice", "Alice", 0);

printBalance(ledger);

console.log("Send Bob 500 coins to himself");
manager.transferFunds("Bob", "Bob", 555);

printBalance(ledger);

console.log("Sharing with Ron");
manager.transferFunds("Bob", "Ron", 1);
manager.transferFunds("Bob", "Ron", 2);
manager.transferFunds("Bob", "Ron", 3);
manager.transferFunds("Bob", "Ron", 5);

console.log("Ron gives back to Alice");
manager.transferFunds("Ron", "Alice", 1);

printBalance(ledger);

// console.log(ledger);
