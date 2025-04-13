import { assertEquals, assertRejects } from "@std/assert";

import Logger from "@studiowebux/deno-minilog";

import { Postgres } from "../src/db/postgres.class.ts";
import { assertNotEquals } from "@std/assert/not-equals";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

// TODO (as of 2025-04-13)
// Test all contract interactions,

Deno.test("Test Database calls", async (t) => {
  const logger = new Logger();
  const db = new Postgres(url, logger);

  await db.sql`TRUNCATE utxos;`;
  await db.sql`TRUNCATE transactions;`;
  await db.sql`TRUNCATE contracts;`;
  await db.sql`TRUNCATE policies;`;

  await t.step("Create immutable policy", async () => {
    const response = await db.createPolicy("currency", [], true);

    assertEquals(response, "currency");
  });

  await t.step("Create mutable policy", async () => {
    const response = await db.createPolicy("resource", [], false);

    assertEquals(response, "resource");
  });

  await t.step("Create already existing policy", () => {
    assertRejects(
      async () => {
        await db.createPolicy("resource", [], false);
      },
      `PostgresError: duplicate key value violates unique constraint "policies_pkey"`,
    );
  });

  await t.step("Find non existing Policy by policy_id", () => {
    assertRejects(
      async () => {
        await db.findPolicy("does_not_exist");
      },
      "Policy does_not_exist not found",
    );
  });

  await t.step("Find Policy by policy_id (mutable)", async () => {
    const response = await db.findPolicy("resource");
    assertEquals(response, {
      policy_id: "resource",
      immutable: false,
      owner: [],
    });
  });

  await t.step("Find Policy by policy_id (immutable)", async () => {
    const response = await db.findPolicy("currency");
    assertEquals(response, {
      policy_id: "currency",
      immutable: true,
      owner: [],
    });
  });

  await t.step("Create a dummy UTXO", async () => {
    const response = await db.createUTXO("test_owner", {
      id: "1",
      assets: [{
        policy_id: "currency",
        amount: 100_000_000n, // 100CAD
        name: "TCG",
      }],
      owner: "test_owner",
      spent: false,
    }, { sql: db.sql });

    assertEquals(response, "1");
  });

  await t.step("Create an existing UTXO id", () => {
    assertRejects(
      async () => {
        await db.createUTXO("test_owner", {
          id: "1",
          assets: [{
            policy_id: "currency",
            amount: 100_000_000n, // 100TCG
            name: "TCG",
          }],
          owner: "test_owner",
          spent: false,
        }, { sql: db.sql });
      },
      `PostgresError: duplicate key value violates unique constraint "utxos_pkey"`,
    );
  });

  await t.step("Create and find UTXOs", async () => {
    const id = await db.createUTXO("test_owner", {
      id: "2",
      assets: [{
        policy_id: "currency",
        amount: 10_000_000n, // 10TCG
        name: "TCG",
      }],
      owner: "test_owner",
      spent: false,
    }, { sql: db.sql });

    assertEquals(id, "2");

    const response = await db.findUTXO(id);

    assertEquals(response, {
      id: "2",
      owner: "test_owner",
      assets: [{
        "policy_id": "currency",
        "amount": BigInt(10000000),
        "name": "TCG",
      }],
      spent: false,
      created_at: response.created_at,
      updated_at: response.updated_at,
    });

    const responseAllUnspentUtxos = await db.findUTXOFor("test_owner", {
      sql: db.sql,
    });

    assertEquals(responseAllUnspentUtxos, [{
      id: "1",
      assets: [{
        policy_id: "currency",
        amount: 100_000_000n, // 100TCG
        name: "TCG",
      }],
      owner: "test_owner",
      spent: false,
      created_at: responseAllUnspentUtxos[0].created_at,
      updated_at: responseAllUnspentUtxos[0].updated_at,
    }, {
      id: "2",
      owner: "test_owner",
      assets: [{
        "policy_id": "currency",
        "amount": BigInt(10000000),
        "name": "TCG",
      }],
      spent: false,
      created_at: responseAllUnspentUtxos[1].created_at,
      updated_at: responseAllUnspentUtxos[1].updated_at,
    }]);
  });

  await t.step("Update existing UTXO, mark it spent", async () => {
    const response = await db.updateUTXO("2", true, { sql: db.sql });

    assertEquals(response, "2");

    const responseAllUnspentUtxos = await db.findUTXOFor("test_owner", {
      sql: db.sql,
    });

    assertEquals(responseAllUnspentUtxos, [{
      id: "1",
      assets: [{
        policy_id: "currency",
        amount: 100_000_000n, // 100TCG
        name: "TCG",
      }],
      owner: "test_owner",
      spent: false,
      created_at: responseAllUnspentUtxos[0].created_at,
      updated_at: responseAllUnspentUtxos[0].updated_at,
    }]);
  });

  await t.step("Create new Exchange Transaction", async () => {
    const id = await db.createTransaction(
      "tx-1",
      "test_owner",
      "exchange",
      "sig-1",
    );

    assertEquals(id, "tx-1");

    const transaction = await db.findTransaction(id);

    assertEquals(transaction, {
      id: "tx-1",
      owner: "test_owner",
      assets: [],
      filed: false,
      failed: false,
      reason: "",
      type: "exchange",
      signature: "sig-1",
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    });

    const updated = await db.updateTransaction(id, true, [], "Testing", true, {
      sql: db.sql,
    });
    assertEquals(updated, "tx-1");

    const transactionAfterUpdate = await db.findTransaction(id);

    assertEquals(transactionAfterUpdate, {
      id: "tx-1",
      owner: "test_owner",
      assets: [],
      filed: true,
      failed: true,
      reason: "Testing",
      type: "exchange",
      signature: "sig-1",
      created_at: transactionAfterUpdate.created_at,
      updated_at: transactionAfterUpdate.updated_at,
    });

    assertNotEquals(transaction.updated_at, transactionAfterUpdate.updated_at);
    assertEquals(transaction.created_at, transactionAfterUpdate.created_at);
  });

  await t.step("Cleanup", async () => {
    await db.sql.end();
  });
});
