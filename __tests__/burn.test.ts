// deno test -A __tests__/burn.test.ts
import { assertEquals } from "jsr:@std/assert";
import Logger from "@studiowebux/deno-minilog";

import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";
const logger = new Logger({ forkToPrint: [], hideForks: true });

Deno.test("Test contract interactions", async (t) => {
  const db = new Postgres(url, logger);
  const ledger = new Ledger({ db, logger });

  await db.sql`TRUNCATE utxos;`;
  await db.sql`TRUNCATE transactions;`;
  await db.sql`TRUNCATE contracts;`;

  await t.step("Init assets", async () => {
    await ledger.addAssets("test_wallet", [
      { amount: BigInt(600), unit: "tcoin" },
      { amount: BigInt(100), unit: "gold" },
    ]);

    assertEquals(
      { tcoin: 600n, gold: 100n },
      await ledger.getBalance("test_wallet"),
    );
    assertEquals({}, await ledger.getBalance("test_wallet_1"));
  });

  await t.step("Send 500tcoins from test_wallet to test_wallet_1", async () => {
    await db
      .createTransaction("test_tx", "test_wallet", "exchange")
      .catch(() => {
        //ignore error
      });
    await ledger.processRequest("test_tx", "test_wallet", "test_wallet_1", [
      { unit: "tcoin", amount: BigInt(500) },
    ]);
    await ledger.waitForTransactions(["test_tx"]);

    assertEquals(
      { tcoin: 100n, gold: 100n },
      await ledger.getBalance("test_wallet"),
    );
    assertEquals({ tcoin: 500n }, await ledger.getBalance("test_wallet_1"));
  });

  await t.step("Burn 100 gold from test_wallet", async () => {
    await db
      .createTransaction("test_tx_1", "test_wallet", "exchange")
      .catch(() => {
        //ignore error
      });
    await ledger.processRequest("test_tx_1", "test_wallet", "test_wallet", [
      { unit: "gold", amount: BigInt(-100) },
    ]);

    await ledger.waitForTransactions(["test_tx_1"]);
    assertEquals({ tcoin: 100n }, await ledger.getBalance("test_wallet"));
  });

  await t.step("Cleanup", async () => {
    await db.sql.end();
  });
});
