import postgres from "postgresjs";
import { Buffer } from "node:buffer";
import { decode, encode } from "cbor";
import { RawUTXO, UTXO, type Asset } from "../types.ts";

const debug = undefined; //console.log

export class Postgres {
  public sql: postgres.Sql;

  constructor(url: string) {
    this.sql = postgres(url, { debug });
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
      assets: this.parseAssets(utxo.assets),
    }));
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
  ) {
    const updated = await this
      .sql`UPDATE transactions SET assets = decode(${this.serialize(assets)}, 'hex'), filed = ${filed}, failed = ${failed}, reason = ${reason}, updated_at = NOW() WHERE id = ${id} RETURNING id;`;
    if (!updated || updated.length === 0) {
      throw new Error(`Transactions ${id} not updated`);
    }
  }

  async findTransaction(id: string) {
    const tx = await this
      .sql`SELECT id, owner, encode(assets, 'hex') as assets, filed, failed, reason, created_at, updated_at FROM transactions WHERE id = ${id};`;
    return tx[0];
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
    const utxo: UTXO = { id: this.generateId(), assets, owner, spent: false };

    await sql`INSERT INTO utxos (id, assets, owner, spent) VALUES (${utxo.id}, decode(${this.serialize(utxo.assets)}, 'hex'), ${utxo.owner}, ${utxo.spent}) RETURNING id, assets, owner, spent;`;
    console.log(`UTXO created:`, utxo.id);
    return utxo;
  }

  // Generate a unique ID for a UTXO
  private generateId(): string {
    return crypto.randomUUID();
  }

  private serialize(input: object): string {
    const cbor = encode(
      JSON.stringify(input, (_, value) =>
        typeof value === "bigint" ? Number(value) : value,
      ),
    ).toString("hex");

    return cbor;
  }

  private deserialize<T>(input: string): T {
    const cbor = decode(Buffer.from(input, "hex"));
    return cbor;
  }

  private parseAssets(assets: string): Asset[] {
    return JSON.parse(this.deserialize<string>(assets)).map((asset: Asset) => ({
      ...asset,
      amount: BigInt(asset.amount),
    }));
  }
}
