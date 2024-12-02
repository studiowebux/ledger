import type { Database } from "./mocks/database.class.ts";
import type { UTXO, Asset } from "./types.ts";

export class Ledger {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  addFunds(walletId: string, assets: Asset[]): UTXO {
    this.db.beginTransaction();
    try {
      const utxo = this.db.createUTXO(walletId, assets);
      this.db.commit();
      console.log("Funds added with success", utxo.id);
      return utxo;
    } catch (e) {
      console.error("Add funds failed", (e as Error).message);
      this.db.rollback();
      throw e;
    }
  }

  getBalance(walletId: string): Record<string, bigint> {
    return this.db
      .findUTXOFor(walletId)
      .reduce((balance: Record<string, bigint>, utxo) => {
        for (const asset of utxo.assets) {
          balance[asset.unit] =
            (balance[asset.unit] || BigInt(0)) + asset.amount;
        }
        return balance;
      }, {});
  }

  getUtxos(walletId: string): UTXO[] {
    return this.db.findUTXOFor(walletId);
  }

  processTransaction(sender: string, recipient: string, assetsToSend: Asset[]) {
    try {
      this.db.beginTransaction();

      const isValid = assetsToSend.every((asset) => asset.amount > 0);

      if (!isValid) {
        throw new Error("The amount must be higher than 0");
      }

      const senderUtxos = this.db.findUTXOFor(sender);
      const collectedAssets: { [id: string]: bigint } = {};
      const usedUtxos: UTXO[] = [];

      // Collect UTXOs until we have enough assets
      for (const utxo of senderUtxos) {
        for (const asset of utxo.assets) {
          collectedAssets[asset.unit] =
            (collectedAssets[asset.unit] || BigInt(0)) + asset.amount;
        }
        usedUtxos.push(utxo);
        const isFulfilled = assetsToSend.every(
          (asset) => collectedAssets[asset.unit] >= asset.amount,
        );
        if (isFulfilled) break;
      }

      // Check if we have all required assets
      const hasEnough = assetsToSend.every(
        (asset) => (collectedAssets[asset.unit] || 0) >= asset.amount,
      );
      if (!hasEnough) throw new Error("Insufficient assets");

      // Spend UTXOs
      usedUtxos.forEach((utxo) => this.db.updateUTXO(utxo.id, true));

      // Create new UTXO for the recipient
      this.db.createUTXO(recipient, assetsToSend);

      // Handle change: return unused assets to the sender
      const remainingAssets: Asset[] = [];
      for (const [unit, amount] of Object.entries(collectedAssets)) {
        const requiredAmount =
          assetsToSend.find((asset) => asset.unit === unit)?.amount ||
          BigInt(0);
        if (amount > requiredAmount) {
          remainingAssets.push({ unit, amount: amount - requiredAmount });
        }
      }
      if (remainingAssets.length > 0)
        this.db.createUTXO(sender, remainingAssets);

      this.db.commit();
      console.log("Transaction processed successfully!");
    } catch (error) {
      console.error("Error processing transaction:", (error as Error).message);
      this.db.rollback();
      throw error;
    }
  }
}
