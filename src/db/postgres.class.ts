import postgres from "postgresjs";
import type Logger from "@studiowebux/deno-minilog";

import type {
  Asset,
  ContractRaw,
  Id,
  Policy,
  PolicyRaw,
  PublicKey,
  Transaction,
  TransactionRaw,
  Utxo,
  UtxoRaw,
} from "../types.ts";
import { parseAssets, stringify } from "../encoder_decoder.ts";

export class Postgres {
  public sql: postgres.Sql;
  private logger: Logger;

  constructor(url: string, logger: Logger) {
    this.sql = postgres(url);
    this.logger = logger.fork("postgres");
  }

  //#region Contract
  async createContract(
    id: string,
    inputs: Asset[],
    outputs: Asset[],
    owner: PublicKey,
    options?: { sql?: postgres.Sql },
  ): Promise<string> {
    this.logger.verbose(`createContract`, id, inputs, outputs, owner);
    const sql = options?.sql || this.sql;
    await sql`INSERT INTO contracts (id, inputs, outputs, owner) VALUES (${id}, ${
      stringify(inputs)
    }, ${stringify(outputs)}, ${owner});`;
    this.logger.debug(`Contract saved:`, id);
    return id;
  }

  async findContract(
    id: string,
    options?: { sql?: postgres.Sql },
  ): Promise<ContractRaw> {
    this.logger.verbose(`findContract`, id);
    const sql = options?.sql || this.sql;
    const [contract] = await sql<
      [ContractRaw?]
    >`SELECT id, inputs, outputs, owner, executed FROM contracts WHERE id =${id}`;
    if (!contract) {
      throw new Error(`Contract ${id} not found`);
    }
    return contract;
  }

  async updateContract(
    id: string,
    executed: boolean,
    options?: { sql?: postgres.Sql },
  ): Promise<string> {
    this.logger.verbose(`updateContract`, id, executed);
    const sql = options?.sql || this.sql;
    const updated = await sql<
      Id[]
    >`UPDATE contracts SET executed = ${executed}, updated_at = NOW() WHERE id = ${id} RETURNING id;`;
    if (!updated || updated.length === 0) {
      throw new Error(`Contract ${id} not updated`);
    }
    if (updated.length > 1) {
      throw new Error(`Multiple contracts have been updated`);
    }
    return id;
  }

  async updateContractState(
    id: string,
    inputs: Asset[],
    outputs: Asset[],
    executed: boolean,
    options?: { sql?: postgres.Sql },
  ): Promise<string> {
    this.logger.verbose(
      `updateContractState`,
      id,
      stringify(inputs),
      stringify(outputs),
    );
    const sql = options?.sql || this.sql;
    const updated = await sql<
      Id[]
    >`UPDATE contracts SET executed = ${executed}, inputs = ${
      stringify(inputs)
    }, outputs = ${
      stringify(outputs)
    }, updated_at = NOW() WHERE id = ${id} RETURNING id;`;
    if (!updated || updated.length === 0) {
      throw new Error(`Contract ${id} not updated`);
    }
    if (updated.length > 1) {
      throw new Error(`Multiple contracts have been updated`);
    }
    return id;
  }

  //#endregion

  //#region Policy
  async createPolicy(
    policy_id: string,
    owner: PublicKey[],
    immutable: boolean = true,
  ): Promise<string> {
    this.logger.verbose(`createPolicy`, policy_id, immutable, owner);

    if (owner.length === 0) {
      this.logger.warn(
        `createPolicy: The policy has no designated owner(s), so anyone can mint new assets.`,
      );
    }

    await this
      .sql`INSERT INTO policies (policy_id, immutable, owner) VALUES (${policy_id}, ${immutable}, ${owner});`;
    this.logger.debug(`Policy saved:`, policy_id);
    return policy_id;
  }

  async findPolicy(policy_id: string): Promise<Policy> {
    this.logger.verbose(`findPolicy`, policy_id);

    const [policy] = await this.sql<
      [Policy?]
    >`SELECT policy_id, immutable, owner FROM policies WHERE policy_id =${policy_id}`;
    if (!policy) {
      throw new Error(`Policy ${policy_id} not found`);
    }
    return policy;
  }
  //#endregion

  //#region Transaction
  async createTransaction(
    id: string,
    owner: PublicKey,
    type: "exchange" | "contract",
    signature: string,
  ): Promise<string> {
    this.logger.verbose(`createTransaction`, id, owner, type);
    await this
      .sql`INSERT INTO transactions (id, owner, type, signature) VALUES (${id}, ${owner}, ${type}, ${signature});`;
    this.logger.debug(`Transaction saved:`, id);
    return id;
  }

  async updateTransaction(
    id: string,
    executed: boolean,
    assets: Asset[] = [],
    reason: string = "",
    failed: boolean = false,
    options?: { sql?: postgres.Sql },
  ): Promise<string> {
    this.logger.verbose(
      `updateTransaction`,
      id,
      executed,
      assets,
      reason,
      failed,
    );
    const sql = options?.sql || this.sql;
    const updated = await sql<
      Id[]
    >`UPDATE transactions SET assets = ${
      stringify(assets)
    }, executed = ${executed}, failed = ${failed}, reason = ${reason}, updated_at = NOW() WHERE id = ${id} RETURNING id;`;
    if (!updated || updated.length === 0) {
      throw new Error(`Transactions ${id} not updated`);
    }
    if (updated.length > 1) {
      throw new Error(`Multiple transactions have been updated`);
    }
    return id;
  }

  async findTransaction(id: string): Promise<Transaction> {
    this.logger.verbose(`findTransaction`, id);
    const [tx] = await this.sql<
      [TransactionRaw?]
    >`SELECT id, owner, assets, executed, failed, reason, type, signature, created_at, updated_at FROM transactions WHERE id = ${id};`;
    if (!tx) {
      throw new Error(`Transaction ${id} not found`);
    }

    const transaction: Transaction = {
      ...tx,
      assets: tx.assets ? parseAssets(tx.assets) : [],
      reason: tx.reason ? tx.reason : "",
    };
    return transaction;
  }
  //#endregion

  //#region Utxo
  // Find a UTXO by its ID
  async findUTXO(id: string): Promise<Utxo> {
    this.logger.verbose(`findUTXO`, id);
    const [utxo] = await this.sql<
      [UtxoRaw?]
    >`SELECT id, owner, assets, spent, created_at, updated_at FROM utxos WHERE id = ${id};`;
    if (!utxo) {
      throw new Error(`UTXO ${id} not found`);
    }
    return {
      ...utxo,
      assets: parseAssets(utxo.assets),
    };
  }

  // Find all UTXOs owned by a specific owner
  async findUTXOFor(
    owner: PublicKey,
    options?: { sql?: postgres.Sql },
  ): Promise<Utxo[]> {
    this.logger.verbose(`findUTXOFor`, owner);
    const sql = options?.sql || this.sql;
    const utxos = await sql<
      UtxoRaw[]
    >`SELECT id, owner, assets, spent, created_at, updated_at FROM utxos WHERE owner = ${owner} AND spent = false;`;

    if (!utxos || utxos.length === 0) {
      return [];
    }

    return utxos.map((utxo) => ({
      ...utxo,
      assets: parseAssets(utxo.assets),
    }));
  }

  // Update the spent status of a UTXO
  async updateUTXO(
    id: string,
    spent: boolean,
    options?: { sql?: postgres.Sql },
  ): Promise<string> {
    this.logger.verbose(`updateUTXO`, id, spent);
    const sql = options?.sql || this.sql;
    const [utxo] = await sql<
      [UtxoRaw?]
    >`SELECT spent FROM utxos WHERE id = ${id} FOR UPDATE;`;
    if (!utxo) {
      throw new Error(`UTXO ${id} not found`);
    }
    if (utxo.spent && spent) {
      throw new Error(`UTXO ${id} already spent`);
    }
    const updated = await sql<
      Pick<UtxoRaw, "id" | "spent">[]
    >`UPDATE utxos SET spent = ${spent}, updated_at = NOW() WHERE id = ${id} AND spent = false RETURNING id, spent`;
    if (!updated || updated.length === 0) {
      throw new Error(`UTXO ${id} already spent`);
    }
    return id;
  }

  // Create a new UTXO
  async createUTXO(
    owner: PublicKey,
    utxo: Utxo,
    options?: { sql?: postgres.Sql },
  ): Promise<string> {
    this.logger.verbose(`createUTXO`, owner, utxo);
    const sql = options?.sql || this.sql;
    await sql`INSERT INTO utxos (id, assets, owner, spent) VALUES (${utxo.id}, ${
      stringify(utxo.assets)
    }, ${utxo.owner}, ${utxo.spent});`;
    this.logger.debug(`UTXO created:`, utxo.id);
    return utxo.id;
  }
  //#endregion
}
