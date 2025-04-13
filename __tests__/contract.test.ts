// deno test -A __tests__/contract.test.ts
import { assertEquals, assertRejects } from "jsr:@std/assert";
import Logger from "@studiowebux/deno-minilog";
import { Postgres } from "../src/db/postgres.class.ts";
import { Ledger } from "../src/ledger.class.ts";
import { parseAssets } from "../src/encoder_decoder.ts";
import { Contract } from "../src/types.ts";

const url = "postgres://postgres:password@127.0.0.1:5432/ledger";

Deno.test("Test contract interactions", async (t) => {
  let contractId = "";
  const logger = new Logger();
  const db = new Postgres(url, logger);
  const ledger = new Ledger({ db, logger });

  await db.sql`TRUNCATE utxos;`;
  await db.sql`TRUNCATE transactions;`;
  await db.sql`TRUNCATE contracts;`;

  await t.step("Add Initial Assets", async () => {
    await ledger.addAssets("customer_1", [
      { amount: BigInt(10), unit: "coin" },
      { amount: BigInt(1), unit: "iron" },
    ]);
    assertEquals(
      {
        coin: 10n,
        iron: 1n,
      },
      await ledger.getBalance("customer_1"),
    );
    await ledger.addAssets("customer_2", [
      { amount: BigInt(20), unit: "coin" },
    ]);
    assertEquals(
      {
        coin: 20n,
      },
      await ledger.getBalance("customer_2"),
    );
    await ledger.addAssets("store_1", [
      { amount: BigInt(10), unit: "gold" },
      { amount: BigInt(1_000_000), unit: "iron" },
    ]);
    assertEquals(
      {
        iron: 1_000_000n,
        gold: 10n,
      },
      await ledger.getBalance("store_1"),
    );
  });

  await t.step("Create contract", async () => {
    contractId = await ledger.createContract("store_1", {
      outputs: [{ unit: "gold", amount: BigInt(1) }],
      inputs: [{ unit: "coin", amount: BigInt(10) }],
    });
    const contract = await db.findContract(contractId);
    const parsedContract: Contract = {
      ...contract,
      inputs: parseAssets(contract.inputs),
      outputs: parseAssets(contract.outputs),
    };
    assertEquals(
      {
        inputs: [{ unit: "coin", amount: 10n }],
        outputs: [{ unit: "gold", amount: 1n }],
        executed: false,
        owner: "store_1",
        id: contractId,
      },
      parsedContract,
    );
  });

  await t.step("Process contract", async () => {
    const txId = await db
      .createTransaction("test_buy_gold", "customer_1", "contract")
      .catch(() => {
        //ignore error
      });
    await ledger.processContract(txId!, "customer_1", contractId);
    assertEquals(
      {
        gold: 1n,
        iron: 1n,
      },
      await ledger.getBalance("customer_1"),
    );
    assertEquals(
      {
        gold: 9n,
        iron: 1_000_000n,
      },
      await ledger.getBalance("store_1"),
    );
  });

  await t.step("Error handling contract creation negative value", () => {
    assertRejects(async () => {
      await ledger.createContract("store_1", {
        outputs: [{ unit: "gold", amount: BigInt(-1) }],
        inputs: [{ unit: "coin", amount: BigInt(10) }],
      });
    });
  });

  await t.step("Error handling contract creation too many resource", () => {
    assertRejects(async () => {
      await ledger.createContract("store_1", {
        outputs: [{ unit: "gold", amount: BigInt(20) }],
        inputs: [{ unit: "coin", amount: BigInt(10) }],
      });
    });
  });

  await t.step("Create another contract", async () => {
    const contractId = await ledger.createContract("store_1", {
      outputs: [
        { unit: "gold", amount: BigInt(1) },
        { unit: "iron", amount: BigInt(100) },
      ],
      inputs: [{ unit: "coin", amount: BigInt(10) }],
    });

    const contract = await db.findContract(contractId);
    const parsedContract: Contract = {
      ...contract,
      inputs: parseAssets(contract.inputs),
      outputs: parseAssets(contract.outputs),
    };
    assertEquals(
      {
        inputs: [{ unit: "coin", amount: 10n }],
        outputs: [
          { unit: "gold", amount: 1n },
          { unit: "iron", amount: 100n },
        ],
        executed: false,
        owner: "store_1",
        id: contractId,
      },
      parsedContract,
    );
  });

  await t.step("Adding separated resource", async () => {
    const contractId = await ledger.createContract("store_1", {
      outputs: [
        { unit: "gold", amount: BigInt(1) },
        { unit: "gold", amount: BigInt(1) },
        { unit: "gold", amount: BigInt(1) },
      ],
      inputs: [{ unit: "coin", amount: BigInt(10) }],
    });

    const contract = await db.findContract(contractId);
    const parsedContract: Contract = {
      ...contract,
      inputs: parseAssets(contract.inputs),
      outputs: parseAssets(contract.outputs),
    };
    assertEquals(
      {
        inputs: [{ unit: "coin", amount: 10n }],
        outputs: [{ unit: "gold", amount: 3n }],
        executed: false,
        owner: "store_1",
        id: contractId,
      },
      parsedContract,
    );
  });

  await t.step("Cancel Contract", async () => {
    assertEquals(
      {
        gold: 5n,
        iron: 999_900n,
      },
      await ledger.getBalance("store_1"),
    );
    const contractId = await ledger.createContract("store_1", {
      outputs: [
        { unit: "gold", amount: BigInt(1) },
        { unit: "gold", amount: BigInt(1) },
        { unit: "gold", amount: BigInt(1) },
      ],
      inputs: [{ unit: "coin", amount: BigInt(10) }],
    });
    assertEquals(
      {
        gold: 2n,
        iron: 999_900n,
      },
      await ledger.getBalance("store_1"),
    );

    const txId = await db
      .createTransaction("cancel_contract", "store_1", "contract")
      .catch(() => {
        //ignore error
      });
    await ledger.processContract(txId!, "store_1", contractId);
    assertEquals(
      {
        gold: 5n,
        iron: 999_900n,
      },
      await ledger.getBalance("store_1"),
    );
  });

  await t.step("Cleanup", async () => {
    await db.sql.end();
  });
});
