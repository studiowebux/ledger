import type postgres from "postgresjs";
import { Postgres } from "./db/postgres.class.ts";
import type { UTXO, Asset } from "./types.ts";

type RetryOptions = {
  retries: number; // Maximum number of retry attempts
  delay: number; // Initial delay in milliseconds
  factor?: number; // Multiplier for the delay after each attempt
  onRetry?: (attempt: number, error: unknown) => void; // Callback for retry events
};

async function retryWithBackoff<T>(
  task: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { retries, delay, factor = 2, onRetry } = options;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Try executing the task
      return await task();
    } catch (error) {
      attempt++;

      // If we've exceeded retries, throw the error
      if (attempt > retries) {
        throw error;
      }

      // Optional callback on retry
      onRetry?.(attempt, error);

      // Calculate the next delay (exponential backoff)
      const backoffDelay = delay * Math.pow(factor, attempt - 1);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  // This line is unreachable but included for type safety
  throw new Error("Unexpected execution flow in retry logic.");
}

export class Ledger {
  private db: Postgres;

  constructor(db: Postgres) {
    this.db = db;
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

  async processTransaction(
    sender: string,
    recipient: string,
    assetsToSend: Asset[],
  ): Promise<boolean> {
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

            return true;
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
  }
}
