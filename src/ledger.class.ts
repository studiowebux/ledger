import type { Database } from "./mocks/database.class.ts";
import type { UTXO, Transaction } from "./types.ts";

export class Ledger {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  addFunds(walletId: string, amount: number): UTXO {
    this.db.beginTransaction();
    try {
      const utxo = this.db.createUTXO(walletId, amount);
      this.db.commit();
      console.log("Funds added with success", utxo.id);
      return utxo;
    } catch (e) {
      console.error("Add funds failed", (e as Error).message);
      this.db.rollback();
      throw e;
    }
  }

  getBalance(walletId: string): number {
    return Array.from(this.db.findUTXOFor(walletId).values()).reduce(
      (sum, utxo) => sum + utxo.amount,
      0,
    );
  }

  getUtxos(walletId: string): UTXO[] {
    return this.db.findUTXOFor(walletId);
  }

  processTransaction(transaction: Transaction): void {
    this.db.beginTransaction();

    try {
      const totalInput = transaction.inputs.reduce((sum, inputId) => {
        const utxo = this.db.findUTXO(inputId);

        if (!utxo) throw new Error(`UTXO ${inputId} not found`);
        if (utxo.spent) throw new Error(`UTXO ${inputId} already spent`);

        this.db.updateUTXO(inputId, true); // Mark UTXO as spent
        console.log(`UTXO ${inputId} spent.`);
        return sum + utxo.amount;
      }, 0);

      const totalOutput = transaction.outputs.reduce((sum, output) => {
        this.db.createUTXO(output.recipient, output.amount);
        return sum + output.amount;
      }, 0);

      if (totalInput !== totalOutput) {
        throw new Error("Input and output amounts do not match");
      }

      this.db.commit();
    } catch (error) {
      this.db.rollback();
      throw error;
    }
  }
}
