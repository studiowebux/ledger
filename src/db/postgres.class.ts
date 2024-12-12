import postgres from "postgresjs";
import type { RawUTXO, UTXO, Asset, Transaction } from "../types.ts";
import { parseAssets, serialize } from "../encoder_decoder.ts";
import { generateUtxoId } from "../util.ts";

export class Postgres {
  public sql: postgres.Sql;

  constructor(url: string) {
    this.sql = postgres(url);
  }

  async createContract(
    id: string,
    inputs: Asset[],
    outputs: Asset[],
    owner: string,
  ) {
    await this
      .sql`INSERT INTO contracts (id, inputs, outputs, owner) VALUES (${id}, decode(${serialize(inputs)}, 'hex'), decode(${serialize(outputs)}, 'hex'), ${owner}) RETURNING id;`;
    console.log(`Contract saved:`, id);
    return id;
  }

  async findContract(id: string, options?: { sql?: postgres.Sql }) {
    const sql = options?.sql || this.sql;
    const contracts =
      await sql`SELECT id, encode(inputs, 'hex') as inputs, encode(outputs, 'hex') as outputs, owner, executed FROM contracts WHERE id =${id}`;
    return {
      ...contracts[0],
      inputs: parseAssets(contracts[0].inputs),
      outputs: parseAssets(contracts[0].outputs),
    };
  }

  async updateContract(
    id: string,
    executed: boolean,
    options?: { sql?: postgres.Sql },
  ) {
    const sql = options?.sql || this.sql;
    const updated =
      await sql`UPDATE contracts SET executed = ${executed}, updated_at = NOW() WHERE id = ${id} RETURNING id;`;
    if (!updated || updated.length === 0) {
      throw new Error(`Contract ${id} not updated`);
    }
  }

  async createPolicy(id: string, immutable: boolean = true) {
    await this
      .sql`INSERT INTO policies (id, immutable) VALUES (${id}, ${immutable}) RETURNING id;`;
    console.log(`Policy saved:`, id);
    return id;
  }

  async findPolicy(id: string) {
    const policies = await this
      .sql`SELECT id, immutable FROM policies WHERE id =${id}`;
    return policies[0];
  }

  async createTransaction(
    id: string,
    owner: string,
    type: "exchange" | "contract",
  ) {
    await this
      .sql`INSERT INTO transactions (id, owner, type) VALUES (${id}, ${owner}, ${type}) RETURNING id;`;
    console.log(`Transaction saved:`, id);
    return id;
  }

  async updateTransaction(
    id: string,
    filed: boolean,
    assets: Asset[] = [],
    reason: string = "",
    failed: boolean = false,
    options?: { sql?: postgres.Sql },
  ) {
    const sql = options?.sql || this.sql;
    const updated =
      await sql`UPDATE transactions SET assets = decode(${serialize(assets)}, 'hex'), filed = ${filed}, failed = ${failed}, reason = ${reason}, updated_at = NOW() WHERE id = ${id} RETURNING id;`;
    if (!updated || updated.length === 0) {
      throw new Error(`Transactions ${id} not updated`);
    }
  }

  async findTransaction(id: string): Promise<Transaction> {
    const tx = await this
      .sql`SELECT id, owner, encode(assets, 'hex') as assets, filed, failed, reason, type, created_at, updated_at FROM transactions WHERE id = ${id};`;
    return tx[0] as Transaction;
  }

  // Find a UTXO by its ID
  async findUTXO(id: string): Promise<UTXO | null> {
    const utxos = await this.sql<
      UTXO[]
    >`SELECT id, owner, encode(assets, 'hex') as assets, spent, created_at, updated_at FROM utxos WHERE id = ${id};`;
    if (!utxos || utxos.length !== 1) {
      return null;
    }
    return utxos[0];
  }

  // Find all UTXOs owned by a specific owner
  async findUTXOFor(
    owner: string,
    options?: { sql?: postgres.Sql },
  ): Promise<UTXO[]> {
    const sql = options?.sql || this.sql;
    const utxos = await sql<
      RawUTXO[]
    >`SELECT id, owner, encode(assets, 'hex') as assets, spent, created_at, updated_at FROM utxos WHERE owner = ${owner} AND spent = false;`;

    if (!utxos || utxos.length === 0) {
      return [];
    }

    return utxos.map((utxo: RawUTXO) => ({
      ...utxo,
      assets: parseAssets(utxo.assets),
    }));
  }

  // Update the spent status of a UTXO
  async updateUTXO(
    id: string,
    spent: boolean,
    options?: { sql?: postgres.Sql },
  ): Promise<void> {
    const sql = options?.sql || this.sql;
    const utxos = await sql<
      UTXO[]
    >`SELECT spent FROM utxos WHERE id = ${id} FOR UPDATE;`;
    if (!utxos || utxos.length !== 1) {
      throw new Error(`UTXO ${id} not found`);
    }
    if (utxos[0].spent && spent) {
      throw new Error(`UTXO ${id} already spent`);
    }

    const updated = await sql<
      UTXO[]
    >`UPDATE utxos SET spent = ${spent}, updated_at = NOW() WHERE id = ${id} AND spent = false RETURNING id, spent`;
    if (!updated || updated.length === 0) {
      throw new Error(`UTXO ${id} already spent`);
    }
  }

  // Create a new UTXO
  async createUTXO(
    owner: string,
    assets: Asset[],
    options?: { sql?: postgres.Sql },
  ): Promise<UTXO> {
    const sql = options?.sql || this.sql;
    const utxo: UTXO = { id: generateUtxoId(), assets, owner, spent: false };

    await sql`INSERT INTO utxos (id, assets, owner, spent) VALUES (${utxo.id}, decode(${serialize(utxo.assets)}, 'hex'), ${utxo.owner}, ${utxo.spent}) RETURNING id, assets, owner, spent;`;
    console.log(`UTXO created:`, utxo.id);
    return utxo;
  }
}
