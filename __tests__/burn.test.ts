// deno test -A __tests__/burn.test.ts
import { assertEquals } from "jsr:@std/assert";
import Logger from "@studiowebux/deno-minilog";

import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";
import { assertRejects } from "@std/assert/rejects";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";
const logger = new Logger({});

Deno.test("Test contract interactions", async (t) => {
  const db = new Postgres(url, logger);
  const ledger = new Ledger({ db, logger });

  await db.sql`TRUNCATE utxos;`;
  await db.sql`TRUNCATE transactions;`;
  await db.sql`TRUNCATE contracts;`;

  await t.step("Init assets", async () => {
    await ledger.addAssets("test_wallet_sender", [
      { amount: BigInt(600), policy_id: "tcoin", name: "tcoin" },
      { amount: BigInt(100), policy_id: "resource", name: "gold" },
    ]);

    assertEquals(
      await ledger.getBalance("test_wallet_sender"),
      { "tcoin.tcoin": BigInt(600), "resource.gold": BigInt(100) },
    );
    assertEquals({}, await ledger.getBalance("test_wallet_receiver"));
  });

  await t.step(
    "Send 500tcoins from test_wallet to test_wallet_receiver",
    async () => {
      await db
        .createTransaction("test_tx", "test_wallet_sender", "exchange", "sig-1")
        .catch(() => {
          //ignore error
        });
      await ledger.processRequest(
        "test_tx",
        "test_wallet_sender",
        "test_wallet_receiver",
        [
          { policy_id: "tcoin", name: "tcoin", amount: BigInt(500) },
        ],
      );
      await ledger.waitForTransactions(["test_tx"]);

      assertEquals(
        await ledger.getBalance("test_wallet_sender"),
        { "tcoin.tcoin": BigInt(100), "resource.gold": BigInt(100) },
      );
      assertEquals(
        await ledger.getBalance("test_wallet_receiver"),
        { "tcoin.tcoin": BigInt(500) },
      );
    },
  );

  await t.step("Burn 100 gold from test_wallet", async () => {
    await db
      .createTransaction("test_tx_1", "test_wallet_sender", "exchange", "sig-1")
      .catch(() => {
        //ignore error
      });
    await ledger.processRequest(
      "test_tx_1",
      "test_wallet_sender",
      "test_wallet_sender",
      [
        { policy_id: "resource", name: "gold", amount: BigInt(-100) },
      ],
    );

    await ledger.waitForTransactions(["test_tx_1"]);
    assertEquals(
      { "tcoin.tcoin": BigInt(100) },
      await ledger.getBalance("test_wallet_sender"),
    );
  });

  await t.step("Burn 10 tcoin from test_wallet_sender", async () => {
    await db
      .createTransaction("test_tx_2", "test_wallet_sender", "exchange", "sig-1")
      .catch(() => {
        //ignore error
      });

    assertRejects(async () => {
      await ledger.processRequest(
        "test_tx_2",
        "test_wallet_sender",
        "test_wallet_sender",
        [
          { policy_id: "tcoin", name: "tcoin", amount: BigInt(-10) },
        ],
      );
    });

    assertEquals(
      { "tcoin.tcoin": BigInt(100) },
      await ledger.getBalance("test_wallet_sender"),
    );
  });

  await t.step("Cleanup", async () => {
    await db.sql.end();
  });
});
