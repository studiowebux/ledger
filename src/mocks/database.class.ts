import type { Asset, UTXO } from "../types.ts";

export class Database {
  private utxos: UTXO[] = [];
  private transactionInProgress = false;
  private transactionBackup: {
    created: UTXO[];
    updated: UTXO[];
  } = { created: [], updated: [] };

  // Start a transaction
  beginTransaction(): void {
    if (this.transactionInProgress)
      throw new Error("Transaction already in progress");
    console.log("Transaction started.");
    this.transactionInProgress = true;

    // Initialize backups for the transaction
    this.transactionBackup = { created: [], updated: [] };
  }

  // Commit the transaction, applying changes to the database
  commit(): void {
    if (!this.transactionInProgress)
      throw new Error("No transaction in progress");
    console.log("Transaction committed.");
    this.transactionInProgress = false;
    // Clear backups after successful commit
    this.transactionBackup = { created: [], updated: [] };
  }

  // Rollback the transaction, restoring the original state
  rollback(): void {
    if (!this.transactionInProgress)
      throw new Error("No transaction in progress");
    console.log("Transaction rolled back.");

    // Rollback all created UTXOs (remove them)
    this.transactionBackup.created.forEach((utxo) => {
      const index = this.utxos.findIndex((u) => u.id === utxo.id);
      if (index !== -1) this.utxos.splice(index, 1);
    });

    // Rollback updated UTXOs (restore spent state)
    this.transactionBackup.updated.forEach((utxo) => {
      const existing = this.utxos.find((u) => u.id === utxo.id);
      if (existing) existing.spent = utxo.spent;
    });

    // Clear backups after rollback
    this.transactionInProgress = false;
    this.transactionBackup = { created: [], updated: [] };
  }

  // Find a UTXO by its ID
  findUTXO(id: string): UTXO | undefined {
    return this.utxos.find((utxo) => utxo.id === id);
  }

  // Find all UTXOs owned by a specific owner
  findUTXOFor(owner: string): UTXO[] {
    return this.utxos.filter(
      (utxo) => utxo.owner === owner && utxo.spent === false,
    );
  }

  // Update the spent status of a UTXO
  updateUTXO(id: string, spent: boolean): void {
    const utxo = this.findUTXO(id);
    if (!utxo) throw new Error(`UTXO ${id} not found`);
    if (utxo.spent && spent) throw new Error(`UTXO ${id} already spent`);

    // Track the UTXO update for rollback
    const backup = { ...utxo }; // Backup original spent status
    utxo.spent = spent;

    // Add to the transaction backup
    this.transactionBackup.updated.push(backup);
  }

  // Create a new UTXO
  createUTXO(owner: string, assets: Asset[]): UTXO {
    const utxo: UTXO = { id: this.generateId(), assets, owner, spent: false };
    this.utxos.push(utxo);
    console.log(`UTXO created:`, utxo.id);
    this.transactionBackup.created.push(utxo);
    return utxo;
  }

  // Generate a unique ID for a UTXO
  private generateId(): string {
    return crypto.randomUUID();
  }
}
