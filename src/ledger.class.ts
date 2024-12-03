import type postgres from "postgresjs";
import { Postgres } from "./db/postgres.class.ts";
import type { UTXO, Asset } from "./types.ts";
import { retryWithBackoff } from "./retry.ts";
import { Queue } from "./queue.class.ts";

export class Ledger {
  private db: Postgres;
  private queue: Queue;

  constructor(db: Postgres) {
    this.db = db;
    this.queue = new Queue();
  }

  public getQueue() {
    return this.queue;
  }

  async addFunds(walletId: string, assets: Asset[]): Promise<UTXO> {
    try {
      const utxo = await this.db.createUTXO(walletId, assets);
      console.log("Funds added with success", utxo.id);
      return utxo;
    } catch (e) {
      console.error("Add funds failed", (e as Error).message);
      throw e;
    }
  }

  async getBalance(walletId: string): Promise<Record<string, bigint>> {
    const utxos = await this.db.findUTXOFor(walletId);
    return utxos.reduce((balance: Record<string, bigint>, utxo) => {
      for (const asset of utxo.assets) {
        balance[asset.unit] = (balance[asset.unit] || BigInt(0)) + asset.amount;
      }
      return balance;
    }, {});
  }

  async getUtxos(walletId: string): Promise<UTXO[]> {
    return await this.db.findUTXOFor(walletId);
  }

  addRequest(sender: string, recipient: string, assetsToSend: Asset[]): string {
    return this.queue.enqueue(sender, async () => {
      const output = await retryWithBackoff(
        async () => {
          try {
            const isValid = assetsToSend.every((asset) => asset.amount > 0);

            if (!isValid) {
              throw new Error("The amount must be higher than 0");
            }

            try {
              await this.db.sql.begin(async (sql: postgres.Sql) => {
                const senderUtxos = await this.db.findUTXOFor(sender, { sql });
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
                  if (isFulfilled) {
                    break;
                  }
                }

                // Check if we have all required assets
                const hasEnough = assetsToSend.every(
                  (asset) => (collectedAssets[asset.unit] || 0) >= asset.amount,
                );
                if (!hasEnough) {
                  throw new Error("Insufficient assets");
                }

                // Spend UTXOs
                for (const utxo of usedUtxos) {
                  await this.db.updateUTXO(utxo.id, true, { sql });
                }

                // Create new UTXO for the recipient
                await this.db.createUTXO(recipient, assetsToSend, { sql });

                // Handle change: return unused assets to the sender
                const remainingAssets: Asset[] = [];
                for (const [unit, amount] of Object.entries(collectedAssets)) {
                  const requiredAmount =
                    assetsToSend.find((asset) => asset.unit === unit)?.amount ||
                    BigInt(0);
                  if (amount > requiredAmount) {
                    remainingAssets.push({
                      unit,
                      amount: amount - requiredAmount,
                    });
                  }
                }
                if (remainingAssets.length > 0) {
                  await this.db.createUTXO(sender, remainingAssets, { sql });
                }

                console.log(`Transaction processed successfully!`);
              });
            } catch (e) {
              console.error("Transaction Failed", (e as Error).message);
              throw e;
            }
          } catch (error) {
            console.error(
              "Error processing transaction:",
              (error as Error).message,
            );
            throw error;
          }
        },
        {
          retries: 10,
          delay: 250, // Start with 250ms
          factor: 2, // Exponential backoff multiplier
          onRetry: (attempt, error) =>
            console.log(`Retry attempt ${attempt}: ${error}`),
        },
      );

      return output;
    });
  }
}
