import postgres from "postgresjs";
import { RawUTXO, UTXO, type Asset } from "../types.ts";
import { parseAssets, serialize } from "../encoder_decoder.ts";
import { generateUtxoId } from "../util.ts";

export class Postgres {
  public sql: postgres.Sql;

  constructor(url: string) {
    this.sql = postgres(url);
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

  async createTransaction(id: string, owner: string) {
    await this
      .sql`INSERT INTO transactions (id, owner) VALUES (${id}, ${owner}) RETURNING id;`;
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

  async findTransaction(id: string) {
    const tx = await this
      .sql`SELECT id, owner, encode(assets, 'hex') as assets, filed, failed, reason, created_at, updated_at FROM transactions WHERE id = ${id};`;
    return tx[0];
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
